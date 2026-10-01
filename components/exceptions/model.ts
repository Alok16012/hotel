import { isDemoToday } from "@/lib/clock";
import { formatINR } from "@/lib/format";
import type { ExceptionCommentRow, ExceptionRow } from "@/lib/exceptions";
import type {
  ExceptionKind,
  ExceptionSeverity,
  ExceptionStatus,
  ISODateTime,
  Paise,
  TeamRole,
} from "@/types";

/**
 * Queue state and session edits, kept out of the component (§20).
 *
 * The default order is the one thing on this screen worth arguing about. Sorting
 * purely by money puts a Rs 6,500 refund above an owner-flagged VIP who is
 * waiting on a reply right now, and sorting purely by severity buries a large
 * giveaway under three small urgent ones. So the default does both, in that
 * order: severity decides the band, money decides the position inside it, and
 * the oldest item wins a tie. The two single-axis orders are still available,
 * because "show me the biggest number" is a real question on a Friday.
 */

export const SEVERITY_RANK: Record<ExceptionSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export type ScopeId = "queue" | "mine" | "resolved" | "all";

export const SCOPES: readonly { id: ScopeId; label: string }[] = [
  { id: "queue", label: "Awaiting a decision" },
  { id: "mine", label: "Assigned to me" },
  { id: "resolved", label: "Decided" },
  { id: "all", label: "Everything" },
];

export type SortId = "priority" | "impact" | "waiting";

export const SORTS: readonly { id: SortId; label: string }[] = [
  { id: "priority", label: "Severity, then money" },
  { id: "impact", label: "Money at stake" },
  { id: "waiting", label: "Longest waiting" },
];

export const KINDS: readonly ExceptionKind[] = [
  "pricing",
  "vip",
  "complaint",
  "refund",
  "policy",
  "operational",
];

export const SEVERITIES: readonly ExceptionSeverity[] = ["critical", "high", "medium", "low"];

export interface ExceptionFilterState {
  scope: ScopeId;
  kinds: ExceptionKind[];
  severities: ExceptionSeverity[];
  sort: SortId;
}

export const EMPTY_EXCEPTION_FILTERS: ExceptionFilterState = {
  scope: "queue",
  kinds: [],
  severities: [],
  sort: "priority",
};

export function activeFilterCount(state: ExceptionFilterState): number {
  return state.kinds.length + state.severities.length;
}

function inScope(row: ExceptionRow, scope: ScopeId, currentUserId: string): boolean {
  switch (scope) {
    case "queue":
      return row.isOpen;
    case "mine":
      return row.isOpen && row.assigneeId === currentUserId;
    case "resolved":
      return !row.isOpen;
    default:
      return true;
  }
}

export function filterExceptions(
  rows: ExceptionRow[],
  state: ExceptionFilterState,
  currentUserId: string,
): ExceptionRow[] {
  return rows.filter(
    (row) =>
      inScope(row, state.scope, currentUserId) &&
      (state.kinds.length === 0 || state.kinds.includes(row.kind)) &&
      (state.severities.length === 0 || state.severities.includes(row.severity)),
  );
}

export function sortExceptions(rows: ExceptionRow[], sort: SortId): ExceptionRow[] {
  const sorted = [...rows];
  switch (sort) {
    case "impact":
      return sorted.sort((a, b) => stake(b) - stake(a));
    case "waiting":
      return sorted.sort((a, b) => b.elapsedSec - a.elapsedSec);
    default:
      return sorted.sort(
        (a, b) =>
          SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
          stake(b) - stake(a) ||
          a.raisedAt.localeCompare(b.raisedAt),
      );
  }
}

/** Only the giveaway counts as stake. A zero-rupee policy call still queues. */
function stake(row: ExceptionRow): number {
  return Math.abs(row.businessImpact);
}

export function scopeCounts(
  rows: ExceptionRow[],
  currentUserId: string,
): Record<ScopeId, number> {
  return {
    queue: rows.filter((row) => inScope(row, "queue", currentUserId)).length,
    mine: rows.filter((row) => inScope(row, "mine", currentUserId)).length,
    resolved: rows.filter((row) => inScope(row, "resolved", currentUserId)).length,
    all: rows.length,
  };
}

