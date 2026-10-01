import { differenceInHours } from "date-fns";
import { DEMO_NOW } from "@/lib/clock";
import type { LeadRow } from "@/lib/leads";
import type { LeadSource, LeadStage, Paise } from "@/types";

/**
 * The saved views, the sorts, and the one place the inbox decides what a lead
 * is (§11).
 *
 * These are predicates over the row model rather than stored flags, so a lead
 * that gets answered inside the workspace leaves "Needs reply" immediately and
 * without a round trip. A stored flag would need the backend that does not
 * exist yet, and would drift from the transcript the moment it did.
 */

/** Rs 50,000. Above this an enquiry is worth a person's attention on its own. */
export const HIGH_VALUE_PAISE: Paise = 5_000_000;

/** Two working days of silence is the point an open enquiry is going cold. */
const COLD_HOURS = 48;

export const WORKING_STAGES: LeadStage[] = [
  "new",
  "contacted",
  "qualified",
  "quote_sent",
  "negotiating",
  "payment_pending",
];

export type ViewId = "working" | "needs_reply" | "unassigned" | "high_value" | "cold" | "closed";

export interface LeadView {
  id: ViewId;
  label: string;
  /** Shown under the list when the view is empty, and as the tab's title. */
  description: string;
  match: (row: LeadRow) => boolean;
}

const isOpen = (row: LeadRow) => row.stage !== "booked" && row.stage !== "lost";

export const LEAD_VIEWS: LeadView[] = [
  {
    id: "working",
    label: "Working book",
    description: "Every enquiry that is neither booked nor lost.",
    match: isOpen,
  },
  {
    id: "needs_reply",
    label: "Needs reply",
    description: "A guest has written and nobody has answered yet.",
    match: (row) => isOpen(row) && row.waitingSec > 0,
  },
  {
    id: "unassigned",
    label: "Unassigned",
    description: "Open enquiries with no name against them.",
    match: (row) => isOpen(row) && !row.ownerId,
  },
  {
    id: "high_value",
    label: "High value",
    description: "Open enquiries worth over Rs 50,000.",
    match: (row) => isOpen(row) && row.value >= HIGH_VALUE_PAISE,
  },
  {
    id: "cold",
    label: "Going cold",
    description: "Quoted or negotiating, and silent for two days.",
    match: (row) =>
      isOpen(row) &&
      row.stage !== "new" &&
      differenceInHours(DEMO_NOW, new Date(row.lastActivityAt)) >= COLD_HOURS,
  },
  {
    id: "closed",
    label: "Closed",
    description: "Booked and lost enquiries, kept for the record.",
    match: (row) => !isOpen(row),
  },
];

export type SortId = "urgency" | "value" | "newest" | "due";

export const LEAD_SORTS: { id: SortId; label: string }[] = [
  { id: "urgency", label: "Most urgent" },
  { id: "value", label: "Highest value" },
  { id: "newest", label: "Newest first" },
  { id: "due", label: "Next action due" },
];

const PRIORITY_WEIGHT = { urgent: 3, high: 2, normal: 1, low: 0 } as const;

/**
 * Urgency is a composite, in the order a duty manager would actually work:
 * a guest nobody has attended to outranks everything, then how long anyone has
 * been waiting, then the priority on the file, then the money.
 */
function urgencyScore(row: LeadRow): number {
  return (
    (row.isBreaching ? 1_000_000_000 : 0) +
    row.unattendedSec * 100 +
    row.waitingSec * 10 +
    PRIORITY_WEIGHT[row.priority] * 1000
  );
}

export interface FilterState {
  view: ViewId;
  query: string;
  sources: LeadSource[];
  stages: LeadStage[];
  sort: SortId;
}

function matchesQuery(row: LeadRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    row.guestName,
    row.reference,
    row.company ?? "",
    row.lastMessagePreview,
    row.nextAction,
    row.roomTypeName ?? "",
    ...row.tags,
  ]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export function filterLeads(rows: LeadRow[], state: FilterState): LeadRow[] {
  const view = LEAD_VIEWS.find((v) => v.id === state.view) ?? LEAD_VIEWS[0];

  const filtered = rows.filter(
    (row) =>
      view.match(row) &&
      matchesQuery(row, state.query) &&
      (state.sources.length === 0 || state.sources.includes(row.source)) &&
      (state.stages.length === 0 || state.stages.includes(row.stage)),
  );

  const sorted = [...filtered];
  switch (state.sort) {
    case "value":
      sorted.sort((a, b) => b.value - a.value);
      break;
    case "newest":
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
    case "due":
      // Leads with no due date sink rather than sorting as "overdue since 1970".
      sorted.sort((a, b) =>
        (a.nextActionDueAt ?? "9999").localeCompare(b.nextActionDueAt ?? "9999"),
      );
      break;
    case "urgency":
    default:
      sorted.sort(
        (a, b) => urgencyScore(b) - urgencyScore(a) || b.lastActivityAt.localeCompare(a.lastActivityAt),
      );
  }
  return sorted;
}
