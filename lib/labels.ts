/**
 * Human strings and semantic intents for every domain enum.
 *
 * Centralised for one reason: a stage called "Quote sent" on the pipeline and
 * "Quoted" in the lead table is the kind of drift that makes an operations
 * product feel untrustworthy. One vocabulary, declared once.
 *
 * `intent` maps onto the Badge component's intents, so colour meaning is
 * consistent too: caution always means "a human should look", critical always
 * means "money or a guest is at risk".
 */

import type {
  BookingStatus,
  ExceptionKind,
  ExceptionSeverity,
  ExceptionStatus,
  FollowUpReason,
  FollowUpStatus,
  GuestSegment,
  LeadPriority,
  LeadSource,
  LeadStage,
  LostReason,
  MealPlan,
  PaymentStatus,
  PricingActionKind,
  PricingConditionSubject,
  PricingOperator,
  RoomStatus,
  TeamRole,
} from "@/types";

export type Intent =
  | "neutral"
  | "brand"
  | "accent"
  | "positive"
  | "caution"
  | "critical"
  | "intel"
  | "outline";

interface Descriptor {
  label: string;
  intent: Intent;
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export const LEAD_STAGE: Record<LeadStage, Descriptor> = {
  new: { label: "New", intent: "accent" },
  contacted: { label: "Contacted", intent: "neutral" },
  qualified: { label: "Qualified", intent: "neutral" },
  quote_sent: { label: "Quote sent", intent: "brand" },
  negotiating: { label: "Negotiating", intent: "caution" },
  payment_pending: { label: "Payment pending", intent: "caution" },
  booked: { label: "Booked", intent: "positive" },
  lost: { label: "Lost", intent: "critical" },
};

/** Pipeline column order (§15). Won and lost sit outside the working board. */
export const LEAD_STAGE_ORDER: LeadStage[] = [
  "new",
  "contacted",
  "qualified",
  "quote_sent",
  "negotiating",
  "payment_pending",
  "booked",
  "lost",
];

export const LEAD_PRIORITY: Record<LeadPriority, Descriptor> = {
  low: { label: "Low", intent: "neutral" },
  normal: { label: "Normal", intent: "neutral" },
  high: { label: "High", intent: "caution" },
  urgent: { label: "Urgent", intent: "critical" },
};

export const LOST_REASON: Record<LostReason, string> = {
  price: "Price",
  no_availability: "No availability",
  no_response: "No response",
  booked_elsewhere: "Booked elsewhere",
  date_change: "Dates changed",
  duplicate: "Duplicate enquiry",
  not_serious: "Not a serious enquiry",
};

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------

export const LEAD_SOURCE: Record<LeadSource, { label: string; short: string }> = {
  whatsapp: { label: "WhatsApp", short: "WA" },
  website: { label: "Website", short: "WB" },
  booking_com: { label: "Booking.com", short: "BC" },
  phone: { label: "Phone", short: "PH" },
  instagram: { label: "Instagram", short: "IG" },
  walk_in: { label: "Walk-in", short: "WI" },
  email: { label: "Email", short: "EM" },
  google_business: { label: "Google Business", short: "GB" },
};

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

/** Desk roles as the property says them, not as the database stores them. */
export const TEAM_ROLE: Record<TeamRole, string> = {
  owner: "Owner",
  manager: "Manager",
  reception: "Reception",
  reservations: "Reservations",
  sales: "Sales",
  accountant: "Accounts",
};

// ---------------------------------------------------------------------------
// Guests
// ---------------------------------------------------------------------------

export const GUEST_SEGMENT: Record<GuestSegment, Descriptor> = {
  new: { label: "New", intent: "neutral" },
  returning: { label: "Returning", intent: "accent" },
  vip: { label: "VIP", intent: "brand" },
  corporate: { label: "Corporate", intent: "neutral" },
  family: { label: "Family", intent: "neutral" },
  long_stay: { label: "Long stay", intent: "neutral" },
  high_value: { label: "High value", intent: "positive" },
  at_risk: { label: "At risk", intent: "critical" },
};

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export const BOOKING_STATUS: Record<BookingStatus, Descriptor> = {
  confirmed: { label: "Confirmed", intent: "positive" },
  pending: { label: "Pending", intent: "caution" },
  checked_in: { label: "Checked in", intent: "brand" },
  checked_out: { label: "Checked out", intent: "neutral" },
  cancelled: { label: "Cancelled", intent: "critical" },
  no_show: { label: "No show", intent: "critical" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, Descriptor> = {
  unpaid: { label: "Unpaid", intent: "critical" },
  advance_paid: { label: "Advance paid", intent: "caution" },
  partially_paid: { label: "Part paid", intent: "caution" },
  paid: { label: "Paid", intent: "positive" },
  refunded: { label: "Refunded", intent: "neutral" },
};

export const MEAL_PLAN: Record<MealPlan, string> = {
  room_only: "Room only",
  breakfast: "Breakfast",
  half_board: "Half board",
  full_board: "Full board",
};

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export const ROOM_STATUS: Record<RoomStatus, Descriptor> = {
  available: { label: "Available", intent: "positive" },
  occupied: { label: "Occupied", intent: "brand" },
  reserved: { label: "Reserved", intent: "accent" },
  held: { label: "Held", intent: "caution" },
  maintenance: { label: "Maintenance", intent: "neutral" },
  departing: { label: "Departing", intent: "caution" },
  arriving: { label: "Arriving", intent: "accent" },
};

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

/**
 * Rule vocabulary, written so a condition reads as a sentence.
 *
 * "Occupancy is at least 85" is a thing a manager can check. The stored form,
 * `{ subject: "occupancy", operator: "gte", value: 85 }`, is not, and a rule
 * builder that shows the second one is a rule builder nobody edits.
 */
export const PRICING_SUBJECT: Record<PricingConditionSubject, string> = {
  occupancy: "Occupancy",
  lead_time_days: "Days to arrival",
  nights: "Nights",
  guest_segment: "Guest segment",
  room_type: "Room type",
  channel: "Channel",
};

export const PRICING_OPERATOR: Record<PricingOperator, string> = {
  lt: "is under",
  lte: "is at most",
  gt: "is over",
  gte: "is at least",
  eq: "is",
  between: "is between",
  in: "is one of",
};

export const PRICING_ACTION: Record<PricingActionKind, Descriptor> = {
  allow_discount_up_to: { label: "Allow up to", intent: "brand" },
  add_discount: { label: "Apply automatically", intent: "accent" },
  require_approval: { label: "Needs approval", intent: "caution" },
  block: { label: "No discount", intent: "critical" },
};

// ---------------------------------------------------------------------------
// Follow-ups & exceptions
// ---------------------------------------------------------------------------

/**
 * Why a touchpoint exists, phrased as the job rather than the trigger. An
 * operator scanning the queue needs to know what to do, and "Quote chase"
 * says that where "Quote sent" only restates history.
 */
export const FOLLOW_UP_REASON: Record<FollowUpReason, string> = {
  no_reply: "No reply",
  quote_sent: "Quote chase",
  payment_pending: "Payment due",
  post_stay: "Post stay",
  date_confirmation: "Confirm dates",
  upsell: "Upsell",
};

export const FOLLOW_UP_STATUS: Record<FollowUpStatus, Descriptor> = {
  pending: { label: "Pending", intent: "neutral" },
  done: { label: "Done", intent: "positive" },
  snoozed: { label: "Snoozed", intent: "neutral" },
  overdue: { label: "Overdue", intent: "critical" },
};

export const EXCEPTION_KIND: Record<ExceptionKind, string> = {
  pricing: "Pricing",
  vip: "VIP",
  complaint: "Complaint",
  refund: "Refund",
  policy: "Policy",
  operational: "Operational",
};

export const EXCEPTION_SEVERITY: Record<ExceptionSeverity, Descriptor> = {
  low: { label: "Low", intent: "neutral" },
  medium: { label: "Medium", intent: "caution" },
  high: { label: "High", intent: "critical" },
  critical: { label: "Critical", intent: "critical" },
};

export const EXCEPTION_STATUS: Record<ExceptionStatus, Descriptor> = {
  open: { label: "Open", intent: "caution" },
  approved: { label: "Approved", intent: "positive" },
  rejected: { label: "Rejected", intent: "critical" },
  modified: { label: "Modified", intent: "brand" },
  assigned: { label: "Assigned", intent: "neutral" },
};

export const DATE_RANGE_LABEL = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
} as const;
