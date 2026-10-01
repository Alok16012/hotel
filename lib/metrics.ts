/**
 * Derived figures for the Command Center (§9, §21).
 *
 * Nothing in this file is a written-down result. Every number is computed from
 * the seed arrays in `data/`, so editing a lead or a booking moves the
 * dashboard instead of leaving it confidently wrong. The six preceding days of
 * history come from `data/trends.ts`; today's point is computed here and
 * appended, which is why the last step of a sparkline is always the same value
 * as the headline above it.
 *
 * When a backend arrives these become SQL. The shapes they return do not
 * change, so no component that reads them changes either.
 */

import { BOOKINGS, ARRIVALS_TODAY, DEPARTURES_TODAY, IN_HOUSE } from "@/data/bookings";
import { CONVERSATIONS, CONVERSATION_BY_LEAD } from "@/data/conversations";
import { AUTONOMY_RATE, DESK_ACTIONS_TODAY } from "@/data/events";
import { OPEN_EXCEPTIONS } from "@/data/exceptions";
import { FOLLOW_UPS } from "@/data/followups";
import { GUEST_BY_ID } from "@/data/guests";
import { LEADS } from "@/data/leads";
import { OCCUPANCY_TONIGHT, SELLABLE_ROOMS } from "@/data/rooms";
import { TEAM_BY_ID } from "@/data/team";
import {
  CONVERSION_COHORT,
  CONVERSION_HISTORY,
  NEW_ENQUIRIES_HISTORY,
  OCCUPANCY_HISTORY,
  PIPELINE_HISTORY,
  RESPONSE_TIME_HISTORY,
} from "@/data/trends";
import { DEMO_NOW, demoDate, demoDayOf, isDemoToday } from "@/lib/clock";
import { formatDuration, formatINRCompact, formatPct } from "@/lib/format";
import { LEAD_SOURCE, LEAD_STAGE, LEAD_STAGE_ORDER } from "@/lib/labels";
import type {
  ChannelPerformance,
  DashboardMetric,
  Lead,
  LeadSource,
  Paise,
  PipelineStageSummary,
  ResponsePerformance,
  RevenueOpportunity,
  RevenueOpportunityRow,
  TrendDirection,
} from "@/types";

// ---------------------------------------------------------------------------
// Policy constants
// ---------------------------------------------------------------------------

/**
 * The desk runs two response clocks, and conflating them is the easiest way to
 * make a dashboard lie.
 *
 * The first is acknowledgement: where automation gets there first, something
 * goes back to the guest inside a minute, so nobody is left staring at an
 * unanswered message. Measuring the desk on that clock would flatter it.
 *
 * The second is the one below: thirty minutes for a reply a person actually
 * wrote. It is what `firstResponseSec` records, and it is the line a breach is
 * drawn against.
 */
export const SLA_TARGET_SEC = 30 * 60;

/** An enquiry unanswered for longer than this is escalated on the dashboard. */
export const LONG_WAIT_SEC = 3600;

/** A quote older than this with no reply is treated as going cold. */
const STALE_QUOTE_SEC = 24 * 3600;

const NOW_MS = DEMO_NOW.getTime();

// ---------------------------------------------------------------------------
// Small pure helpers
// ---------------------------------------------------------------------------

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function secondsSince(iso: string): number {
  return Math.max(0, Math.round((NOW_MS - new Date(iso).getTime()) / 1000));
}

/**
 * Percentage change, guarded against a zero baseline.
 *
 * Returning undefined rather than Infinity matters: the metric card renders no
 * delta at all in that case, which is honest, instead of an arrow claiming an
 * infinite improvement.
 */
function deltaPct(current: number, previous: number): number | undefined {
  if (!previous) return undefined;
  return ((current - previous) / previous) * 100;
}

/** Below this the movement is noise, not a trend worth drawing an arrow for. */
const FLAT_BAND_PCT = 1;

function direction(delta: number | undefined): TrendDirection {
  if (delta === undefined || Math.abs(delta) < FLAT_BAND_PCT) return "flat";
  return delta > 0 ? "up" : "down";
}

/**
 * How a movement should be coloured.
 *
 * A metric knows which way is good; response time falling is a win and
 * occupancy falling is not. Colour is decided here once so no card has to
 * remember its own polarity.
 */
function intentFor(
  trend: TrendDirection,
  positive: TrendDirection,
  severity: "caution" | "critical" = "caution",
): DashboardMetric["intent"] {
  if (trend === "flat") return "neutral";
  return trend === positive ? "positive" : severity;
}

