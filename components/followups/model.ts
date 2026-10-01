import { DEMO_NOW, DEMO_TODAY, demoDate, demoDayOf } from "@/lib/clock";
import type { FollowUpRow } from "@/lib/followups";
import { formatDayMonth, formatDuration, formatTime } from "@/lib/format";
import type { FollowUpReason } from "@/types";

/**
 * Everything the follow-up queue knows how to compute (§14).
 *
 * Pure functions over the row model, beside the screen that uses them, the
 * same arrangement as `components/leads/filters.ts` and the deal board. The
 * queue holds no data of its own.
 */

// ---------------------------------------------------------------------------
// Queue edits
// ---------------------------------------------------------------------------

/**
 * A change made in this session: done, reopened, snoozed or reassigned.
 *
 * The owner name travels with the id because the row model is already
 * flattened for rendering, and looking a team member up again inside the
 * client would mean shipping the directory twice.
 */
export type QueuePatch = Partial<
  Pick<
    FollowUpRow,
    "status" | "dueAt" | "ownerId" | "ownerName" | "ownerInitials" | "completedAt"
  >
>;

export function applyPatches(
  rows: FollowUpRow[],
  patches: Record<string, QueuePatch>,
): FollowUpRow[] {
  if (Object.keys(patches).length === 0) return rows;
  return rows.map((row) => (patches[row.id] ? { ...row, ...patches[row.id] } : row));
}

// ---------------------------------------------------------------------------
// Buckets
// ---------------------------------------------------------------------------

export type BucketId = "overdue" | "today" | "upcoming" | "done";

/**
 * Which pile a touchpoint belongs to.
 *
 * Derived from the due time rather than read from the stored status, so
 * snoozing something moves it out of Overdue in the same frame. A queue whose
 * headings disagree with its rows is worse than no headings.
 */
export function bucketOf(row: FollowUpRow): BucketId {
  if (row.status === "done") return "done";
  if (row.dueAt <= DEMO_NOW.toISOString()) return "overdue";
  return demoDayOf(row.dueAt) === DEMO_TODAY ? "today" : "upcoming";
}

export const BUCKETS: {
  id: BucketId;
  label: string;
  /** Said when the pile is empty. An empty queue is usually good news. */
  empty: string;
}[] = [
  { id: "overdue", label: "Overdue", empty: "Nothing is past its due time" },
  { id: "today", label: "Due later today", empty: "Nothing else falls due today" },
  { id: "upcoming", label: "Upcoming", empty: "Nothing scheduled beyond today" },
  { id: "done", label: "Closed", empty: "Nothing has been closed off yet" },
];

export function bucketCounts(rows: FollowUpRow[]): Record<BucketId, number> {
  const counts: Record<BucketId, number> = { overdue: 0, today: 0, upcoming: 0, done: 0 };
  for (const row of rows) counts[bucketOf(row)] += 1;
  return counts;
}

/**
 * Oldest due first inside the working piles, most recently closed first in
 * Done. Money breaks ties: two things due at the same minute should be picked
 * up in the order that costs least to get wrong.
 */
export function sortBucket(rows: FollowUpRow[], bucket: BucketId): FollowUpRow[] {
  const sorted = [...rows];
  if (bucket === "done") {
    sorted.sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
    return sorted;
  }
  sorted.sort((a, b) => a.dueAt.localeCompare(b.dueAt) || b.value - a.value);
  return sorted;
}

// ---------------------------------------------------------------------------
// Reading a row
// ---------------------------------------------------------------------------

export interface DueLabel {
  text: string;
  overdue: boolean;
}

/**
 * How late, or how soon.
 *
 * Overdue is stated as a span rather than a clock time, because "7h overdue"
 * is the thing that decides what to pick up and "4:20 am" makes a person do
 * the subtraction themselves. Anything beyond today gets a date instead, since
 * "in 31h" is not a time anybody can plan around.
 */
export function dueLabel(dueAt: string, now: Date): DueLabel {
  const minutes = Math.round((new Date(dueAt).getTime() - now.getTime()) / 60_000);
  if (minutes <= 0) {
    if (minutes > -5) return { text: "due now", overdue: true };
    return { text: `${formatDuration(Math.abs(minutes) * 60)} overdue`, overdue: true };
  }
  if (demoDayOf(dueAt) === DEMO_TODAY) {
    return { text: `in ${formatDuration(minutes * 60)}`, overdue: false };
  }
  return { text: `${formatDayMonth(dueAt)}, ${formatTime(dueAt)}`, overdue: false };
}

/**
 * What has already been tried on this enquiry.
 *
 * Phrased as attempts rather than as a step number, because "3 of 3" reads as
 * progress through a plan when the useful reading is "twice already, and it did
 * not work".
 */
export function sequenceSummary(row: FollowUpRow): string {
  const position =
    row.sequenceTotal > 1
      ? `Attempt ${row.sequenceIndex} of ${row.sequenceTotal}`
      : "First attempt";

  if (row.attemptsSent === 0) return `${position} · nothing sent yet`;

  const sent = `${row.attemptsSent} already sent`;
  if (row.attemptsAutomated === 0) return `${position} · ${sent} by the team`;
  if (row.attemptsAutomated === row.attemptsSent) {
    const who =
      row.attemptsSent === 1
        ? "by automation"
        : row.attemptsSent === 2
          ? "both by automation"
          : "all by automation";
    return `${position} · ${sent}, ${who}`;
  }
  return `${position} · ${sent}, ${row.attemptsAutomated} by automation`;
}