export interface QueueSummary {
  open: number;
  critical: number;
  /** Revenue the open queue would give away if every request were approved. */
  moneyAtStake: Paise;
  /** How long the oldest undecided item has been sitting. */
  longestWaitSec: number;
  decidedToday: number;
  /** Median time-to-decision across everything already resolved. */
  medianDecisionSec: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

/**
 * What the queue adds up to, after this session's decisions.
 *
 * Money at stake counts only the giveaways, not the signed total. An exception
 * with no rupee value attached, like a pet request, is still a decision someone
 * has to make, but adding a zero to a sum of giveaways would quietly imply the
 * property is out of pocket by an amount it is not.
 *
 * It is computed here rather than in the repository because it is the one
 * headline in the product that has to fall the instant somebody approves
 * something on screen.
 */
export function summariseQueue(rows: ExceptionRow[]): QueueSummary {
  const open = rows.filter((row) => row.isOpen);
  const resolved = rows.filter((row) => !row.isOpen && row.resolvedAt);

  return {
    open: open.length,
    critical: open.filter((row) => row.severity === "critical").length,
    moneyAtStake: open.reduce((sum, row) => sum + Math.max(0, -row.businessImpact), 0),
    longestWaitSec: open.reduce((longest, row) => Math.max(longest, row.elapsedSec), 0),
    decidedToday: resolved.filter((row) => isDemoToday(row.resolvedAt as string)).length,
    medianDecisionSec: median(resolved.map((row) => row.elapsedSec)),
  };
}

// ---------------------------------------------------------------------------
// Session edits
// ---------------------------------------------------------------------------

/**
 * A decision made during this session.
 *
 * Nothing here is written anywhere, and the screen says so at the bottom rather
 * than letting a convincing toast imply an approval that reached a ledger. The
 * shape is deliberately the shape a real mutation would take, so the seam is a
 * network call and not a redesign.
 */
export interface ExceptionPatch {
  status?: ExceptionStatus;
  resolvedAt?: ISODateTime;
  resolvedById?: string;
  resolvedByName?: string;
  decisionNote?: string;
  modifiedValue?: Paise;
  assigneeId?: string;
  assigneeName?: string;
  assigneeInitials?: string;
  assigneeRole?: TeamRole;
  addedComments?: ExceptionCommentRow[];
}

export type PatchMap = Record<string, ExceptionPatch>;

const CLOSED: ExceptionStatus[] = ["approved", "rejected", "modified"];

export function applyPatch(row: ExceptionRow, patch: ExceptionPatch | undefined): ExceptionRow {
  if (!patch) return row;

  const status = patch.status ?? row.status;
  const merged: ExceptionRow = {
    ...row,
    status,
    isOpen: !CLOSED.includes(status),
    resolvedAt: patch.resolvedAt ?? row.resolvedAt,
    resolvedById: patch.resolvedById ?? row.resolvedById,
    resolvedByName: patch.resolvedByName ?? row.resolvedByName,
    decisionNote: patch.decisionNote ?? row.decisionNote,
    modifiedValue: patch.modifiedValue ?? row.modifiedValue,
    assigneeId: patch.assigneeId ?? row.assigneeId,
    assigneeName: patch.assigneeName ?? row.assigneeName,
    assigneeInitials: patch.assigneeInitials ?? row.assigneeInitials,
    assigneeRole: patch.assigneeRole ?? row.assigneeRole,
    comments: patch.addedComments ? [...row.comments, ...patch.addedComments] : row.comments,
  };

  return merged;
}

export function applyPatches(rows: ExceptionRow[], patches: PatchMap): ExceptionRow[] {
  return rows.map((row) => applyPatch(row, patches[row.id]));
}

export type Decision = "approve" | "modify" | "reject";

export const DECISION_STATUS: Record<Decision, ExceptionStatus> = {
  approve: "approved",
  modify: "modified",
  reject: "rejected",
};

/** Past tense, for the confirmation. Kept beside the status so they cannot drift. */
export const DECISION_VERB: Record<Decision, string> = {
  approve: "Approved",
  modify: "Modified",
  reject: "Rejected",
};

/**
 * What the figure on a modified decision actually is.
 *
 * "Modified value" is meaningless on its own: on a pricing exception it is a
 * nightly rate, on a refund it is a sum of money leaving the property, and on a
 * pet request it may be a deposit or nothing at all. Asking the right question
 * is the difference between a captured number and a number somebody has to
 * decode six weeks later.
 */
export function modifyPrompt(kind: ExceptionKind): { label: string; help: string } {
  switch (kind) {
    case "pricing":
    case "vip":
      return {
        label: "Rate you are authorising",
        help: "Per room, per night. Leave it blank if the change is not about money.",
      };
    case "refund":
      return {
        label: "Amount you are authorising to refund",
        help: "The sum leaving the property, not the amount retained.",
      };
    case "complaint":
      return {
        label: "Goodwill amount you are authorising",
        help: "What the guest is actually being given, as a rupee figure.",
      };
    default:
      return {
        label: "Amount attached to this decision",
        help: "Leave it blank where the decision carries no rupee figure.",
      };
  }
}

/**
 * How the captured figure reads back, in the unit it was captured in.
 *
 * A pricing exception is authorised per room per night while the reference
 * figures beside it are whole-stay totals, so the resolution record has to
 * carry the unit or the two silently contradict each other.
 */
export function modifiedValueLine(kind: ExceptionKind, value: Paise): string {
  switch (kind) {
    case "pricing":
    case "vip":
      return `Authorised at ${formatINR(value)} per room, per night.`;
    case "refund":
      return `Authorised a refund of ${formatINR(value)}.`;
    case "complaint":
      return `Authorised ${formatINR(value)} in goodwill.`;
    default:
      return `Authorised at ${formatINR(value)}.`;
  }
}

/**
 * Rupees typed into the modify field, back into paise.
 *
 * Accepts what a person would actually type at a desk: "4300", "4,300",
 * "Rs 4,300", "₹4300.50". Returns undefined for anything that is not a number,
 * so the caller can refuse the decision rather than silently authorising zero.
 */
export function parseRupees(input: string): Paise | undefined {
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (!cleaned) return undefined;
  const rupees = Number(cleaned);
  if (!Number.isFinite(rupees) || rupees < 0) return undefined;
  return Math.round(rupees * 100);
}
