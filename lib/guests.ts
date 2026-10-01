/**
 * The guest directory and the guest profile (§16).
 *
 * Two numbers in this product mean different things and must never be added
 * together. `guest.lifetimeValue` and `guest.totalStays` are the property's own
 * long record, carried over from whatever the front desk kept before this
 * system existed. The booking ledger holds only what this system has seen.
 *
 * So everything derived from bookings is labelled "on file" and stated
 * separately from the lifetime figures. A directory that quietly blended the
 * two would show a guest with eleven stays and two nights, and the first person
 * to notice would stop trusting every other number on the screen.
 */

import { EXCEPTIONS } from "@/data/exceptions";
import { ALL_GUESTS, GUEST_BY_ID } from "@/data/guests";
import { ROOM_TYPE_BY_ID } from "@/data/hotel";
import { getBookingsForGuest, type BookingRow } from "@/lib/bookings";
import { DEMO_TODAY } from "@/lib/clock";
import { formatDayMonth } from "@/lib/format";
import type { ExceptionItem, Guest, GuestSegment, ISODate, Paise } from "@/types";

const DAY_MS = 86_400_000;

function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

// ---------------------------------------------------------------------------
// Directory row
// ---------------------------------------------------------------------------

export interface GuestRow {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  company?: string;
  segments: GuestSegment[];
  /** The property's lifetime record, including stays that predate this system. */
  totalStays: number;
  lifetimeValue: Paise;
  lastStayDate?: ISODate;
  /** Stays this system can actually show, which is usually fewer. */
  staysOnFile: number;
  nightsOnFile: number;
  roomNightsOnFile: number;
  revenueOnFile: Paise;
  /** Revenue on file divided by room nights on file. Zero when nothing is on file. */
  averageRate: Paise;
  preferredRoomTypeName?: string;
  /** Days since the last completed stay. Undefined for a guest who has not stayed. */
  daysSinceLastStay?: number;
  hasUpcoming: boolean;
  nextArrival?: ISODate;
  inHouse: boolean;
  openComplaints: number;
  lastInteractionAt: string;
  likelihood: Likelihood;
}

// ---------------------------------------------------------------------------
// Next-stay likelihood
// ---------------------------------------------------------------------------

export type LikelihoodBand = "high" | "moderate" | "low";

export interface LikelihoodFactor {
  label: string;
  detail: string;
  /** Signed contribution to the score, in points. */
  points: number;
}

export interface Likelihood {
  score: number;
  band: LikelihoodBand;
  factors: LikelihoodFactor[];
}

const BAND_LABEL: Record<LikelihoodBand, string> = {
  high: "Likely to return",
  moderate: "Worth an approach",
  low: "Unlikely without a reason",
};

export function likelihoodLabel(band: LikelihoodBand): string {
  return BAND_LABEL[band];
}

/**
 * How likely this guest is to book again, scored from what the property knows.
 *
 * Deliberately arithmetic rather than a model, and deliberately shown with its
 * working. A number a receptionist cannot argue with is a number a receptionist
 * will ignore, and §42 puts the judgement with the human either way. Every
 * factor below is something a manager would have said out loud anyway; the
 * score only saves them from sorting eighty guests by hand.
 */