/**
 * The management-by-exception trigger (§42).
 *
 * Automated chases that produced nothing, and another automated chase queued
 * behind them, is the software repeating itself. The queue says so rather than
 * letting the sequence run out quietly, because the decision to pick up the
 * phone is the one a person is here to make.
 *
 * How many chases are allowed before that point is not a constant here. It
 * comes from the automation rule on the settings screen, so an owner who
 * reserves quiet quotes for a person sees this queue hand them over on the
 * first attempt rather than on the third. The number arrives as an argument
 * rather than being read from the store, so this stays a pure function the
 * sections can be built with.
 */
export function needsHandover(row: FollowUpRow, chaseLimit: number): boolean {
  return (
    row.status !== "done" &&
    row.isAutomated &&
    row.attemptsSent >= chaseLimit &&
    row.attemptsAutomated === row.attemptsSent &&
    row.attemptsSent > 0
  );
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

/** Who set the touchpoint. The product's central claim is visible here (§42). */
export type OriginId = "any" | "automated" | "manual";

export const ORIGINS: { id: OriginId; label: string }[] = [
  { id: "any", label: "Anyone" },
  { id: "automated", label: "Scheduled by automation" },
  { id: "manual", label: "Set by a colleague" },
];

/** `open` spans the three working piles; the others narrow to one. */
export type ScopeId = "open" | BucketId;

export interface QueueFilterState {
  scope: ScopeId;
  owners: string[];
  reasons: FollowUpReason[];
  origin: OriginId;
}

export const EMPTY_QUEUE_FILTERS: QueueFilterState = {
  scope: "open",
  owners: [],
  reasons: [],
  origin: "any",
};

export function activeFilterCount(state: QueueFilterState): number {
  return state.owners.length + state.reasons.length + (state.origin === "any" ? 0 : 1);
}

/** Everything except the scope, which decides the headings rather than the rows. */
export function filterQueue(rows: FollowUpRow[], state: QueueFilterState): FollowUpRow[] {
  return rows.filter((row) => {
    if (state.owners.length > 0 && !state.owners.includes(row.ownerId)) return false;
    if (state.reasons.length > 0 && !state.reasons.includes(row.reason)) return false;
    if (state.origin === "automated" && !row.isAutomated) return false;
    if (state.origin === "manual" && row.isAutomated) return false;
    return true;
  });
}

export interface QueueSection {
  bucket: BucketId;
  label: string;
  empty: string;
  rows: FollowUpRow[];
}

/**
 * The piles a given scope should render.
 *
 * `open` deliberately leaves Done out. It is the state of the work still
 * standing, and mixing finished rows into it would make a cleared queue look
 * as busy as a full one.
 */
export function buildSections(rows: FollowUpRow[], scope: ScopeId): QueueSection[] {
  const wanted = scope === "open" ? BUCKETS.filter((b) => b.id !== "done") : BUCKETS.filter((b) => b.id === scope);

  return wanted.map((bucket) => ({
    bucket: bucket.id,
    label: bucket.label,
    empty: bucket.empty,
    rows: sortBucket(
      rows.filter((row) => bucketOf(row) === bucket.id),
      bucket.id,
    ),
  }));
}

// ---------------------------------------------------------------------------
// Snooze
// ---------------------------------------------------------------------------

/** The property's calendar day `n` days out, at a given local hour. */
function atHour(offsetDays: number, hour: number): string {
  const hh = String(hour).padStart(2, "0");
  return new Date(`${demoDate(offsetDays)}T${hh}:00:00+05:30`).toISOString();
}

/** Days until the next Monday at the property, counted in local calendar days. */
function daysToMonday(): number {
  const weekday = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    timeZone: "Asia/Kolkata",
  });
  for (let offset = 1; offset <= 7; offset += 1) {
    if (weekday.format(new Date(`${demoDate(offset)}T12:00:00+05:30`)) === "Mon") return offset;
  }
  return 7;
}

/**
 * Snooze in the units a desk actually uses.
 *
 * "Later this morning" and "after the check-in rush" are the real intervals,
 * so the short options are hours and the long ones land at nine in the
 * morning, when somebody is at the desk to act on them.
 */
export const SNOOZE_OPTIONS: { id: string; label: string; resolve: () => string }[] = [
  { id: "1h", label: "1 hour", resolve: () => new Date(DEMO_NOW.getTime() + 3_600_000).toISOString() },
  { id: "3h", label: "3 hours", resolve: () => new Date(DEMO_NOW.getTime() + 3 * 3_600_000).toISOString() },
  { id: "tomorrow", label: "Tomorrow, 9 am", resolve: () => atHour(1, 9) },
  { id: "monday", label: "Monday, 9 am", resolve: () => atHour(daysToMonday(), 9) },
];
