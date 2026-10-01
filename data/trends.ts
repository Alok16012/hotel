import { demoDate } from "@/lib/clock";
import type { ISODate, Paise } from "@/types";

/**
 * Six days of history behind each Command Center KPI (§9).
 *
 * Today's point is deliberately absent from every series here. It is computed
 * from the live arrays in `lib/metrics.ts` and appended at read time, so the
 * last step of a sparkline and the headline number printed above it are the
 * same value by construction rather than by careful editing.
 *
 * Two of the dashboard's six KPIs do not appear in this file at all. Revenue
 * booked and the channel mix are recovered from `BOOKINGS` day by day, because
 * the booking table really does hold every reservation. The five series below
 * cannot be recovered that way:
 *
 *   - the lead inbox is a working set, not an archive. Enquiries that closed
 *     last week have left it, so counting `createdAt` per day would show a
 *     ramp that is an artefact of housekeeping rather than of demand.
 *   - response time, occupancy and pipeline value are states, not records. A
 *     lead carries one `firstResponseSec`; nothing in the data remembers what
 *     the desk's median was on Tuesday.
 *
 * A product with a warehouse behind it reads exactly these five from a nightly
 * rollup, which is what this file stands in for.
 *
 * Counters are measured AT 11:20, the demo clock's hour, not at day end.
 * Comparing a morning against six finished days would report a collapse every
 * morning and a recovery every evening, and a person reading it would learn
 * nothing about their desk.
 */

/** The six days before the demo day, oldest first. */
export const TREND_DAYS: ISODate[] = [-6, -5, -4, -3, -2, -1].map(demoDate);

/** Enquiries received by 11:20 on each of the six preceding days. */
export const NEW_ENQUIRIES_HISTORY: number[] = [1, 2, 1, 3, 4, 3];

/** Median first response, in seconds, on each of the six preceding days. */
export const RESPONSE_TIME_HISTORY: number[] = [510, 480, 600, 540, 450, 480];

/**
 * Trailing-30-day enquiry-to-booking conversion, measured each morning.
 *
 * It has been sliding for a week. That is the same story the response times and
 * the follow-up backlog tell, seen from the revenue end.
 */
export const CONVERSION_HISTORY: number[] = [0.318, 0.312, 0.309, 0.305, 0.302, 0.301];

/**
 * The trailing-30-day cohort the current conversion rate is taken from.
 *
 * The lead inbox holds 31 enquiries because that is the live working set. The
 * month's real denominator is larger, and it lives here rather than being
 * back-filled into the inbox as hundreds of archived rows nobody would open.
 */
export const CONVERSION_COHORT = { enquiries: 198, booked: 59 };

/** Rooms occupied as a share of sellable rooms, each night. */
export const OCCUPANCY_HISTORY: number[] = [0.556, 0.603, 0.667, 0.698, 0.635, 0.587];

/** Value of open enquiries at 11:20 each morning, in paise. */
export const PIPELINE_HISTORY: Paise[] = [
  223_600_000, 231_200_000, 228_400_000, 241_900_000, 247_300_000, 249_800_000,
];

// ---------------------------------------------------------------------------
// Thirty-day series, read by /analytics
// ---------------------------------------------------------------------------

/** The twenty-nine days before the demo day, oldest first. */
export const AUTONOMY_DAYS: ISODate[] = Array.from({ length: 29 }, (_, i) => demoDate(i - 29));

/**
 * Share of desk actions that finished without a person, day by day (§21, §42).
 *
 * Today's point is not in this array. It is counted from `EVENTS_TODAY` in
 * `lib/metrics.ts` and appended at read time, for the same reason the six-day
 * series above stop at yesterday: the headline and the last step of the line
 * have to be the same number by construction.
 *
 * The shape is the product's own history. Automation was switched on four weeks
 * ago at a little over half the desk's work, climbed as rules were added, and
 * has flattened in the high seventies. The dip at day nineteen is the weekend
 * the WhatsApp templates were being rewritten.
 */
export const AUTONOMY_HISTORY: number[] = [
  0.54, 0.56, 0.55, 0.59, 0.61, 0.6, 0.63, 0.66, 0.65, 0.68, 0.7, 0.69, 0.72, 0.74, 0.73, 0.75,
  0.76, 0.78, 0.77, 0.71, 0.74, 0.78, 0.79, 0.78, 0.8, 0.79, 0.78, 0.8, 0.79,
];

/**
 * The trailing-30-day enquiry cohort, stage by stage (§21).
 *
 * This is a cohort, not a snapshot. Every one of the 198 enquiries below
 * entered in the same window and is counted at the furthest stage it ever
 * reached, so an enquiry that booked is counted at every stage on the way. That
 * is what makes stage-to-stage drop-off meaningful; doing the same arithmetic
 * on the live inbox would measure how many enquiries happen to be sitting in
 * each stage this morning, which is a different question with a similar shape.
 *
 * The totals tie to `CONVERSION_COHORT` by construction: 198 in, 59 booked.
 */
export const FUNNEL_COHORT: { stage: string; label: string; reached: number }[] = [
  { stage: "new", label: "Enquiry received", reached: 198 },
  { stage: "contacted", label: "Answered by the desk", reached: 186 },
  { stage: "qualified", label: "Dates and rooms confirmed", reached: 154 },
  { stage: "quote_sent", label: "Quote sent", reached: 121 },
  { stage: "negotiating", label: "Rate discussed", reached: 88 },
  { stage: "payment_pending", label: "Advance requested", reached: 67 },
  { stage: "booked", label: "Booked", reached: 59 },
];
