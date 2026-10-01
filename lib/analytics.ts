/**
 * The five questions /analytics answers (§21).
 *
 * Each block below carries its own measurement window, and the window is part
 * of the returned shape rather than a caption typed into a component. That is
 * deliberate: the revenue line is recovered day by day from the booking table,
 * the funnel is a seeded thirty-day cohort, and the response distribution is
 * the live inbox. Three different windows on one screen is honest only if each
 * panel says which one it is standing on.
 *
 * Nothing here is a written-down result. When a warehouse replaces the seed,
 * every function becomes a query returning the same shape.
 */

import { BOOKINGS } from "@/data/bookings";
import { AUTONOMY_RATE, DESK_ACTIONS_TODAY, HUMAN_TOUCHED_TODAY } from "@/data/events";
import { AUTONOMY_DAYS, AUTONOMY_HISTORY, FUNNEL_COHORT } from "@/data/trends";
import { DEMO_NOW, demoDate } from "@/lib/clock";
import {
  ANSWERED_LEADS,
  SLA_TARGET_SEC,
  getChannelPerformance,
  revenueSeries,
} from "@/lib/metrics";
import type { ChannelPerformance, ISODate, Paise } from "@/types";

/**
 * The two windows the seed can honestly support.
 *
 * The labelled list that the range switch renders lives in
 * `components/analytics/model.ts`, because this module reaches into `data/`
 * and the switch is a client component.
 */
export type AnalyticsRange = 7 | 30;

// ---------------------------------------------------------------------------
// Revenue and bookings
// ---------------------------------------------------------------------------

export interface RevenuePoint {
  date: ISODate;
  value: Paise;
  bookings: number;
}

