/**
 * Repository layer — the single seam between UI and data.
 *
 * Every component reads through these functions instead of importing from
 * `data/` directly. Today they return seeded constants synchronously. When a
 * real backend lands, each function becomes an async query against Supabase
 * and the call sites change from `getX()` to `await getX()` — no component
 * markup, props, or types change.
 *
 * Aggregates are not computed here. They live in `lib/metrics.ts`, which reads
 * the same seed arrays and is the only place a headline number is derived;
 * this file just forwards them so components keep a single import.
 */

import {
  ARRIVALS_TODAY,
  BOOKINGS,
  BOOKING_BY_ID,
  DEPARTURES_TODAY,
  IN_HOUSE,
} from "@/data/bookings";
import { CONVERSATIONS, CONVERSATION_BY_ID, CONVERSATION_BY_LEAD } from "@/data/conversations";
import { EVENTS, EVENTS_TODAY } from "@/data/events";
import { EXCEPTIONS, EXCEPTION_BY_ID, OPEN_EXCEPTIONS } from "@/data/exceptions";
import { FOLLOW_UPS, FOLLOW_UP_BY_ID } from "@/data/followups";
import { ALL_GUESTS, GUEST_BY_ID } from "@/data/guests";
import { HOTEL, PROPERTIES, ROOM_TYPES, ROOM_TYPE_BY_ID } from "@/data/hotel";
import { LEADS, LEAD_BY_ID } from "@/data/leads";
import { INVENTORY_BLOCKS } from "@/data/inventory";
import { DISCOUNT_AUTHORITY, PRICING_RULES } from "@/data/pricing";
import { ROOMS } from "@/data/rooms";
import { CURRENT_USER, TEAM, TEAM_BY_ID } from "@/data/team";
import { getAnalytics } from "@/lib/analytics";
import {
  FORECAST_DAYS,
  getFloorMap,
  getInventoryMatrix,
  getRateCalendar,
} from "@/lib/availability";
import {
  cancellationStanding,
  dayBookRange,
  getBookingRow,
  getBookingRows,
  getBookingsForGuest,
  getDayBook,
  summariseLedger,
} from "@/lib/bookings";
import {
  getExceptionRows as getExceptionRowsFromSeed,
  type ExceptionRow,
} from "@/lib/exceptions";
import { getFollowUpRows } from "@/lib/followups";
import {
  getGuestProfile,
  getGuestRows,
  likelihoodLabel,
  nextStayLikelihood,
  summariseDirectory,
} from "@/lib/guests";
import { getLeadDetail, getLeadDetails, getLeadRows } from "@/lib/leads";
import { evaluateRules, simulateQuote } from "@/lib/pricing";
import {
  DUE_FOLLOW_UPS,
  LEADS_NEEDING_REPLY,
  getChannelPerformance,
  getDashboardMetrics,
  getPipelineSummary,
  getResponsePerformance,
  getRevenueOpportunity,
} from "@/lib/metrics";
import { getIntegrationsView } from "@/lib/integrations";
import { getReportsView } from "@/lib/reports";
import { getSettingsView } from "@/lib/settings";
import { getTeamView } from "@/lib/team";
import { AUTONOMY_RATE, DESK_ACTIONS_TODAY } from "@/data/events";
import { CANCELLATION_POLICY, STAY_POLICY } from "@/data/policies";
import { AUTOMATION_RULES } from "@/data/settings";
import type {
  AutomationMode,
  Booking,
  CancellationPolicy,
  Conversation,
  DiscountAuthority,
  EventRecord,
  ExceptionItem,
  FollowUp,
  Guest,
  Hotel,
  InventoryBlock,
  Lead,
  PricingRule,
  Room,
  RoomType,
  StayPolicy,
  TeamMember,
} from "@/types";

// ---------------------------------------------------------------------------
// Property
// ---------------------------------------------------------------------------

export function getHotel(id?: string): Hotel {
  if (!id) return HOTEL;
  return PROPERTIES.find((p) => p.id === id) ?? HOTEL;
}

export function getProperties(): Hotel[] {
  return PROPERTIES;
}

export function getRoomTypes(): RoomType[] {
  return ROOM_TYPES;
}

export function getRoomType(id: string): RoomType | undefined {
  return ROOM_TYPE_BY_ID[id];
}

