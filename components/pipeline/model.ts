import { differenceInCalendarDays, differenceInHours, parseISO } from "date-fns";
import { DEMO_NOW } from "@/lib/clock";
import { LEAD_STAGE, LEAD_STAGE_ORDER } from "@/lib/labels";
import type { LeadRow } from "@/lib/leads";
import type { LeadSource, LeadStage, LostReason, Paise } from "@/types";

/**
 * Everything the deal board knows how to compute (§15).
 *
 * Kept as pure functions over the row model, the same way the inbox keeps its
 * views in `components/leads/filters.ts`. The board holds no data of its own:
 * hand it rows and a filter state and it will tell you what the columns look
 * like. When a real backend arrives these become the shape of its responses
 * rather than something that has to be unpicked.
 */

// ---------------------------------------------------------------------------
// Board edits
// ---------------------------------------------------------------------------

/**
 * A stage change made on the board and held in session memory.
 *
 * Only the two fields a drag can touch. Deliberately not persisted: this is a
 * demo surface, and a board that silently remembers last week's dragging would
 * misrepresent the seed data every time the page is opened.
 */
export interface BoardPatch {
  stage: LeadStage;
  /** Cleared when a lead is dragged back out of Lost. */
  lostReason?: LostReason;
}

export function applyPatches(rows: LeadRow[], patches: Record<string, BoardPatch>): LeadRow[] {
  if (Object.keys(patches).length === 0) return rows;
  return rows.map((row) => {
    const patch = patches[row.id];
    if (!patch) return row;
    return { ...row, stage: patch.stage, lostReason: patch.lostReason };
  });
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

/** The sentinel owner id for leads with nobody's name against them. */
export const UNASSIGNED = "unassigned";

export type ValueBandId = "any" | "under_25k" | "mid" | "upper" | "over_2l";

/**
 * Value bands in the amounts a revenue manager actually says out loud: a
 * twenty-five thousand rupee weekend, a two lakh wedding block. Boundaries are
 * in paise because every amount in this product is.
 */
export const VALUE_BANDS: { id: ValueBandId; label: string; match: (value: Paise) => boolean }[] = [
  { id: "any", label: "Any value", match: () => true },
  { id: "under_25k", label: "Under Rs 25,000", match: (v) => v < 2_500_000 },
  { id: "mid", label: "Rs 25,000 to Rs 75,000", match: (v) => v >= 2_500_000 && v < 7_500_000 },
  { id: "upper", label: "Rs 75,000 to Rs 2 lakh", match: (v) => v >= 7_500_000 && v < 20_000_000 },
  { id: "over_2l", label: "Over Rs 2 lakh", match: (v) => v >= 20_000_000 },
];

export type ArrivalWindowId = "any" | "next_30" | "next_quarter" | "beyond";

/**
 * Arrival windows rather than a date picker. A board is scanned, not queried,
 * and "who is arriving inside the month" is the question a duty manager asks;
 * an exact fortnight in February is a job for the inbox search.
 */
export const ARRIVAL_WINDOWS: {
  id: ArrivalWindowId;
  label: string;
  match: (daysOut: number) => boolean;
}[] = [
  { id: "any", label: "Any arrival", match: () => true },
  { id: "next_30", label: "Arriving within 30 days", match: (d) => d <= 30 },
  { id: "next_quarter", label: "Arriving in 31 to 90 days", match: (d) => d > 30 && d <= 90 },
  { id: "beyond", label: "Arriving after 90 days", match: (d) => d > 90 },
];

export interface BoardFilterState {
  /** Team member ids, plus `UNASSIGNED`. Empty means every owner. */
  owners: string[];
  sources: LeadSource[];
  valueBand: ValueBandId;
  arrival: ArrivalWindowId;
}

export const EMPTY_BOARD_FILTERS: BoardFilterState = {
  owners: [],
  sources: [],
  valueBand: "any",
  arrival: "any",
};

export function activeFilterCount(state: BoardFilterState): number {
  return (
    state.owners.length +
    state.sources.length +
    (state.valueBand === "any" ? 0 : 1) +
    (state.arrival === "any" ? 0 : 1)
  );
}

export function filterBoard(rows: LeadRow[], state: BoardFilterState): LeadRow[] {
  const band = VALUE_BANDS.find((b) => b.id === state.valueBand) ?? VALUE_BANDS[0];
  const window = ARRIVAL_WINDOWS.find((w) => w.id === state.arrival) ?? ARRIVAL_WINDOWS[0];

  return rows.filter((row) => {
    if (state.owners.length > 0 && !state.owners.includes(row.ownerId ?? UNASSIGNED)) return false;
    if (state.sources.length > 0 && !state.sources.includes(row.source)) return false;
    if (!band.match(row.value)) return false;
    return window.match(differenceInCalendarDays(parseISO(row.checkIn), DEMO_NOW));
  });
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

export interface BoardColumn {
  stage: LeadStage;
  label: string;
  rows: LeadRow[];
  /** Total of every enquiry in the column, quoted or estimated. */
  value: Paise;
  /**
   * Mean days since the enquiry arrived, not days in this stage. Stage entry
   * dates are not recorded anywhere in the model, and inventing them would put
   * a number on screen that no later backend could reproduce.
   */
  avgAgeDays: number;
}

/**
 * Cards are ordered by value inside a column. A board is read left to right
 * for state and top to bottom for what is worth picking up first, and on a
 * pipeline the answer to the second question is almost always the money.
 */
export function buildColumns(rows: LeadRow[]): BoardColumn[] {
  return LEAD_STAGE_ORDER.map((stage) => {
    const inStage = rows
      .filter((row) => row.stage === stage)
      .sort((a, b) => b.value - a.value || a.checkIn.localeCompare(b.checkIn));

    const ageHours = inStage.reduce(
      (total, row) => total + differenceInHours(DEMO_NOW, parseISO(row.createdAt)),
      0,
    );

    return {
      stage,
      label: LEAD_STAGE[stage].label,
      rows: inStage,
      value: inStage.reduce((total, row) => total + row.value, 0),
      avgAgeDays: inStage.length === 0 ? 0 : ageHours / inStage.length / 24,
    };
  });
}

// ---------------------------------------------------------------------------
// Stage reach
// ---------------------------------------------------------------------------

/** The six advances that make up the working funnel. Lost sits outside it. */
export const PROGRESSION: LeadStage[] = LEAD_STAGE_ORDER.filter((s) => s !== "lost");

export interface StageStep {
  stage: LeadStage;
  label: string;
  /** Enquiries currently at this stage or any stage beyond it. */
  reached: number;
  /** Share of the enquiries that reached the previous stage. Null on the first. */
  carriedPct: number | null;
  /** Enquiries that reached the previous stage and have not yet passed this one. */
  heldBack: number;
}

/**
 * How far the current book has travelled.
 *
 * This is a snapshot, not a cohort. An enquiry sitting at Qualified has not
 * dropped out, it simply has not finished, so the percentage is called what it
 * is: the share carried forward, with the remainder named as held back rather
 * than lost. Lost enquiries are excluded entirely, because nothing in the
 * model records the stage they were lost from and guessing would be fiction.
 */
export function buildStageReach(rows: LeadRow[]): StageStep[] {
  const live = rows.filter((row) => row.stage !== "lost");
  const reachedAt = PROGRESSION.map(
    (stage, index) =>
      live.filter((row) => PROGRESSION.indexOf(row.stage) >= index).length,
  );

  return PROGRESSION.map((stage, index) => {
    const reached = reachedAt[index];
    const previous = index === 0 ? null : reachedAt[index - 1];
    return {
      stage,
      label: LEAD_STAGE[stage].label,
      reached,
      carriedPct: previous === null || previous === 0 ? null : reached / previous,
      heldBack: previous === null ? 0 : previous - reached,
    };
  });
}

export interface LostSummary {
  count: number;
  value: Paise;
  /** Reasons ranked by frequency. Empty when no lost enquiry carries one. */
  reasons: { reason: LostReason; count: number }[];
  /**
   * The reason behind more than half the losses, if one exists.
   *
   * Null is the common and correct answer on a small book: three enquiries
   * lost for three different reasons is not a pattern, and calling the first
   * of them the main cause would send someone to fix the wrong thing.
   */
  dominant: { reason: LostReason; count: number } | null;
}

export function buildLostSummary(rows: LeadRow[]): LostSummary {
  const lost = rows.filter((row) => row.stage === "lost");
  const tally = new Map<LostReason, number>();
  for (const row of lost) {
    if (!row.lostReason) continue;
    tally.set(row.lostReason, (tally.get(row.lostReason) ?? 0) + 1);
  }

  const reasons = [...tally.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  const top = reasons[0];

  return {
    count: lost.length,
    value: lost.reduce((total, row) => total + row.value, 0),
    reasons,
    dominant: top && top.count * 2 > lost.length ? top : null,
  };
}
