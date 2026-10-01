/**
 * The demo clock.
 *
 * Every relative timestamp in this application ("18 min ago", "arriving
 * tomorrow", "overdue by 2h") is measured against this single fixed instant
 * rather than `Date.now()`. Two reasons, both load-bearing:
 *
 * 1. Hydration. These strings render on the server and again on the client. A
 *    real clock ticks between the two renders and React reports a mismatch.
 * 2. Narrative integrity. The seeded data tells a specific story — a lead that
 *    came in during this morning's rush, a follow-up that went overdue at
 *    lunch. If "now" drifts, the story decays into nonsense within a day.
 *
 * When a real backend arrives this becomes `new Date()` on the server and the
 * value is passed down through props exactly as it is today.
 */
export const DEMO_NOW = new Date("2026-09-19T11:20:00+05:30");

/** ISO string form, for seeding records relative to the demo clock. */
export const DEMO_NOW_ISO = DEMO_NOW.toISOString();

/** Offset helper for seed files: `minutesAgo(45)` reads better than arithmetic. */
export function minutesAgo(n: number): string {
  return new Date(DEMO_NOW.getTime() - n * 60_000).toISOString();
}

export function hoursAgo(n: number): string {
  return minutesAgo(n * 60);
}

export function daysAgo(n: number): string {
  return minutesAgo(n * 60 * 24);
}

export function daysAhead(n: number): string {
  return minutesAgo(-n * 60 * 24);
}

// en-CA emits ISO order (YYYY-MM-DD); the property's zone is pinned so the
// calendar day cannot shift under a server running in UTC.
const isoDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });

/** `YYYY-MM-DD` n days from the demo clock, for inventory and stay dates. */
export function demoDate(offsetDays: number): string {
  return isoDay.format(new Date(DEMO_NOW.getTime() + offsetDays * 86_400_000));
}

/** Today at the property, as a plain ISO date. */
export const DEMO_TODAY = demoDate(0);

/**
 * The property's calendar day for a timestamp.
 *
 * Use this instead of `iso.slice(0, 10)` whenever a record is being bucketed by
 * day. The seed helpers emit UTC, so slicing the string files everything
 * between midnight and 05:30 IST under the previous date, which silently drags
 * early-morning bookings into yesterday's revenue.
 */
export function demoDayOf(iso: string): string {
  return isoDay.format(new Date(iso));
}

/**
 * Whether a UTC timestamp falls on the property's calendar day.
 *
 * The seed helpers above emit UTC (`...T05:50:00.000Z`), so a string comparison
 * against an IST date would be wrong by five and a half hours — enough to push
 * everything before 05:30 into the previous day. Formatting into Asia/Kolkata
 * first is the only comparison that holds.
 */
export function isDemoToday(iso: string): boolean {
  return isoDay.format(new Date(iso)) === DEMO_TODAY;
}