export function nextStayLikelihood(
  guest: Guest,
  stays: BookingRow[],
  openComplaints: number,
  today: ISODate = DEMO_TODAY,
): Likelihood {
  const factors: LikelihoodFactor[] = [];
  let score = 30;
  factors.push({
    label: "Base",
    detail: "Every guest on the directory starts here.",
    points: 30,
  });

  // `stays` arrives newest first, so the soonest arrival is the last future one.
  const upcoming = stays.filter((s) => s.checkIn > today && s.status !== "cancelled").at(-1);
  if (upcoming) {
    score += 40;
    factors.push({
      label: "Already booked",
      detail: `Arriving ${formatDayMonth(upcoming.checkIn)}. A guest with a reservation is the strongest signal there is.`,
      points: 40,
    });
  }

  if (guest.lastStayDate) {
    const days = daysBetween(guest.lastStayDate, today);
    if (days <= 90) {
      score += 20;
      factors.push({
        label: "Recent stay",
        detail: `Last stayed ${days} days ago.`,
        points: 20,
      });
    } else if (days <= 365) {
      score += 8;
      factors.push({
        label: "Stayed within the year",
        detail: `Last stayed ${days} days ago.`,
        points: 8,
      });
    } else {
      score -= 12;
      factors.push({
        label: "Gone quiet",
        detail: `No stay in ${Math.round(days / 30)} months.`,
        points: -12,
      });
    }
  } else if (!upcoming) {
    score -= 5;
    factors.push({
      label: "No stay on record",
      detail: "Enquired but has not stayed yet.",
      points: -5,
    });
  }

  if (guest.totalStays >= 6) {
    score += 18;
    factors.push({
      label: "Regular",
      detail: `${guest.totalStays} stays with the property.`,
      points: 18,
    });
  } else if (guest.totalStays >= 2) {
    score += 10;
    factors.push({
      label: "Has returned before",
      detail: `${guest.totalStays} stays with the property.`,
      points: 10,
    });
  }

  if (guest.segments.includes("corporate") || guest.company) {
    score += 12;
    factors.push({
      label: "Corporate travel",
      detail: guest.company
        ? `Travels for ${guest.company}, so the trip repeats on its own schedule.`
        : "Books on a company account, so the trip repeats on its own schedule.",
      points: 12,
    });
  }

  if (guest.segments.includes("vip") || guest.segments.includes("high_value")) {
    score += 8;
    factors.push({
      label: "High value",
      detail: "Spends above the house average when they stay.",
      points: 8,
    });
  }

  if (guest.segments.includes("at_risk")) {
    score -= 25;
    factors.push({
      label: "Flagged at risk",
      detail: "Marked by the team after the last stay.",
      points: -25,
    });
  }

  if (openComplaints > 0) {
    score -= 15;
    factors.push({
      label: "Unresolved complaint",
      detail: `${openComplaints} open in the exception queue.`,
      points: -15,
    });
  }

  const bounded = Math.max(0, Math.min(100, score));
  const band: LikelihoodBand = bounded >= 65 ? "high" : bounded >= 40 ? "moderate" : "low";
  return { score: bounded, band, factors };
}

// ---------------------------------------------------------------------------
// Row construction
// ---------------------------------------------------------------------------

function openComplaintsFor(guestId: string): ExceptionItem[] {
  return EXCEPTIONS.filter(
    (e) =>
      e.guestId === guestId &&
      (e.kind === "complaint" || e.kind === "refund") &&
      e.status !== "approved" &&
      e.status !== "rejected",
  );
}

function toRow(guest: Guest, today: ISODate): GuestRow {
  const stays = getBookingsForGuest(guest.id);
  const counted = stays.filter((s) => s.status !== "cancelled" && s.status !== "no_show");
  const completed = counted.filter((s) => s.checkOut <= today);
  const upcoming = counted.filter((s) => s.checkIn > today);
  const inHouse = counted.some((s) => s.status === "checked_in");

  const nightsOnFile = completed.reduce((n, s) => n + s.nights, 0);
  const roomNightsOnFile = completed.reduce((n, s) => n + s.roomNights, 0);
  const revenueOnFile = completed.reduce((n, s) => n + s.total, 0);
  const openComplaints = openComplaintsFor(guest.id);

  return {
    id: guest.id,
    name: guest.name,
    phone: guest.phone,
    email: guest.email,
    city: guest.city,
    company: guest.company,
    segments: guest.segments,
    totalStays: guest.totalStays,
    lifetimeValue: guest.lifetimeValue,
    lastStayDate: guest.lastStayDate,
    staysOnFile: completed.length,
    nightsOnFile,
    roomNightsOnFile,
    revenueOnFile,
    averageRate: roomNightsOnFile > 0 ? Math.round(revenueOnFile / roomNightsOnFile) : 0,
    preferredRoomTypeName: guest.preferredRoomTypeId
      ? ROOM_TYPE_BY_ID[guest.preferredRoomTypeId]?.name
      : undefined,
    daysSinceLastStay: guest.lastStayDate ? daysBetween(guest.lastStayDate, today) : undefined,
    hasUpcoming: upcoming.length > 0,
    // Sorted newest first, so the soonest future arrival sits at the end.
    nextArrival: upcoming.at(-1)?.checkIn,
    inHouse,
    openComplaints: openComplaints.length,
    lastInteractionAt: guest.lastInteractionAt,
    likelihood: nextStayLikelihood(guest, counted, openComplaints.length, today),
  };
}