// ---------------------------------------------------------------------------
// Lead slices
// ---------------------------------------------------------------------------

export const OPEN_LEADS = LEADS.filter((l) => l.stage !== "booked" && l.stage !== "lost");
export const LEADS_TODAY = LEADS.filter((l) => isDemoToday(l.createdAt));
export const ANSWERED_LEADS = LEADS.filter((l) => l.firstResponseSec !== undefined);

/**
 * How long the guest has been waiting on a message nobody has answered.
 *
 * Read off the transcript rather than stored on the lead, because a stored flag
 * is a claim and a transcript is evidence. Internal notes are skipped: a
 * colleague writing "call him back" is not a reply the guest can see, and
 * letting it stop the clock is precisely how a desk convinces itself it is
 * keeping up.
 */
export function waitingOnUsSec(leadId: string): number {
  const thread = CONVERSATION_BY_LEAD[leadId];
  if (!thread) return 0;
  const visible = thread.messages.filter((m) => m.authorKind !== "internal_note");
  const last = visible.at(-1);
  return last && last.authorKind === "guest" ? secondsSince(last.sentAt) : 0;
}

/**
 * How long a guest message has sat with nobody on the desk attending to it.
 *
 * The difference from `waitingOnUsSec` is the internal note, and the difference
 * matters. A note written after the guest's message means a colleague has read
 * it, formed a view and is chasing something before answering: the guest is
 * still waiting, but the enquiry is not abandoned. Only the second case is a
 * breach, otherwise every lead that needs a rate from ops before it can be
 * answered honestly would be reported as neglect.
 */
export function unattendedSec(leadId: string): number {
  const waiting = waitingOnUsSec(leadId);
  if (waiting === 0) return 0;
  const messages = CONVERSATION_BY_LEAD[leadId]?.messages ?? [];
  const lastGuestAt = messages.filter((m) => m.authorKind === "guest").at(-1)?.sentAt;
  const attended = messages.some(
    (m) => m.authorKind !== "guest" && lastGuestAt !== undefined && m.sentAt > lastGuestAt,
  );
  return attended ? 0 : waiting;
}

/** Leads with a guest message sitting unanswered right now. */
export const AWAITING_REPLY = OPEN_LEADS.filter((l) => waitingOnUsSec(l.id) > 0);

/** Of those, the ones nobody has touched since, past the thirty-minute line. */
export const BREACHED_LEADS = OPEN_LEADS.filter((l) => unattendedSec(l.id) > SLA_TARGET_SEC);

/**
 * Threads where the first thing back to the guest was written by the machine,
 * and how long it took.
 *
 * An acknowledgement is specifically the automated turn that lands *before* a
 * colleague gets there. Timing the first reply of any kind, which is the
 * obvious implementation, quietly measures the desk instead: a thread a person
 * answered in an hour would be filed as an hour-slow acknowledgement, and the
 * two clocks this file exists to keep apart would be back to one.
 *
 * The count travels with the median because coverage is the honest part of the
 * story. Automation does not reach every thread, and a median printed without
 * it would imply that it does.
 */
function acknowledgements(): { medianSec: number; count: number; threads: number } {
  const times: number[] = [];

  for (const thread of CONVERSATIONS) {
    const firstGuest = thread.messages.find((m) => m.authorKind === "guest");
    if (!firstGuest) continue;

    const firstReply = thread.messages.find(
      (m) =>
        m.sentAt > firstGuest.sentAt &&
        m.authorKind !== "guest" &&
        m.authorKind !== "internal_note",
    );
    if (!firstReply?.isAutomated) continue;

    times.push(
      Math.round(
        (new Date(firstReply.sentAt).getTime() - new Date(firstGuest.sentAt).getTime()) / 1000,
      ),
    );
  }

  return { medianSec: median(times), count: times.length, threads: CONVERSATIONS.length };
}

/** What a lead is worth: the quoted number once one exists, the estimate before. */
export function leadValue(lead: Lead): Paise {
  return lead.commercials.quotedValue ?? lead.commercials.estimatedValue;
}

export const OPEN_PIPELINE_VALUE = sum(OPEN_LEADS.map(leadValue));

// ---------------------------------------------------------------------------
// Booking slices
// ---------------------------------------------------------------------------

const LIVE_BOOKINGS = BOOKINGS.filter((b) => b.status !== "cancelled");

/** Confirmed revenue created on a given calendar day at the property. */
function bookedOn(date: string): { value: Paise; count: number } {
  const day = LIVE_BOOKINGS.filter((b) => demoDayOf(b.createdAt) === date);
  return { value: sum(day.map((b) => b.total)), count: day.length };
}

