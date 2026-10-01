import { formatDayMonth } from "@/lib/format";
import type { GuestRow } from "@/lib/guests";
import type { GuestSegment } from "@/types";

/**
 * Directory state, kept out of the component (§16).
 *
 * Search, scope and sort are three different questions and are modelled as
 * three fields rather than one clever query string. The reception desk types a
 * surname; the manager wants the at-risk pile; the owner sorts by value. None of
 * them should have to learn a syntax to get there.
 */

export type ScopeId = "all" | "in_house" | "arriving" | "attention";

export const SCOPES: readonly { id: ScopeId; label: string }[] = [
  { id: "all", label: "Everyone" },
  { id: "in_house", label: "In house" },
  { id: "arriving", label: "Arriving" },
  { id: "attention", label: "Needs attention" },
];

export type SortId = "value" | "likelihood" | "recent" | "stays" | "name";

export const SORTS: readonly { id: SortId; label: string }[] = [
  { id: "value", label: "Lifetime value" },
  { id: "likelihood", label: "Return likelihood" },
  { id: "recent", label: "Last stay" },
  { id: "stays", label: "Stay count" },
  { id: "name", label: "Name" },
];

export const SEGMENTS: readonly GuestSegment[] = [
  "vip",
  "returning",
  "corporate",
  "family",
  "long_stay",
  "high_value",
  "at_risk",
  "new",
];

export interface DirectoryFilterState {
  query: string;
  scope: ScopeId;
  segments: GuestSegment[];
  sort: SortId;
}

export const EMPTY_FILTERS: DirectoryFilterState = {
  query: "",
  scope: "all",
  segments: [],
  sort: "value",
};

export function activeFilterCount(state: DirectoryFilterState): number {
  return state.segments.length + (state.query.trim() ? 1 : 0);
}

/**
 * Everything a person might type at a directory looking for one guest.
 *
 * Phone is searched with the separators stripped, because the number on a
 * WhatsApp message and the number in a profile are rarely punctuated the same
 * way, and a search that fails on a space is a search nobody uses twice.
 */
function matchesQuery(row: GuestRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");

  if (row.name.toLowerCase().includes(q)) return true;
  if (row.email?.toLowerCase().includes(q)) return true;
  if (row.city?.toLowerCase().includes(q)) return true;
  if (row.company?.toLowerCase().includes(q)) return true;
  if (digits.length >= 3 && row.phone.replace(/\D/g, "").includes(digits)) return true;
  return false;
}

function inScope(row: GuestRow, scope: ScopeId): boolean {
  switch (scope) {
    case "in_house":
      return row.inHouse;
    case "arriving":
      return row.hasUpcoming;
    case "attention":
      // The two things a manager would want pulled out of eighty rows: someone
      // the team has flagged, and someone with a complaint still open.
      return row.segments.includes("at_risk") || row.openComplaints > 0;
    default:
      return true;
  }
}

export function filterGuests(rows: GuestRow[], state: DirectoryFilterState): GuestRow[] {
  return rows.filter(
    (row) =>
      inScope(row, state.scope) &&
      matchesQuery(row, state.query) &&
      (state.segments.length === 0 ||
        state.segments.some((segment) => row.segments.includes(segment))),
  );
}

export function sortGuests(rows: GuestRow[], sort: SortId): GuestRow[] {
  const sorted = [...rows];
  switch (sort) {
    case "likelihood":
      return sorted.sort((a, b) => b.likelihood.score - a.likelihood.score);
    case "recent":
      // A guest with no stay on record sorts last rather than first, which is
      // where an empty string would otherwise put them.
      return sorted.sort((a, b) => (b.lastStayDate ?? "").localeCompare(a.lastStayDate ?? ""));
    case "stays":
      return sorted.sort((a, b) => b.totalStays - a.totalStays);
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return sorted.sort((a, b) => b.lifetimeValue - a.lifetimeValue);
  }
}

/**
 * What to print under "Last stay" when there is no date to print.
 *
 * "Never" is only true of a genuinely new guest. Saying it about someone with
 * six stays on the property's lifetime record, or about someone asleep upstairs
 * right now, is the directory contradicting itself in the same row. The honest
 * answer in both cases is that the date did not come across with the record, so
 * the wording follows the same "on file" grammar used everywhere else on this
 * screen.
 */
export function lastStayLabel(row: GuestRow): { value: string; hint: string } {
  if (row.lastStayDate) {
    return {
      value: formatDayMonth(row.lastStayDate),
      hint:
        row.daysSinceLastStay !== undefined
          ? `${row.daysSinceLastStay} days ago`
          : "On the property's record",
    };
  }
  if (row.inHouse) {
    return { value: "Staying now", hint: "Checked in, not yet departed" };
  }
  if (row.totalStays > 0) {
    return { value: "Not on file", hint: "Stayed before this system" };
  }
  return { value: "Never", hint: "No stay on record" };
}

export function scopeCounts(rows: GuestRow[]): Record<ScopeId, number> {
  return {
    all: rows.length,
    in_house: rows.filter((r) => inScope(r, "in_house")).length,
    arriving: rows.filter((r) => inScope(r, "arriving")).length,
    attention: rows.filter((r) => inScope(r, "attention")).length,
  };
}
