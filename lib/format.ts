/**
 * Display formatting. Every function here is pure and deterministic so that
 * server and client render identical strings (no hydration mismatch).
 */

import { differenceInMinutes, formatDistanceStrict, parseISO } from "date-fns";
import type { ISODate, ISODateTime, Paise } from "@/types";

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** 1850000 -> "₹18,500" */
export function formatINR(paise: Paise): string {
  return inr.format(Math.round(paise / 100));
}

/**
 * Indian short-scale money, the way hotel staff actually speak.
 * 48200000 -> "₹4.82L"   ·   125000000 -> "₹1.25Cr"
 */
export function formatINRCompact(paise: Paise): string {
  const rupees = Math.round(paise / 100);
  const abs = Math.abs(rupees);
  const sign = rupees < 0 ? "-" : "";

  if (abs >= 10_000_000) return `${sign}₹${trim(abs / 10_000_000)}Cr`;
  if (abs >= 100_000) return `${sign}₹${trim(abs / 100_000)}L`;
  if (abs >= 1_000) return `${sign}₹${trim(abs / 1_000)}K`;
  return `${sign}₹${abs}`;
}

function trim(n: number): string {
  // Two significant decimals below 10, one above; drop trailing zeroes.
  const fixed = n < 10 ? n.toFixed(2) : n.toFixed(1);
  return fixed.replace(/\.?0+$/, "");
}

/** Signed variant for deltas, where the leading + carries meaning. */
export function formatINRDelta(paise: Paise): string {
  const s = formatINRCompact(Math.abs(paise));
  return paise < 0 ? `-${s}` : `+${s}`;
}

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

export function formatPct(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatDeltaPct(value: number, digits = 1): string {
  const s = `${Math.abs(value).toFixed(digits)}%`;
  if (value > 0) return `+${s}`;
  if (value < 0) return `-${s}`;
  return s;
}

const compactNumber = new Intl.NumberFormat("en-IN", { notation: "compact" });
export function formatCount(n: number): string {
  return n < 10_000 ? n.toLocaleString("en-IN") : compactNumber.format(n);
}

// ---------------------------------------------------------------------------
// Duration
// ---------------------------------------------------------------------------

/** 1080 -> "18 min"  ·  5400 -> "1h 30m"  ·  45 -> "45 sec" */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours < 24) return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/**
 * The property's timezone, pinned explicitly.
 *
 * Every date string is formatted in IST rather than the runtime's local zone.
 * Without this, a server rendering in UTC and a browser in IST disagree about
 * which calendar day a 11 PM check-in falls on — a hydration mismatch that only
 * appears in production, and only in the evening.
 */
const TZ = "Asia/Kolkata";

const dayMonth = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  timeZone: TZ,
});

const fullDate = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TZ,
});

const timeOfDay = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: TZ,
});

const weekdayLong = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  timeZone: TZ,
});

/** Bare ISO dates carry no zone; anchor them at IST noon so they cannot slip a day. */
function toInstant(date: ISODate | ISODateTime): Date {
  return date.length === 10 ? new Date(`${date}T12:00:00+05:30`) : parseISO(date);
}

/** "2026-09-20" -> "20 Sep" */
export function formatDayMonth(date: ISODate | ISODateTime): string {
  return dayMonth.format(toInstant(date));
}

/** "2026-09-20" -> "Sat, 20 Sep 2026" */
export function formatFullDate(date: ISODate | ISODateTime): string {
  return fullDate.format(toInstant(date));
}

/** "2026-09-20" -> "Saturday" */
export function formatWeekday(date: ISODate | ISODateTime): string {
  return weekdayLong.format(toInstant(date));
}

/** "20 Sep - 22 Sep · 2 nights" */
export function formatStayRange(checkIn: ISODate, checkOut: ISODate, nights: number): string {
  const n = `${nights} night${nights === 1 ? "" : "s"}`;
  return `${formatDayMonth(checkIn)} - ${formatDayMonth(checkOut)} · ${n}`;
}

export function formatTime(date: ISODateTime): string {
  return timeOfDay.format(parseISO(date));
}

/**
 * Relative age against a caller-supplied "now".
 *
 * `now` is required rather than defaulting to Date.now() because these strings
 * render on the server and then hydrate on the client; an implicit clock would
 * produce two different values and a hydration error.
 */
export function formatRelative(date: ISODateTime, now: Date): string {
  const mins = differenceInMinutes(now, parseISO(date));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${formatDistanceStrict(parseISO(date), now)} ago`;
}

/** Bare age with no suffix, for table "Age" columns. */
export function formatAge(date: ISODateTime, now: Date): string {
  const mins = differenceInMinutes(now, parseISO(date));
  if (mins < 60) return `${Math.max(mins, 0)}m`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / (60 * 24))}d`;
}