/** The whole directory, most valuable first. */
export function getGuestRows(today: ISODate = DEMO_TODAY): GuestRow[] {
  return ALL_GUESTS.map((g) => toRow(g, today)).sort((a, b) => b.lifetimeValue - a.lifetimeValue);
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export interface GuestComplaint {
  id: string;
  reference: string;
  kind: ExceptionItem["kind"];
  severity: ExceptionItem["severity"];
  status: ExceptionItem["status"];
  title: string;
  reason: string;
  requestedAction: string;
  businessImpact: Paise;
  raisedAt: string;
  resolvedAt?: string;
  /** Hours from raised to resolved. Undefined while it is still open. */
  hoursToResolve?: number;
  bookingReference?: string;
  resolutionNote?: string;
}

export interface GuestProfile {
  row: GuestRow;
  guest: Guest;
  stays: BookingRow[];
  /** Stays already completed, which is what the history table shows. */
  past: BookingRow[];
  upcoming: BookingRow[];
  inHouse?: BookingRow;
  complaints: GuestComplaint[];
  /**
   * The gap between the property's lifetime record and this system's ledger.
   * Shown so the profile can say what it does not know.
   */
  staysNotOnFile: number;
}

export function getGuestProfile(id: string, today: ISODate = DEMO_TODAY): GuestProfile | undefined {
  const guest = GUEST_BY_ID[id];
  if (!guest) return undefined;

  const stays = getBookingsForGuest(id);
  const counted = stays.filter((s) => s.status !== "cancelled" && s.status !== "no_show");
  const row = toRow(guest, today);

  const complaints: GuestComplaint[] = EXCEPTIONS.filter((e) => e.guestId === id)
    .map((e) => {
      const booking = e.bookingId ? stays.find((s) => s.id === e.bookingId) : undefined;
      // The last comment on a resolved exception is what someone actually did
      // about it, which is the only part a profile needs to show.
      const lastComment = e.comments[e.comments.length - 1];
      return {
        id: e.id,
        reference: e.reference,
        kind: e.kind,
        severity: e.severity,
        status: e.status,
        title: e.title,
        reason: e.reason,
        requestedAction: e.requestedAction,
        businessImpact: e.businessImpact,
        raisedAt: e.raisedAt,
        resolvedAt: e.resolvedAt,
        hoursToResolve: e.resolvedAt
          ? Math.round(((Date.parse(e.resolvedAt) - Date.parse(e.raisedAt)) / 3_600_000) * 10) / 10
          : undefined,
        bookingReference: booking?.reference,
        resolutionNote: e.resolvedAt ? lastComment?.body : undefined,
      };
    })
    .sort((a, b) => b.raisedAt.localeCompare(a.raisedAt));

  return {
    row,
    guest,
    stays,
    past: counted.filter((s) => s.checkOut <= today),
    upcoming: counted.filter((s) => s.checkIn > today),
    inHouse: counted.find((s) => s.status === "checked_in"),
    complaints,
    staysNotOnFile: Math.max(0, guest.totalStays - row.staysOnFile),
  };
}

// ---------------------------------------------------------------------------
// Directory aggregates
// ---------------------------------------------------------------------------

export interface DirectorySummary {
  guests: number;
  /** Guests who have stayed at least once, by the property's own record. */
  returning: number;
  lifetimeValue: Paise;
  /** Average lifetime value across guests who have stayed. */
  averageValue: Paise;
  inHouse: number;
  arrivingSoon: number;
  atRisk: number;
  vip: number;
}

export function summariseDirectory(rows: GuestRow[]): DirectorySummary {
  const stayed = rows.filter((r) => r.totalStays > 0);
  const lifetimeValue = rows.reduce((n, r) => n + r.lifetimeValue, 0);

  return {
    guests: rows.length,
    returning: rows.filter((r) => r.totalStays > 1).length,
    lifetimeValue,
    averageValue: stayed.length > 0 ? Math.round(lifetimeValue / stayed.length) : 0,
    inHouse: rows.filter((r) => r.inHouse).length,
    arrivingSoon: rows.filter((r) => r.hasUpcoming).length,
    atRisk: rows.filter((r) => r.segments.includes("at_risk")).length,
    vip: rows.filter((r) => r.segments.includes("vip")).length,
  };
}