export interface RevenueTrend {
  points: RevenuePoint[];
  total: Paise;
  bookings: number;
  /** Mean value of a reservation created in the window. Zero if none were. */
  averageBooking: Paise;
  /** The same length of time immediately before the window. */
  previousTotal: Paise;
  previousBookings: number;
  /** Whether the ledger reaches far enough back for the comparison to mean anything. */
  comparable: boolean;
  deltaPct?: number;
  /** The single best day in the window, for the annotation on the chart. */
  best?: RevenuePoint;
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * How far back the reservation ledger actually goes, in days.
 *
 * A change is only meaningful against a window the records cover. The ledger
 * here starts part-way through the previous month, so a thirty-day figure has
 * no full thirty days behind it to be compared with, and measuring it against
 * the fragment that exists produces a triple-digit rise that describes where
 * the records begin rather than anything the property did.
 */
const LEDGER_DAYS = Math.max(
  ...BOOKINGS.map((booking) => Math.ceil((DEMO_NOW.getTime() - new Date(booking.createdAt).getTime()) / 86_400_000)),
);

function deltaPct(current: number, previous: number): number | undefined {
  if (!previous) return undefined;
  return ((current - previous) / previous) * 100;
}

function revenueTrend(range: AnalyticsRange): RevenueTrend {
  const current = revenueSeries(range).map((d) => ({
    date: d.date,
    value: d.value,
    bookings: d.count,
  }));
  const previous = revenueSeries(range, -range);

  const total = sum(current.map((d) => d.value));
  const bookings = sum(current.map((d) => d.bookings));
  const previousTotal = sum(previous.map((d) => d.value));
  const previousBookings = sum(previous.map((d) => d.count));
  const comparable = LEDGER_DAYS >= range * 2;

  // A day with no bookings is a real zero, not a gap, so it stays in the series
  // and only the best day is singled out.
  const best = current.reduce<RevenuePoint | undefined>(
    (top, point) => (point.value > (top?.value ?? 0) ? point : top),
    undefined,
  );

  return {
    points: current,
    total,
    bookings,
    averageBooking: bookings > 0 ? Math.round(total / bookings) : 0,
    previousTotal,
    previousBookings,
    comparable,
    deltaPct: comparable ? deltaPct(total, previousTotal) : undefined,
    best,
  };
}

// ---------------------------------------------------------------------------
// Conversion funnel
// ---------------------------------------------------------------------------

export interface FunnelStep {
  stage: string;
  label: string;
  reached: number;
  /** Share of the enquiries that entered the funnel at all. */
  shareOfTop: number;
  /** How many were lost between the previous stage and this one. */
  lost: number;
  /** That loss as a share of the previous stage, which is the number that bites. */
  lostPct: number;
}

export interface Funnel {
  steps: FunnelStep[];
  entered: number;
  booked: number;
  conversionRate: number;
  /** The stage where the largest share of the remaining enquiries is lost. */
  worst?: FunnelStep;
  windowDays: 30;
}

function funnel(): Funnel {
  const entered = FUNNEL_COHORT[0].reached;

  const steps: FunnelStep[] = FUNNEL_COHORT.map((step, i) => {
    const previous = i === 0 ? step.reached : FUNNEL_COHORT[i - 1].reached;
    const lost = previous - step.reached;
    return {
      ...step,
      shareOfTop: step.reached / entered,
      lost,
      lostPct: previous > 0 ? lost / previous : 0,
    };
  });

  const booked = steps[steps.length - 1].reached;

  return {
    steps,
    entered,
    booked,
    conversionRate: booked / entered,
    worst: steps.slice(1).reduce<FunnelStep | undefined>(
      (worst, step) => (step.lostPct > (worst?.lostPct ?? 0) ? step : worst),
      undefined,
    ),
    windowDays: 30,
  };
}

// ---------------------------------------------------------------------------
// Response time distribution
// ---------------------------------------------------------------------------

export interface ResponseBucket {
  id: string;
  label: string;
  /** Inclusive lower bound and exclusive upper bound, in seconds. */
  fromSec: number;
  toSec?: number;
  count: number;
  share: number;
  /** Whether everything in this bucket is inside the thirty-minute target. */
  withinTarget: boolean;
}

export interface ResponseDistribution {
  buckets: ResponseBucket[];
  answered: number;
  medianSec: number;
  slowestSec: number;
  withinTargetCount: number;
  withinTargetPct: number;
  targetSec: number;
}

const BUCKET_EDGES: { id: string; label: string; fromSec: number; toSec?: number }[] = [
  { id: "under_5", label: "Under 5 minutes", fromSec: 0, toSec: 300 },
  { id: "5_15", label: "5 to 15 minutes", fromSec: 300, toSec: 900 },
  { id: "15_30", label: "15 to 30 minutes", fromSec: 900, toSec: 1800 },
  { id: "30_60", label: "30 to 60 minutes", fromSec: 1800, toSec: 3600 },
  { id: "over_60", label: "Over an hour", fromSec: 3600 },
];

function responseDistribution(): ResponseDistribution {
  const times = ANSWERED_LEADS.map((lead) => lead.firstResponseSec!);

  const buckets = BUCKET_EDGES.map((edge) => {
    const count = times.filter(
      (t) => t >= edge.fromSec && (edge.toSec === undefined || t < edge.toSec),
    ).length;
    return {
      ...edge,
      count,
      share: times.length ? count / times.length : 0,
      // The target line sits exactly on a bucket boundary, so a bucket is
      // either wholly inside it or wholly outside. That is not luck: the edges
      // were chosen from the target rather than from round numbers.
      withinTarget: (edge.toSec ?? Infinity) <= SLA_TARGET_SEC,
    };
  });

  const withinTargetCount = times.filter((t) => t <= SLA_TARGET_SEC).length;

  return {
    buckets,
    answered: times.length,
    medianSec: median(times),
    slowestSec: times.length ? Math.max(...times) : 0,
    withinTargetCount,
    withinTargetPct: times.length ? withinTargetCount / times.length : 0,
    targetSec: SLA_TARGET_SEC,
  };
}

// ---------------------------------------------------------------------------
// Autonomy
// ---------------------------------------------------------------------------

export interface AutonomyPoint {
  date: ISODate;
  rate: number;
}

export interface AutonomyTrend {
  points: AutonomyPoint[];
  current: number;
  /** Where it stood a fortnight ago, which is the comparison worth drawing. */
  fortnightAgo: number;
  deltaPoints: number;
  deskActionsToday: number;
  humanTouchedToday: number;
  /** Plain-language summary of what the humans were pulled in for today. */
  humanReasons: { summary: string; count: number }[];
}

function autonomyTrend(range: AnalyticsRange): AutonomyTrend {
  const all: AutonomyPoint[] = [
    ...AUTONOMY_HISTORY.map((rate, i) => ({ date: AUTONOMY_DAYS[i], rate })),
    { date: demoDate(0), rate: AUTONOMY_RATE },
  ];

  const points = all.slice(-range);
  const fortnightAgo = all[Math.max(0, all.length - 15)].rate;

  // Grouped by the kind of event rather than listed one by one. Eight rows of
  // "approval requested" tells an owner nothing; "3 approvals requested" tells
  // them where the automation keeps stopping.
  const counts = new Map<string, number>();
  for (const event of HUMAN_TOUCHED_TODAY) {
    const key = HUMAN_REASON[event.kind] ?? "Something the rules could not settle";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return {
    points,
    current: AUTONOMY_RATE,
    fortnightAgo,
    deltaPoints: (AUTONOMY_RATE - fortnightAgo) * 100,
    deskActionsToday: DESK_ACTIONS_TODAY.length,
    humanTouchedToday: HUMAN_TOUCHED_TODAY.length,
    humanReasons: [...counts.entries()]
      .map(([summary, count]) => ({ summary, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/** Why a person had to be involved, written as a reason rather than an event name. */
const HUMAN_REASON: Record<string, string> = {
  approval_requested: "A discount went past what the rules allow",
  approval_resolved: "A person signed off an exception",
  message_sent: "A reply the automation would not write",
  stage_changed: "An enquiry moved by hand",
  lead_assigned: "An enquiry handed to a colleague",
  quote_generated: "A quote built with a manual rate",
  booking_created: "A reservation entered at the desk",
  payment_received: "A payment recorded by hand",
  rate_changed: "A rate changed by a person",
};

// ---------------------------------------------------------------------------
// The screen
// ---------------------------------------------------------------------------

export interface AnalyticsView {
  range: AnalyticsRange;
  revenue: RevenueTrend;
  funnel: Funnel;
  channels: ChannelPerformance[];
  response: ResponseDistribution;
  autonomy: AutonomyTrend;
  /** One sentence per panel naming the window it was measured over. */
  windows: {
    revenue: string;
    funnel: string;
    channels: string;
    response: string;
    autonomy: string;
  };
}

export function getAnalytics(range: AnalyticsRange = 30): AnalyticsView {
  const response = responseDistribution();

  return {
    range,
    revenue: revenueTrend(range),
    funnel: funnel(),
    channels: getChannelPerformance(),
    response,
    autonomy: autonomyTrend(range),
    windows: {
      revenue: `Reservations created in the last ${range} days, by the day they were confirmed`,
      funnel: "A fixed cohort of 198 enquiries received over the last 30 days",
      channels: "Enquiries in the live inbox, with revenue from bookings in the last 30 days",
      response: `${response.answered} enquiries in the live inbox that a person has answered`,
      autonomy: `Desk actions over the last ${range} days`,
    },
  };
}
