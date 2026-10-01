/**
 * Booking arithmetic with nothing seeded in it.
 *
 * `lib/bookings.ts` reaches into `data/` to build rows, which makes it a server
 * module: importing it from a client component would drag the whole ledger into
 * the browser bundle. The day book and the cancellation ladder are pure
 * functions of the rows and the policy handed to them, so they live here, where
 * both sides of the boundary can call the same implementation. A second copy of
 * the cancellation rule on the client is how two screens end up quoting two
 * different refunds for the same reservation.
 */

import { quoteTotals } from "@/lib/quote";
import type {
  Booking,
  CancellationBand,
  CancellationPolicy,
  GuestSegment,
  ISODate,
  Paise,
} from "@/types";

// ---------------------------------------------------------------------------
// Row model
// ---------------------------------------------------------------------------

/**
 * A booking with the names already resolved.
 *
 * Plain data on purpose: the bookings screen is a client component, so whatever
 * it receives has to survive the server boundary. Nothing here is a class, a
 * date object or a function.
 */
export interface BookingRow {
  id: string;
  reference: string;
  guestId: string;
  guestName: string;
  guestCity?: string;
  guestCompany?: string;
  segments: GuestSegment[];
  status: Booking["status"];
  paymentStatus: Booking["paymentStatus"];
  source: Booking["source"];
  checkIn: ISODate;
  checkOut: ISODate;
  nights: number;
  roomTypeId: string;
  roomTypeName: string;
  roomNumbers: string[];
  rooms: number;
  adults: number;
  children: number;
  mealPlan: Booking["mealPlan"];
  nightlyRate: Paise;
  subtotal: Paise;
  taxes: Paise;
  total: Paise;
  amountPaid: Paise;
  /** What the guest still owes. Never negative; a refund reads as its own state. */
  balance: Paise;
  leadId?: string;
  createdAt: string;
  specialRequests: string[];
  /** Room nights sold, which is what revenue per night is divided by. */
  roomNights: number;
}

// ---------------------------------------------------------------------------
// The day book
// ---------------------------------------------------------------------------

export interface DayBook {
  date: ISODate;
  arrivals: BookingRow[];
  departures: BookingRow[];
  /** In the building on that date and not moving either way. */
  stayovers: BookingRow[];
  roomsArriving: number;
  roomsDeparting: number;
  roomsOccupied: number;
  /** Money expected at the desk on arrival, across the day's check-ins. */
  balanceDue: Paise;
}

/**
 * Who moves through the door on one date.
 *
 * Cancellations are excluded everywhere: a cancelled reservation is a fact about
 * the ledger, not a person walking in, and counting it would overstate both the
 * arrivals list and the house.
 */
export function buildDayBook(rows: BookingRow[], date: ISODate): DayBook {
  const live = rows.filter((r) => r.status !== "cancelled" && r.status !== "no_show");

  const arrivals = live
    .filter((r) => r.checkIn === date)
    .sort((a, b) => a.guestName.localeCompare(b.guestName));
  const departures = live
    .filter((r) => r.checkOut === date)
    .sort((a, b) => a.guestName.localeCompare(b.guestName));
  const stayovers = live
    .filter((r) => r.checkIn < date && r.checkOut > date)
    .sort((a, b) => a.guestName.localeCompare(b.guestName));

  const sum = (list: BookingRow[]) => list.reduce((n, r) => n + r.rooms, 0);

  return {
    date,
    arrivals,
    departures,
    stayovers,
    roomsArriving: sum(arrivals),
    roomsDeparting: sum(departures),
    // The house on the night of `date`: everyone staying over plus everyone
    // checking in. Departures have left by 11:00 and hold nothing.
    roomsOccupied: sum(stayovers) + sum(arrivals),
    balanceDue: arrivals.reduce((n, r) => n + r.balance, 0),
  };
}

// ---------------------------------------------------------------------------
// Cancellation standing
// ---------------------------------------------------------------------------

export interface CancellationStanding {
  band: CancellationBand;
  /** Hours between now and the 14:00 check-in. Negative once the stay has begun. */
  hoursToCheckIn: number;
  /** What the property keeps if the guest cancels at this moment. */
  charge: Paise;
  /** Returned to the guest, out of what they have already paid. */
  refund: Paise;
  /** Still owed after the charge, if the advance does not cover it. */
  shortfall: Paise;
  /** True once the guest is in the building and the ladder no longer applies. */
  stayStarted: boolean;
}

/** Check-in is 14:00 IST on the arrival date, which is where the clock starts. */
function checkInInstant(date: ISODate): number {
  return new Date(`${date}T14:00:00+05:30`).getTime();
}

function bandFor(policy: CancellationPolicy, hoursToCheckIn: number): CancellationBand {
  const found = policy.bands.find(
    (b) =>
      (b.fromHoursBefore === null || hoursToCheckIn <= b.fromHoursBefore) &&
      hoursToCheckIn > b.toHoursBefore,
  );
  // Past the last rung means the arrival window has closed, which the final
  // band already covers. Falling back to it keeps the function total.
  return found ?? policy.bands[policy.bands.length - 1];
}

/**
 * Where a reservation stands against the ladder right now.
 *
 * The charge is computed from the same `quoteTotals` the folio uses, so the
 * retained amount lands on the same GST band as the stay it came from. Deriving
 * it any other way produces a number that is close enough to look right and
 * wrong enough to be disputed.
 */
export function cancellationStandingFor(
  booking: BookingRow,
  policy: CancellationPolicy,
  now: Date,
): CancellationStanding {
  const hoursToCheckIn = (checkInInstant(booking.checkIn) - now.getTime()) / 3_600_000;
  const band = bandFor(policy, hoursToCheckIn);

  let charge = 0;
  if (band.chargeShare !== undefined) {
    charge = Math.round(booking.total * band.chargeShare);
  } else if (band.chargeNights) {
    const nights = Math.min(band.chargeNights, booking.nights);
    charge = quoteTotals(booking.nightlyRate, booking.rooms, nights).total;
  }

  return {
    band,
    hoursToCheckIn,
    charge,
    refund: Math.max(0, booking.amountPaid - charge),
    shortfall: Math.max(0, charge - booking.amountPaid),
    stayStarted: hoursToCheckIn <= 0,
  };
}

// ---------------------------------------------------------------------------
// Ledger aggregates
// ---------------------------------------------------------------------------

export interface LedgerSummary {
  bookings: number;
  roomNights: number;
  value: Paise;
  collected: Paise;
  outstanding: Paise;
  /** Value of everything cancelled or no-showed, which never arrives. */
  lost: Paise;
}

export function summariseLedger(rows: BookingRow[]): LedgerSummary {
  const live = rows.filter((r) => r.status !== "cancelled" && r.status !== "no_show");
  const dead = rows.filter((r) => r.status === "cancelled" || r.status === "no_show");

  return {
    bookings: live.length,
    roomNights: live.reduce((n, r) => n + r.roomNights, 0),
    value: live.reduce((n, r) => n + r.total, 0),
    collected: live.reduce((n, r) => n + r.amountPaid, 0),
    outstanding: live.reduce((n, r) => n + r.balance, 0),
    lost: dead.reduce((n, r) => n + r.total, 0),
  };
}