/**
 * Daily confirmed revenue for a window ending today, oldest first.
 *
 * `offsetDays` of 0 ends on the demo day. This is recovered from the booking
 * table rather than seeded, because unlike the lead inbox the booking table
 * really does keep everything it has ever held.
 */
export function revenueSeries(
  days: number,
  endOffset = 0,
): { date: string; value: Paise; count: number }[] {
  return Array.from({ length: days }, (_, i) => {
    const date = demoDate(endOffset - (days - 1 - i));
    return { date, ...bookedOn(date) };
  });
}

// ---------------------------------------------------------------------------
// The KPI strip
// ---------------------------------------------------------------------------

export function getDashboardMetrics(): DashboardMetric[] {
  // --- New enquiries -------------------------------------------------------
  const enquiriesToday = LEADS_TODAY.length;
  const waitingToday = LEADS_TODAY.filter((l) => waitingOnUsSec(l.id) > 0).length;
  const enquiryDelta = deltaPct(enquiriesToday, NEW_ENQUIRIES_HISTORY.at(-1)!);

  // --- Response time -------------------------------------------------------
  const responseSec = median(ANSWERED_LEADS.map((l) => l.firstResponseSec!));
  const lateCount = ANSWERED_LEADS.filter((l) => l.firstResponseSec! > SLA_TARGET_SEC).length;
  const responseDelta = deltaPct(responseSec, RESPONSE_TIME_HISTORY.at(-1)!);

  // --- Conversion ----------------------------------------------------------
  const conversion = CONVERSION_COHORT.booked / CONVERSION_COHORT.enquiries;
  const conversionDelta = deltaPct(conversion, CONVERSION_HISTORY.at(-1)!);

  // --- Revenue booked ------------------------------------------------------
  const thisWeek = revenueSeries(7);
  const lastWeek = revenueSeries(7, -7);
  const weekValue = sum(thisWeek.map((d) => d.value));
  const weekCount = sum(thisWeek.map((d) => d.count));
  const revenueDelta = deltaPct(weekValue, sum(lastWeek.map((d) => d.value)));

  // --- Occupancy -----------------------------------------------------------
  const occupancy = OCCUPANCY_TONIGHT / SELLABLE_ROOMS;
  const occupancyDelta = deltaPct(occupancy, OCCUPANCY_HISTORY.at(-1)!);

  // --- Pipeline ------------------------------------------------------------
  const pipelineDelta = deltaPct(OPEN_PIPELINE_VALUE, PIPELINE_HISTORY.at(-1)!);
  const awaitingReply = AWAITING_REPLY.length;

  return [
    {
      id: "new_enquiries",
      label: "New enquiries",
      value: String(enquiriesToday),
      rawValue: enquiriesToday,
      secondary:
        waitingToday > 0
          ? `${waitingToday} with a message nobody has answered yet`
          : "Every one has been answered",

      deltaPct: enquiryDelta,
      comparison: "yesterday at this hour",
      trend: direction(enquiryDelta),
      positiveDirection: "up",
      sparkline: [...NEW_ENQUIRIES_HISTORY, enquiriesToday],
      intent: waitingToday > 0 ? "caution" : "positive",
      href: "/leads",
    },
    {
      id: "response_time",
      label: "Median first response",
      value: formatDuration(responseSec),
      rawValue: responseSec,
      secondary: `Written by a person · ${lateCount} of ${ANSWERED_LEADS.length} past the ${formatDuration(SLA_TARGET_SEC)} target`,
      deltaPct: responseDelta,
      comparison: "yesterday",
      trend: direction(responseDelta),
      positiveDirection: "down",
      // Inverted on purpose: the sparkline reads "lower is better", so a
      // descending line is a desk getting quicker.
      sparkline: [...RESPONSE_TIME_HISTORY, responseSec],
      intent: intentFor(direction(responseDelta), "down"),
      href: "/leads",
    },
    {
      id: "conversion",
      label: "Enquiry to booking",
      value: formatPct(conversion),
      rawValue: conversion,
      secondary: `${CONVERSION_COHORT.booked} of ${CONVERSION_COHORT.enquiries} enquiries, 30 days`,
      deltaPct: conversionDelta,
      // The headline is a 30-day rolling rate, so the delta is that same rolling
      // window as it stood yesterday. Not 30 days against the 30 before them.
      comparison: "yesterday",
      trend: direction(conversionDelta),
      positiveDirection: "up",
      sparkline: [...CONVERSION_HISTORY, conversion],
      intent: intentFor(direction(conversionDelta), "up"),
      href: "/analytics",
    },
    {
      id: "revenue_booked",
      label: "Revenue booked",
      value: formatINRCompact(weekValue),
      rawValue: weekValue,
      secondary: `${weekCount} reservations confirmed in 7 days`,
      deltaPct: revenueDelta,
      comparison: "the 7 days before",
      trend: direction(revenueDelta),
      positiveDirection: "up",
      sparkline: thisWeek.map((d) => d.value),
      intent: intentFor(direction(revenueDelta), "up", "critical"),
      href: "/bookings",
    },
    {
      id: "occupancy",
      label: "Occupancy tonight",
      value: formatPct(occupancy, 0),
      rawValue: occupancy,
      secondary: `${OCCUPANCY_TONIGHT} of ${SELLABLE_ROOMS} sellable rooms · ${ARRIVALS_TODAY.length} arrivals due`,
      deltaPct: occupancyDelta,
      comparison: "last night",
      trend: direction(occupancyDelta),
      positiveDirection: "up",
      sparkline: [...OCCUPANCY_HISTORY, occupancy],
      intent: intentFor(direction(occupancyDelta), "up"),
      href: "/inventory",
    },
    {
      id: "pipeline",
      label: "Open pipeline",
      value: formatINRCompact(OPEN_PIPELINE_VALUE),
      rawValue: OPEN_PIPELINE_VALUE,
      secondary: `${OPEN_LEADS.length} live enquiries · ${awaitingReply} awaiting a reply`,
      deltaPct: pipelineDelta,
      comparison: "yesterday",
      trend: direction(pipelineDelta),
      positiveDirection: "up",
      sparkline: [...PIPELINE_HISTORY, OPEN_PIPELINE_VALUE],
      // A growing pipeline is only good news if it is being worked. Colour it
      // neutral and let the second line carry the warning.
      intent: "intel",
      href: "/pipeline",
    },
  ];
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export function getPipelineSummary(): PipelineStageSummary[] {
  return LEAD_STAGE_ORDER.map((stage) => {
    const inStage = LEADS.filter((l) => l.stage === stage);
    return {
      stage,
      label: LEAD_STAGE[stage].label,
      count: inStage.length,
      value: sum(inStage.map(leadValue)),
    };
  });
}

// ---------------------------------------------------------------------------
// Channel mix
// ---------------------------------------------------------------------------

/**
 * Where enquiries come from, how fast each channel gets answered, and what each
 * earns.
 *
 * Revenue is taken from bookings rather than from converted leads, because two
 * of the property's channels barely produce leads at all: an OTA reservation
 * and a walk-in arrive already sold. Attributing their money to the enquiry
 * funnel would flatter the funnel and hide where the business actually comes
 * from.
 */
export function getChannelPerformance(): ChannelPerformance[] {
  const windowStart = demoDate(-29);

  return (Object.keys(LEAD_SOURCE) as LeadSource[])
    .map((source) => {
      const leads = LEADS.filter((l) => l.source === source);
      const answered = leads.filter((l) => l.firstResponseSec !== undefined);
      const converted = leads.filter((l) => l.stage === "booked");
      const revenue = sum(
        LIVE_BOOKINGS.filter(
          (b) => b.source === source && demoDayOf(b.createdAt) >= windowStart,
        ).map((b) => b.total),
      );

      return {
        source,
        leads: leads.length,
        converted: converted.length,
        conversionRate: leads.length ? converted.length / leads.length : 0,
        revenue,
        medianResponseSec: median(answered.map((l) => l.firstResponseSec!)),
      };
    })
    .sort((a, b) => b.leads - a.leads || b.revenue - a.revenue);
}

// ---------------------------------------------------------------------------
// Response performance
// ---------------------------------------------------------------------------

export function getResponsePerformance(): ResponsePerformance {
  const all = ANSWERED_LEADS.map((l) => l.firstResponseSec!);
  const withinSla = all.filter((s) => s <= SLA_TARGET_SEC).length;

  const memberIds = [...new Set(LEADS.map((l) => l.assigneeId).filter(Boolean))] as string[];

  const byMember = memberIds
    .map((memberId) => {
      const mine = LEADS.filter((l) => l.assigneeId === memberId && l.firstResponseSec !== undefined);
      const times = mine.map((l) => l.firstResponseSec!);
      return {
        memberId,
        name: TEAM_BY_ID[memberId]?.name ?? "Unassigned",
        medianResponseSec: median(times),
        withinSlaPct: times.length ? times.filter((s) => s <= SLA_TARGET_SEC).length / times.length : 0,
        handled: times.length,
      };
    })
    .filter((m) => m.handled > 0)
    .sort((a, b) => a.medianResponseSec - b.medianResponseSec);

  const ack = acknowledgements();

  return {
    medianFirstResponseSec: median(all),
    medianAcknowledgementSec: ack.medianSec,
    acknowledgedThreads: ack.count,
    threadsWithGuestMessages: ack.threads,
    withinSlaPct: all.length ? withinSla / all.length : 0,
    longWaitingCount: OPEN_LEADS.filter((l) => waitingOnUsSec(l.id) > LONG_WAIT_SEC).length,
    byMember,
  };
}

// ---------------------------------------------------------------------------
// Revenue at risk
// ---------------------------------------------------------------------------

/**
 * Open enquiries ranked by what is on the table and how long it has been there.
 *
 * This is the list the §9 dashboard leads with, because it is the only panel
 * that answers "what should I do in the next ten minutes" with money attached.
 * A lead qualifies for exactly one reason; the checks run in severity order so
 * an unanswered enquiry is never filed under the milder heading of a stale
 * quote.
 */
export function getRevenueOpportunity(): RevenueOpportunity {
  const rows: RevenueOpportunityRow[] = [];

  for (const lead of OPEN_LEADS) {
    const guestName = GUEST_BY_ID[lead.guestId]?.name ?? "Guest";
    const waitingSec = secondsSince(lead.lastActivityAt);
    const base = {
      leadId: lead.id,
      reference: lead.reference,
      guestName,
      value: leadValue(lead),
      waitingSec,
      priority: lead.priority,
    };

    const unattended = unattendedSec(lead.id);
    if (unattended > SLA_TARGET_SEC) {
      rows.push({
        ...base,
        reason: "sla_breach",
        detail: `Guest message unanswered for ${formatDuration(unattended)}`,
      });
      continue;
    }

    // Picked up by a colleague but still not answered. Not neglect, and for that
    // reason easy to lose sight of: the lead looks handled on every queue that
    // counts touches, while the guest goes on waiting for the actual answer.
    const waitingOnUs = waitingOnUsSec(lead.id);
    if (waitingOnUs > LONG_WAIT_SEC) {
      rows.push({
        ...base,
        reason: "reply_pending",
        detail: `Picked up but unanswered, guest waiting ${formatDuration(waitingOnUs)}`,
      });
      continue;
    }

    if (lead.commercials.paymentStatus === "unpaid" && lead.stage === "payment_pending") {
      rows.push({
        ...base,
        reason: "payment_overdue",
        detail: "Room is held against an advance that has not arrived",
      });
      continue;
    }

    if (lead.stage === "quote_sent" && waitingSec > STALE_QUOTE_SEC) {
      rows.push({
        ...base,
        reason: "quote_stale",
        detail: `Quote sent ${formatDuration(waitingSec)} ago with no response`,
      });
      continue;
    }

    if (lead.stage === "negotiating" && waitingSec > STALE_QUOTE_SEC) {
      rows.push({
        ...base,
        reason: "negotiation_stalled",
        detail: `Negotiation has been quiet for ${formatDuration(waitingSec)}`,
      });
    }
  }

  rows.sort((a, b) => b.value - a.value || b.waitingSec - a.waitingSec);

  const weekStart = demoDate(-6);
  const lostThisWeek = LEADS.filter(
    (l) => l.stage === "lost" && demoDayOf(l.lastActivityAt) >= weekStart,
  );

  return {
    totalAtRisk: sum(rows.map((r) => r.value)),
    rows,
    lostThisWeekValue: sum(lostThisWeek.map(leadValue)),
    lostThisWeekCount: lostThisWeek.length,
  };
}

// ---------------------------------------------------------------------------
// Counters the shell reads
// ---------------------------------------------------------------------------

/** Follow-ups a person is expected to act on right now. */
export const DUE_FOLLOW_UPS = FOLLOW_UPS.filter(
  (f) => f.status === "overdue" || (f.status === "pending" && f.dueAt <= DEMO_NOW.toISOString()),
);

export const LEADS_NEEDING_REPLY = LEADS.filter((l) => l.unreadCount > 0).length;

export const TODAY_SUMMARY = {
  arrivals: ARRIVALS_TODAY.length,
  departures: DEPARTURES_TODAY.length,
  inHouse: IN_HOUSE.length,
  openExceptions: OPEN_EXCEPTIONS.length,
  deskActions: DESK_ACTIONS_TODAY.length,
  autonomyRate: AUTONOMY_RATE,
};
