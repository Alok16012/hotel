/**
 * The booking ledger, shaped for the screens that read it (§17).
 *
 * `data/bookings.ts` stores reservations the way a database would: foreign keys
 * and nothing else. Every surface that shows a booking wants the guest's name,
 * the category name and the balance outstanding, so the join happens once, here,
 * rather than four times in four components that each reach for a different
 * lookup table.
 *
 * The arithmetic itself lives in `lib/booking-math.ts`, which has no seeded data
 * in it and can therefore be called from the browser. This file is the half that
 * knows where the rows come from and what the property's policy currently says;
 * it supplies those two things and delegates the rest.
 */

import { BOOKINGS, BOOKING_BY_ID } from "@/data/bookings";
import { GUEST_BY_ID } from "@/data/guests";
import { ROOM_TYPE_BY_ID } from "@/data/hotel";
import { CANCELLATION_POLICY } from "@/data/policies";
import {
  buildDayBook,
  cancellationStandingFor,
  type BookingRow,
  type CancellationStanding,
  type DayBook,
} from "@/lib/booking-math";
import { DEMO_NOW, DEMO_TODAY } from "@/lib/clock";
import type { Booking, ISODate } from "@/types";

export type {
  BookingRow,
  CancellationStanding,
  DayBook,
  LedgerSummary,
} from "@/lib/booking-math";
export { summariseLedger } from "@/lib/booking-math";

// ---------------------------------------------------------------------------
// Row model
// ---------------------------------------------------------------------------

function toRow(booking: Booking): BookingRow {
  const guest = GUEST_BY_ID[booking.guestId];
  const roomType = ROOM_TYPE_BY_ID[booking.roomTypeId];

  return {
    id: booking.id,
    reference: booking.reference,
    guestId: booking.guestId,
    guestName: guest?.name ?? "Unknown guest",
    guestCity: guest?.city,
    guestCompany: guest?.company,
    segments: guest?.segments ?? [],
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    source: booking.source,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    nights: booking.nights,
    roomTypeId: booking.roomTypeId,
    roomTypeName: roomType?.name ?? booking.roomTypeId,
    roomNumbers: booking.roomNumbers,
    rooms: booking.rooms,
    adults: booking.adults,
    children: booking.children,
    mealPlan: booking.mealPlan,
    nightlyRate: booking.nightlyRate,
    subtotal: booking.subtotal,
    taxes: booking.taxes,
    total: booking.total,
    amountPaid: booking.amountPaid,
    balance: Math.max(0, booking.total - booking.amountPaid),
    leadId: booking.leadId,
    createdAt: booking.createdAt,
    specialRequests: booking.specialRequests,
    roomNights: booking.rooms * booking.nights,
  };
}

/**
 * Every reservation on file, newest arrival first.
 *
 * Sorted by check-in descending rather than by reference, because the ledger is
 * read forwards from today far more often than it is read as a numbered list.
 */
export function getBookingRows(): BookingRow[] {
  return BOOKINGS.map(toRow).sort((a, b) => b.checkIn.localeCompare(a.checkIn));
}

export function getBookingRow(id: string): BookingRow | undefined {
  const booking = BOOKING_BY_ID[id];
  return booking ? toRow(booking) : undefined;
}

/** Every stay a guest has on file, most recent first. */
export function getBookingsForGuest(guestId: string): BookingRow[] {
  return BOOKINGS.filter((b) => b.guestId === guestId)
    .map(toRow)
    .sort((a, b) => b.checkIn.localeCompare(a.checkIn));
}

// ---------------------------------------------------------------------------
// Derived views, with the defaults filled in
// ---------------------------------------------------------------------------

export function getDayBook(date: ISODate, rows: BookingRow[] = getBookingRows()): DayBook {
  return buildDayBook(rows, date);
}

/**
 * Where a reservation stands against the property's current ladder.
 *
 * The policy is read here rather than passed in, so that when settings learns to
 * edit it there is one place that decides which version of it is in force.
 */
export function cancellationStanding(
  booking: BookingRow,
  now: Date = DEMO_NOW,
): CancellationStanding {
  return cancellationStandingFor(booking, CANCELLATION_POLICY, now);
}

/**
 * The span of dates the day book can be pointed at.
 *
 * Bounded by the ledger itself rather than by a fixed window, so the date
 * stepper can never walk off into a stretch of calendar the seed data has
 * nothing to say about.
 */
export interface DayBookRange {
  first: ISODate;
  last: ISODate;
  today: ISODate;
}

export function dayBookRange(rows: BookingRow[] = getBookingRows()): DayBookRange {
  const live = rows.filter((r) => r.status !== "cancelled");
  const dates = live.flatMap((r) => [r.checkIn, r.checkOut]).sort();
  return {
    first: dates[0] ?? DEMO_TODAY,
    last: dates[dates.length - 1] ?? DEMO_TODAY,
    today: DEMO_TODAY,
  };
}
