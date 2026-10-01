import type { BookingRow } from "@/lib/booking-math";
import type { BookingStatus, ISODate, PaymentStatus } from "@/types";

/**
 * Ledger state, kept out of the component (§17).
 *
 * The ledger answers two different questions and the screen keeps them apart:
 * the day book is "who walks through the door on this date", the table is
 * "find me this reservation". Collapsing them into one filtered list makes both
 * jobs worse, because the desk needs the first one at 8am without typing
 * anything at all.
 */

export type LedgerScope = "upcoming" | "in_house" | "past" | "owing" | "all";

export const LEDGER_SCOPES: readonly { id: LedgerScope; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "in_house", label: "In house" },
  { id: "owing", label: "Money owed" },
  { id: "past", label: "Past" },
  { id: "all", label: "Everything" },
];

export type LedgerSortId = "arrival" | "value" | "balance" | "recent";

export const LEDGER_SORTS: readonly { id: LedgerSortId; label: string }[] = [
  { id: "arrival", label: "Arrival date" },
  { id: "value", label: "Booking value" },
  { id: "balance", label: "Balance owed" },
  { id: "recent", label: "Recently booked" },
];

export interface LedgerFilterState {
  query: string;
  scope: LedgerScope;
  statuses: BookingStatus[];
  payments: PaymentStatus[];
  sort: LedgerSortId;
}

export const EMPTY_LEDGER_FILTERS: LedgerFilterState = {
  query: "",
  scope: "upcoming",
  statuses: [],
  payments: [],
  sort: "arrival",
};

export function activeFilterCount(state: LedgerFilterState): number {
  return state.statuses.length + state.payments.length + (state.query.trim() ? 1 : 0);
}

/**
 * What someone types when they are looking for one reservation.
 *
 * Reference matching ignores case and the dashes, because the number read out
 * over the phone is rarely punctuated the way it is stored.
 */
function matchesQuery(row: BookingRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const bare = q.replace(/[^a-z0-9]/g, "");

  if (row.guestName.toLowerCase().includes(q)) return true;
  if (row.reference.toLowerCase().replace(/[^a-z0-9]/g, "").includes(bare)) return true;
  if (row.roomNumbers.some((n) => n.toLowerCase() === q)) return true;
  if (row.guestCompany?.toLowerCase().includes(q)) return true;
  return false;
}

function inScope(row: BookingRow, scope: LedgerScope, today: ISODate): boolean {
  switch (scope) {
    case "upcoming":
      return row.checkIn >= today && row.status !== "cancelled" && row.status !== "no_show";
    case "in_house":
      return row.status === "checked_in";
    case "past":
      return row.checkOut < today || row.status === "checked_out";
    case "owing":
      // A cancelled booking can still carry a retained charge, but nobody is
      // going to collect it at the desk, so it stays out of this pile.
      return row.balance > 0 && row.status !== "cancelled";
    default:
      return true;
  }
}

export function filterBookings(
  rows: BookingRow[],
  state: LedgerFilterState,
  today: ISODate,
): BookingRow[] {
  return rows.filter(
    (row) =>
      inScope(row, state.scope, today) &&
      matchesQuery(row, state.query) &&
      (state.statuses.length === 0 || state.statuses.includes(row.status)) &&
      (state.payments.length === 0 || state.payments.includes(row.paymentStatus)),
  );
}

export function sortBookings(rows: BookingRow[], sort: LedgerSortId): BookingRow[] {
  const sorted = [...rows];
  switch (sort) {
    case "value":
      return sorted.sort((a, b) => b.total - a.total);
    case "balance":
      return sorted.sort((a, b) => b.balance - a.balance);
    case "recent":
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    default:
      return sorted.sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  }
}

export function scopeCounts(
  rows: BookingRow[],
  today: ISODate,
): Record<LedgerScope, number> {
  return {
    upcoming: rows.filter((r) => inScope(r, "upcoming", today)).length,
    in_house: rows.filter((r) => inScope(r, "in_house", today)).length,
    owing: rows.filter((r) => inScope(r, "owing", today)).length,
    past: rows.filter((r) => inScope(r, "past", today)).length,
    all: rows.length,
  };
}

/**
 * Step the day book a day at a time, without walking off the seeded calendar.
 *
 * The arithmetic is done in UTC on purpose. A calendar date is not an instant,
 * and anchoring it to one (`${date}T00:00:00+05:30`) and then stepping with the
 * runtime's local `getDate` makes the answer depend on where the browser thinks
 * it is: in a UTC browser, midnight IST is the previous evening, so "next day"
 * lands back on the date you started from and the stepper appears frozen.
 * Treating the date as three numbers keeps every timezone on the same day.
 */
export function stepDate(date: ISODate, days: number, first: ISODate, last: ISODate): ISODate {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + days);
  const iso = next.toISOString().slice(0, 10);
  if (iso < first) return first;
  if (iso > last) return last;
  return iso;
}