export function getRooms(): Room[] {
  return ROOMS;
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export function getTeam(): TeamMember[] {
  return TEAM;
}

export function getTeamMember(id: string): TeamMember | undefined {
  return TEAM_BY_ID[id];
}

export function getCurrentUser(): TeamMember {
  return CURRENT_USER;
}

export function getGuests(): Guest[] {
  return ALL_GUESTS;
}

export function getGuest(id: string): Guest | undefined {
  return GUEST_BY_ID[id];
}

// ---------------------------------------------------------------------------
// Leads and conversations
// ---------------------------------------------------------------------------

export function getLeads(): Lead[] {
  return LEADS;
}

export function getLead(id: string): Lead | undefined {
  return LEAD_BY_ID[id];
}

export function getConversations(): Conversation[] {
  return CONVERSATIONS;
}

export function getConversation(id: string): Conversation | undefined {
  return CONVERSATION_BY_ID[id];
}

/** The thread attached to a lead, if that lead was ever written to. */
export function getConversationForLead(leadId: string): Conversation | undefined {
  return CONVERSATION_BY_LEAD[leadId];
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export function getBookings(): Booking[] {
  return BOOKINGS;
}

export function getBooking(id: string): Booking | undefined {
  return BOOKING_BY_ID[id];
}

export function getArrivalsToday(): Booking[] {
  return ARRIVALS_TODAY;
}

export function getDeparturesToday(): Booking[] {
  return DEPARTURES_TODAY;
}

export function getInHouse(): Booking[] {
  return IN_HOUSE;
}

// ---------------------------------------------------------------------------
// Work queues
// ---------------------------------------------------------------------------

export function getFollowUps(): FollowUp[] {
  return FOLLOW_UPS;
}

export function getFollowUp(id: string): FollowUp | undefined {
  return FOLLOW_UP_BY_ID[id];
}

/** Follow-ups a person is expected to act on before the day moves on. */
export function getDueFollowUps(): FollowUp[] {
  return DUE_FOLLOW_UPS;
}

export function getExceptions(): ExceptionItem[] {
  return EXCEPTIONS;
}

export function getException(id: string): ExceptionItem | undefined {
  return EXCEPTION_BY_ID[id];
}

export function getOpenExceptions(): ExceptionItem[] {
  return OPEN_EXCEPTIONS;
}

/**
 * Exceptions joined to the guest, enquiry and booking behind each one (§20).
 *
 * The queue totals are deliberately not computed here. Unlike every other
 * headline figure in the product, they have to move the moment a decision is
 * taken on screen, so they are derived from the patched rows in
 * `components/exceptions/model.ts` rather than from the seed.
 */
export function getExceptionRows(): ExceptionRow[] {
  return getExceptionRowsFromSeed();
}

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

export function getEvents(limit?: number): EventRecord[] {
  return limit ? EVENTS.slice(0, limit) : EVENTS;
}

export function getEventsToday(limit?: number): EventRecord[] {
  return limit ? EVENTS_TODAY.slice(0, limit) : EVENTS_TODAY;
}

// ---------------------------------------------------------------------------
// Inventory and rates
// ---------------------------------------------------------------------------

export function getInventoryBlocks(): InventoryBlock[] {
  return INVENTORY_BLOCKS;
}

export function getPricingRules(): PricingRule[] {
  return [...PRICING_RULES].sort((a, b) => a.priority - b.priority);
}

export function getDiscountAuthority(): DiscountAuthority[] {
  return DISCOUNT_AUTHORITY;
}

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

/** The cancellation ladder, read by the booking drawer and by settings (§37). */
export function getCancellationPolicy(): CancellationPolicy {
  return CANCELLATION_POLICY;
}

export function getStayPolicy(): StayPolicy {
  return STAY_POLICY;
}

/**
 * Availability and pricing are derived in `lib/availability.ts` and
 * `lib/pricing.ts` and forwarded here, so the matrix, the floor map, the rate
 * card and the quote simulator all answer from one calculation.
 */
export {
  FORECAST_DAYS,
  evaluateRules,
  getFloorMap,
  getInventoryMatrix,
  getRateCalendar,
  simulateQuote,
};

// ---------------------------------------------------------------------------
// Aggregates (forwarded from lib/metrics.ts)
// ---------------------------------------------------------------------------

export {
  getChannelPerformance,
  getDashboardMetrics,
  getPipelineSummary,
  getResponsePerformance,
  getRevenueOpportunity,
};

// ---------------------------------------------------------------------------
// View models (forwarded from lib/leads.ts)
// ---------------------------------------------------------------------------

/**
 * Shaped records for the lead workspace. They exist because that screen is a
 * client component and cannot import from `data/`; when the backend lands these
 * become two queries rather than a map over an array in memory.
 */
export { getLeadDetail, getLeadDetails, getLeadRows };

/** The same arrangement for the follow-up queue, which is a client surface too. */
export { getFollowUpRows };

/**
 * The guest directory, the guest profile and the booking ledger.
 *
 * `cancellationStanding` is forwarded alongside them because the booking drawer
 * needs to answer "what does cancelling cost" against the same policy data the
 * settings screen will eventually edit, not against a sentence typed into a
 * component.
 */
export {
  cancellationStanding,
  dayBookRange,
  getBookingRow,
  getBookingRows,
  getBookingsForGuest,
  getDayBook,
  getGuestProfile,
  getGuestRows,
  likelihoodLabel,
  nextStayLikelihood,
  summariseDirectory,
  summariseLedger,
};

/**
 * The five panels of /analytics, each with the window it was measured over.
 *
 * Forwarded whole rather than panel by panel: a caller that takes the funnel
 * without the sentence naming its cohort has taken half the answer.
 */
export { getAnalytics };

/**
 * The desk: directory rows, the summary above them, and the two rule sets.
 *
 * Also forwarded whole. The live workload counts and the trailing performance
 * figures are different windows, and a caller taking one without the other
 * would be free to present them as the same measurement.
 */
export { getTeamView };

/**
 * The connection cards, grouped, with the seeded evidence behind each state.
 *
 * This is the one screen where a partial forward would be actively harmful: a
 * caller taking the cards without the counts could render a connection state
 * with nothing to substantiate it.
 */
export { getIntegrationsView };

/**
 * The report library, every period already rendered.
 *
 * Whole again, and for the same reason as the others: a sheet is only
 * readable alongside the sentence saying what it was counted from, and the
 * period it covers is part of the figure rather than a caption beside it.
 */
export { getReportsView };

/**
 * The property's standing configuration, with what it has produced beside it.
 *
 * Forwarded whole for the reason the rest are: a response target read without
 * the median underneath it is an intention, and this screen exists so the two
 * are read together.
 */
export { getSettingsView };

// ---------------------------------------------------------------------------
// Shell counters
// ---------------------------------------------------------------------------

/**
 * Counts rendered as sidebar badges. Derived rather than written down, so the
 * sidebar, the Command Center KPI strip and the Exception Center cannot drift
 * apart as the seed data changes.
 */
export interface NavCounts {
  leadsNeedingReply: number;
  followUpsDue: number;
  openExceptions: number;
}

export function getNavCounts(): NavCounts {
  return {
    leadsNeedingReply: LEADS_NEEDING_REPLY,
    followUpsDue: DUE_FOLLOW_UPS.length,
    openExceptions: OPEN_EXCEPTIONS.length,
  };
}

/** Automation health shown in the topbar. */
export interface AutomationStatus {
  state: "active" | "degraded" | "paused";
  /** Share of routine enquiries handled with no human touch (§21). */
  autonomyRate: number;
  handledToday: number;
}

/**
 * One automation rule's seeded mode.
 *
 * The follow-up queue needs the chase limit, which is a function of this, and
 * the queue is a client component that must not reach into `data/`. Any change
 * a person has made in this tab sits on top of it in `lib/session.ts`.
 */
export function getAutomationMode(ruleId: string): AutomationMode {
  // An unknown rule is not a licence to send anything unattended.
  return AUTOMATION_RULES.find((rule) => rule.id === ruleId)?.mode ?? "human";
}

/**
 * The autonomy figure is the product's central claim, so it is counted rather
 * than asserted: every action the desk took today, divided into the ones that
 * finished without a person and the ones that did not. Guests writing in are
 * excluded from the denominator, because an inbound message is a stimulus, not
 * work the desk performed.
 */
export function getAutomationStatus(): AutomationStatus {
  return {
    state: "active",
    autonomyRate: AUTONOMY_RATE,
    handledToday: DESK_ACTIONS_TODAY.length,
  };
}
