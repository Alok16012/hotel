/**
 * HOTEL OS CRM — domain model.
 *
 * These types are the contract between the mock data layer and the UI.
 * When a real backend arrives, only `data/` and the repository functions in
 * `lib/repository.ts` change; every component keeps compiling untouched.
 *
 * Money is stored as INTEGER PAISE (1 rupee = 100 paise) so that arithmetic
 * never accumulates float error. Format at the edge with `formatINR`.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Integer paise. 1850000 = ₹18,500.00 */
export type Paise = number;

/** ISO 8601 timestamp. */
export type ISODateTime = string;

/** ISO calendar date, `YYYY-MM-DD`, no timezone. */
export type ISODate = string;

export type ID = string;

// ---------------------------------------------------------------------------
// Property & inventory
// ---------------------------------------------------------------------------

export interface Hotel {
  id: ID;
  name: string;
  city: string;
  state: string;
  country: string;
  timezone: string;
  currency: "INR";
  starRating: number;
  checkInTime: string;
  checkOutTime: string;
  totalRooms: number;
  floors: number;
  gstin: string;
}

export type RoomTypeCode = "deluxe" | "premium" | "executive" | "suite";

export interface RoomType {
  id: ID;
  hotelId: ID;
  code: RoomTypeCode;
  name: string;
  /** Total physical rooms of this category. */
  inventory: number;
  maxOccupancy: number;
  baseAdults: number;
  sizeSqft: number;
  /** Published rack rate per night. */
  rackRate: Paise;
  /** Lowest rate sellable without manager approval (§19). */
  floorRate: Paise;
  amenities: string[];
  /** Ordering weight, cheapest first. */
  tier: number;
}

export type RoomStatus =
  | "available"
  | "occupied"
  | "reserved"
  | "held"
  | "maintenance"
  | "departing"
  | "arriving";

export interface Room {
  id: ID;
  hotelId: ID;
  number: string;
  floor: number;
  roomTypeId: ID;
  status: RoomStatus;
  /** Present when status implies a guest. */
  guestId?: ID;
  bookingId?: ID;
  housekeepingNote?: string;
}

/** One room-type/date cell in the availability matrix (§18). */
export interface InventoryCell {
  date: ISODate;
  roomTypeId: ID;
  total: number;
  sold: number;
  held: number;
  /** Rooms out of service on this date. */
  maintenance: number;
  /** Rooms the hotel withheld from sale on this date. */
  blocked: number;
  available: number;
  /** Effective rate for this date, after rules. */
  rate: Paise;
}

/**
 * Inventory withheld from sale on purpose (§18).
 *
 * Distinct from a hold, which belongs to a guest and releases itself when the
 * enquiry closes. A block belongs to the hotel: an audit, a renovation, a group
 * option the sales desk wants protected. Somebody has to release it by hand,
 * so it carries who created it.
 */
export interface InventoryBlock {
  id: ID;
  roomTypeId: ID;
  /** First night withheld. */
  from: ISODate;
  /** Last night withheld, inclusive. */
  to: ISODate;
  rooms: number;
  reason: string;
  createdById?: ID;
  createdAt: ISODateTime;
}

// ---------------------------------------------------------------------------
// Channels & people
// ---------------------------------------------------------------------------

export type LeadSource =
  | "whatsapp"
  | "website"
  | "booking_com"
  | "phone"
  | "instagram"
  | "walk_in"
  | "email"
  | "google_business";

export type GuestSegment =
  | "new"
  | "returning"
  | "vip"
  | "corporate"
  | "family"
  | "long_stay"
  | "high_value"
  | "at_risk";

export interface Guest {
  id: ID;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  company?: string;
  /**
   * The language this guest asked to be dealt with in.
   *
   * Recorded only when somebody said so. The desk works in English by default,
   * and writing "English" against every guest who never expressed a preference
   * would turn an absence of information into a claim.
   */
  preferredLanguage?: string;
  segments: GuestSegment[];
  totalStays: number;
  lifetimeValue: Paise;
  lastStayDate?: ISODate;
  upcomingBookingId?: ID;
  preferredRoomTypeId?: ID;
  mealPreference?: MealPlan;
  preferences: string[];
  tags: string[];
  lastInteractionAt: ISODateTime;
  createdAt: ISODateTime;
  notes?: string;
}

export type TeamRole =
  | "owner"
  | "manager"
  | "reception"
  | "reservations"
  | "sales"
  | "accountant";

export type ShiftName = "morning" | "afternoon" | "night" | "off";

export type PresenceStatus = "available" | "busy" | "on_call" | "offline";

export interface TeamMember {
  id: ID;
  name: string;
  role: TeamRole;
  email: string;
  phone: string;
  shift: ShiftName;
  shiftStart: string;
  shiftEnd: string;
  status: PresenceStatus;
  assignedLeadCount: number;
  /** Median first response, seconds. */
  medianResponseSec: number;
  /** Share of leads answered inside SLA, 0-1. */
  slaComplianceRate: number;
  /** Share of assigned leads converted, 0-1. */
  conversionRate: number;
  avatarInitials: string;
}

/**
 * One thing a role may or may not do, written as a capability rather than as a
 * screen (§40).
 *
 * Permissions are stored against the capability, not against the person: a
 * property that hires a second receptionist should not have to remember which
 * boxes the first one had ticked. `needsApproval` is the middle state that
 * hotels actually run on, where the work is done by whoever is at the desk and
 * signed off by whoever carries the consequence.
 */
export interface RolePermission {
  id: ID;
  label: string;
  /** What the capability covers, in the words a manager would use. */
  description: string;
  granted: TeamRole[];
  needsApproval?: TeamRole[];
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export type LeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "quote_sent"
  | "negotiating"
  | "payment_pending"
  | "booked"
  | "lost";

export type LeadPriority = "low" | "normal" | "high" | "urgent";

export type MealPlan = "room_only" | "breakfast" | "half_board" | "full_board";

export type LostReason =
  | "price"
  | "no_availability"
  | "no_response"
  | "booked_elsewhere"
  | "date_change"
  | "duplicate"
  | "not_serious";

export interface StayRequirement {
  checkIn: ISODate;
  checkOut: ISODate;
  nights: number;
  adults: number;
  children: number;
  rooms: number;
  roomTypeId?: ID;
  mealPlan?: MealPlan;
  budgetPerNight?: Paise;
  specialRequests: string[];
}

export interface LeadAttribution {
  channel: LeadSource;
  campaign?: string;
  utmSource?: string;
  utmMedium?: string;
  referrer?: string;
}

export interface LeadCommercials {
  /** System estimate from requirement x rate card. */
  estimatedValue: Paise;
  /** What was actually quoted, once a quote exists. */
  quotedValue?: Paise;
  /** Guest's counter-offer during negotiation. */
  requestedValue?: Paise;
  discountPct?: number;
  /** Policy floor this lead must not breach without approval. */
  floorValue: Paise;
  paymentStatus: PaymentStatus;
}

export interface Lead {
  id: ID;
  reference: string;
  hotelId: ID;
  guestId: ID;
  stage: LeadStage;
  priority: LeadPriority;
  source: LeadSource;
  attribution: LeadAttribution;
  requirement: StayRequirement;
  commercials: LeadCommercials;
  assigneeId?: ID;
  /** Free-text next step surfaced in the priority table (§10). */
  nextAction: string;
  nextActionDueAt?: ISODateTime;
  unreadCount: number;
  /** Denormalised for list rendering without joining conversations. */
  lastMessagePreview: string;
  lastActivityAt: ISODateTime;
  createdAt: ISODateTime;
  /**
   * Seconds between the enquiry arriving and the first reply a person wrote.
   *
   * Automatic acknowledgements are deliberately not counted. If they were, the
   * median would measure how quickly the software answers rather than how
   * quickly the desk does, and it would read under a minute forever.
   * `undefined` means no colleague has replied yet.
   */
  firstResponseSec?: number;
  slaBreached: boolean;
  isReturningGuest: boolean;
  lostReason?: LostReason;
  convertedBookingId?: ID;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

export type MessageAuthorKind = "guest" | "staff" | "system" | "internal_note";

export type MessageDeliveryStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export interface MessageAttachment {
  id: ID;
  kind: "image" | "document" | "quote";
  name: string;
  sizeLabel?: string;
}

export interface Message {
  id: ID;
  conversationId: ID;
  authorKind: MessageAuthorKind;
  /** TeamMember id for staff, Guest id for guest, undefined for system. */
  authorId?: ID;
  authorName: string;
  body: string;
  sentAt: ISODateTime;
  status: MessageDeliveryStatus;
  channel: LeadSource;
  attachments?: MessageAttachment[];
  /** Marks output the automation layer produced, so humans can tell (§20). */
  isAutomated?: boolean;
}

export interface Conversation {
  id: ID;
  leadId: ID;
  guestId: ID;
  channel: LeadSource;
  messages: Message[];
  unreadCount: number;
  lastMessageAt: ISODateTime;
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export type BookingStatus =
  | "confirmed"
  | "pending"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";

export type PaymentStatus =
  | "unpaid"
  | "advance_paid"
  | "partially_paid"
  | "paid"
  | "refunded";

export interface Booking {
  id: ID;
  reference: string;
  hotelId: ID;
  guestId: ID;
  leadId?: ID;
  status: BookingStatus;
  checkIn: ISODate;
  checkOut: ISODate;
  nights: number;
  roomTypeId: ID;
  roomNumbers: string[];
  rooms: number;
  adults: number;
  children: number;
  mealPlan: MealPlan;
  /** Nightly rate actually sold. */
  nightlyRate: Paise;
  subtotal: Paise;
  taxes: Paise;
  total: Paise;
  amountPaid: Paise;
  paymentStatus: PaymentStatus;
  source: LeadSource;
  createdById?: ID;
  createdAt: ISODateTime;
  specialRequests: string[];
}

// ---------------------------------------------------------------------------
// Policy (§37)
// ---------------------------------------------------------------------------

/**
 * One rung of the cancellation ladder.
 *
 * Bands are expressed in hours before check-in rather than days because the
 * only band that ever gets argued about is the last one, and "inside twelve
 * hours" is a sentence the desk can check against a clock. `fromHoursBefore`
 * is exclusive at the top so the rungs tile without overlapping.
 */
export interface CancellationBand {
  id: ID;
  /** Upper edge, in hours before check-in. `null` means "and everything earlier". */
  fromHoursBefore: number | null;
  /** Lower edge, in hours before check-in. */
  toHoursBefore: number;
  label: string;
  /** Charge counted in nights of the stay. Mutually exclusive with `chargeShare`. */
  chargeNights?: number;
  /** Charge as a share of the whole stay, 0-1. */
  chargeShare?: number;
  /** What the guest is told, in the words the desk uses. */
  terms: string;
}

export interface CancellationPolicy {
  /** Cutoff quoted to guests, e.g. "14:00 on the day of arrival". */
  anchor: string;
  bands: CancellationBand[];
  /** Applies to stays the property did not sell directly. */
  channelNote: string;
}

export interface StayPolicy {
  checkInTime: string;
  checkOutTime: string;
  earlyCheckIn: string;
  lateCheckOut: string;
  /** Age at which a child is charged as an adult. */
  childFreeUnderAge: number;
  childPolicy: string;
  extraBed: string;
  idRequirement: string;
}

// ---------------------------------------------------------------------------
// Pricing (§19)
// ---------------------------------------------------------------------------

export interface Rate {
  id: ID;
  roomTypeId: ID;
  date: ISODate;
  rackRate: Paise;
  currentRate: Paise;
  floorRate: Paise;
  occupancyPct: number;
  lastChangedAt: ISODateTime;
  lastChangedById?: ID;
}

export type PricingConditionSubject =
  | "occupancy"
  | "lead_time_days"
  | "nights"
  | "guest_segment"
  | "room_type"
  | "channel";

export type PricingOperator = "lt" | "lte" | "gt" | "gte" | "eq" | "between" | "in";

export interface PricingCondition {
  subject: PricingConditionSubject;
  operator: PricingOperator;
  value: number | string | [number, number] | string[];
}

export type PricingActionKind =
  | "allow_discount_up_to"
  | "add_discount"
  | "require_approval"
  | "block";

export interface PricingAction {
  kind: PricingActionKind;
  /** Percentage points, where the action kind takes one. */
  valuePct?: number;
}

export interface PricingRule {
  id: ID;
  name: string;
  description: string;
  enabled: boolean;
  /** Lower number evaluates first. */
  priority: number;
  conditions: PricingCondition[];
  action: PricingAction;
  lastEditedAt: ISODateTime;
  lastEditedById?: ID;
}

/**
 * How far below the effective rate each role may go on its own signature (§19).
 *
 * Expressed as percentage points off the current rate, not off rack, because
 * rack is not what the guest was quoted. Anything past the ceiling becomes an
 * exception for someone senior rather than a decision the system refuses.
 */
export interface DiscountAuthority {
  role: TeamRole;
  /** Maximum discount this role can approve alone, as a fraction. */
  ceiling: number;
  /** Who the request escalates to once the ceiling is passed. */
  escalatesTo?: TeamRole;
}

// ---------------------------------------------------------------------------
// Follow-ups (§14)
// ---------------------------------------------------------------------------

export type FollowUpStatus = "pending" | "done" | "snoozed" | "overdue";

export type FollowUpReason =
  | "no_reply"
  | "quote_sent"
  | "payment_pending"
  | "post_stay"
  | "date_confirmation"
  | "upsell";

export interface FollowUp {
  id: ID;
  leadId: ID;
  guestId: ID;
  reason: FollowUpReason;
  note: string;
  dueAt: ISODateTime;
  channel: LeadSource;
  ownerId: ID;
  status: FollowUpStatus;
  /** True when the automation layer scheduled it rather than a human. */
  isAutomated: boolean;
  suggestedAction: string;
  completedAt?: ISODateTime;
}

// ---------------------------------------------------------------------------
// Exceptions (§20) — the product's core differentiator
// ---------------------------------------------------------------------------

export type ExceptionKind =
  | "pricing"
  | "vip"
  | "complaint"
  | "refund"
  | "policy"
  | "operational";

export type ExceptionSeverity = "low" | "medium" | "high" | "critical";

export type ExceptionStatus = "open" | "approved" | "rejected" | "modified" | "assigned";

export interface ExceptionItem {
  id: ID;
  reference: string;
  kind: ExceptionKind;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  guestId: ID;
  leadId?: ID;
  bookingId?: ID;
  title: string;
  reason: string;
  /** What the automation layer proposes. Advisory only — a human decides. */
  systemRecommendation: string;
  requestedAction: string;
  /** e.g. "Floor rate ₹4,300/night" */
  policyThreshold?: string;
  /** Signed delta against policy. Negative = revenue given away. */
  businessImpact: Paise;
  raisedAt: ISODateTime;
  resolvedAt?: ISODateTime;
  resolvedById?: ID;
  /**
   * What was actually decided, in the words of whoever decided it.
   *
   * Kept apart from `systemRecommendation` on purpose. The recommendation is
   * what the software would have done; this is what a person did, and the gap
   * between the two is the only record of why the exception existed.
   */
  decisionNote?: string;
  /** The figure authorised, where the decision changed the one requested. */
  modifiedValue?: Paise;
  assigneeId?: ID;
  comments: ExceptionComment[];
}

export interface ExceptionComment {
  id: ID;
  authorId: ID;
  authorName: string;
  body: string;
  createdAt: ISODateTime;
}

// ---------------------------------------------------------------------------
// Event log (§32)
// ---------------------------------------------------------------------------

export type EventKind =
  | "lead_created"
  | "lead_qualified"
  | "lead_assigned"
  | "stage_changed"
  | "message_received"
  | "message_sent"
  | "followup_sent"
  | "quote_generated"
  | "returning_guest_detected"
  | "approval_requested"
  | "approval_resolved"
  | "booking_created"
  | "payment_received"
  | "rate_changed";

/** Who acted. Drives the "management by exception" narrative (§42). */
export type ActorKind = "automation" | "staff" | "guest" | "system";

export interface EventRecord {
  id: ID;
  kind: EventKind;
  actorKind: ActorKind;
  actorId?: ID;
  actorName: string;
  /** One-line, already human-readable. */
  summary: string;
  leadId?: ID;
  guestId?: ID;
  bookingId?: ID;
  exceptionId?: ID;
  occurredAt: ISODateTime;
  /** True when it completed with no human touch. Feeds autonomy rate (§21). */
  resolvedAutonomously: boolean;
}

// ---------------------------------------------------------------------------
// Metrics & analytics
// ---------------------------------------------------------------------------

export type TrendDirection = "up" | "down" | "flat";

export interface DashboardMetric {
  id: string;
  label: string;
  /** Preformatted for display; `rawValue` stays available for animation. */
  value: string;
  rawValue: number;
  secondary: string;
  deltaPct?: number;
  /**
   * What the delta is measured against, e.g. "yesterday".
   *
   * Carried on the metric rather than assumed by the card, because the windows
   * genuinely differ: five of these compare with yesterday and the revenue
   * figure compares one week with the one before it. A card that printed a
   * single baseline for all six would be wrong about one of them.
   */
  comparison: string;
  trend: TrendDirection;
  /** Whether an upward move is good. Churn goes up = bad. */
  positiveDirection: TrendDirection;
  sparkline: number[];
  intent: "neutral" | "positive" | "caution" | "critical" | "intel";
  href?: string;
}

export interface PipelineStageSummary {
  stage: LeadStage;
  label: string;
  count: number;
  value: Paise;
}

export interface ChannelPerformance {
  source: LeadSource;
  leads: number;
  converted: number;
  conversionRate: number;
  revenue: Paise;
  medianResponseSec: number;
}

export interface ResponsePerformance {
  /** Median time to a reply a person wrote. */
  medianFirstResponseSec: number;
  /** Median time to the automatic acknowledgement, shown alongside so the two are never confused. */
  medianAcknowledgementSec: number;
  /** Threads the automation reached before a colleague did. */
  acknowledgedThreads: number;
  /** Threads in total, so the figure above is read as coverage rather than a rate. */
  threadsWithGuestMessages: number;
  withinSlaPct: number;
  longWaitingCount: number;
  byMember: {
    memberId: ID;
    name: string;
    medianResponseSec: number;
    withinSlaPct: number;
    handled: number;
  }[];
}

/** Why an open enquiry is on the revenue-at-risk list. One reason per lead. */
export type OpportunityReason =
  | "sla_breach"
  | "reply_pending"
  | "payment_overdue"
  | "quote_stale"
  | "negotiation_stalled";

export interface RevenueOpportunityRow {
  leadId: ID;
  reference: string;
  guestName: string;
  reason: OpportunityReason;
  /** Already written as a sentence a person can act on. */
  detail: string;
  value: Paise;
  waitingSec: number;
  priority: LeadPriority;
}

export interface RevenueOpportunity {
  totalAtRisk: Paise;
  rows: RevenueOpportunityRow[];
  lostThisWeekValue: Paise;
  lostThisWeekCount: number;
}

export type DateRangePreset = "today" | "7d" | "30d";

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------

/**
 * What an integration is actually doing right now (§41).
 *
 * Three states and no fourth. `demo` means the screen is reading seeded
 * records that stand in for the service. `not_connected` means there is no
 * account, no credential and no substitute. `connected` means a live service
 * is answering, which nothing in this build is; the state exists so the card
 * can describe what it would show rather than pretend to be in it.
 */
export type IntegrationState = "demo" | "not_connected" | "connected";

export type IntegrationCategory = "channel" | "commerce" | "operations" | "platform";

/** One thing an integration would move, and which way it would move it. */
export interface IntegrationFlow {
  direction: "in" | "out" | "both";
  label: string;
}

export interface Integration {
  id: ID;
  name: string;
  /** Who runs the service, so the card is not just a logo-less product name. */
  vendor: string;
  category: IntegrationCategory;
  state: IntegrationState;
  /** The enquiry channel it feeds, where it is one. */
  source?: LeadSource;
  /** One line on what the integration is for. */
  summary: string;
  syncs: IntegrationFlow[];
  /** What this build does in its place, said plainly. */
  standIn: string;
  /** Credentials a real connection would need, named but never collected. */
  credentials?: string[];
  /** The webhook path this service would call, shown as an inert example. */
  webhookPath?: string;
}

// ---------------------------------------------------------------------------
// Reports (§22)
// ---------------------------------------------------------------------------

/**
 * How often a standing report is drawn.
 *
 * The cadence is not decoration: it decides which periods the report can be
 * run over. A daily operations sheet has no meaningful "last month" and a tax
 * summary has no meaningful "yesterday", so the period selector is derived
 * from this rather than offered as one fixed list.
 */
export type ReportCadence = "daily" | "weekly" | "monthly";

export interface ReportDefinition {
  id: ID;
  name: string;
  cadence: ReportCadence;
  /** Who it is written for, in the words the property would use. */
  audience: string;
  summary: string;
  /** The questions it exists to settle, so its usefulness is judged before it is run. */
  answers: string[];
  /** Where the figures come from, so derived and entered are told apart. */
  sourceNote: string;
}

export type ReportDeliveryChannel = "email" | "whatsapp";

/**
 * A standing delivery instruction.
 *
 * Seeded and editable on screen, but nothing sends. The schedule is stored
 * because it is the part a property actually argues about: who gets the
 * number, and how early in the morning.
 */
export interface ReportSchedule {
  id: ID;
  reportId: ID;
  enabled: boolean;
  /** Local time of day at the property, 24h, e.g. "07:30". */
  sendAt: string;
  /** Weekday for weekly, day of month for monthly, empty for daily. */
  dayLabel?: string;
  channel: ReportDeliveryChannel;
  recipients: string[];
}

// ---------------------------------------------------------------------------
// Settings (§37, §42)
// ---------------------------------------------------------------------------

/** A way guests reach the property, and who is answerable for it. */
export interface ContactChannel {
  id: ID;
  source: LeadSource;
  /** The number, address or page as a guest would see it. */
  handle: string;
  /** Hours the property undertakes to watch it, in its own words. */
  watchedHours: string;
  /** Role that owns the channel when nobody is named. */
  ownerRole: TeamRole;
  /** Whether enquiries from here reach the inbox in this build. */
  reachesInbox: boolean;
}

/**
 * How far automation may go on one kind of enquiry.
 *
 * Three settings rather than a switch. "Send" and "hold for a person" are the
 * obvious two; "draft and wait" is the one a property actually lives on, and
 * leaving it out would force every borderline case into one of the extremes.
 */
export type AutomationMode = "send" | "draft" | "human";

export interface AutomationRule {
  id: ID;
  /** The enquiry as the desk would describe it, not as a model would label it. */
  label: string;
  /** A real example of the message this rule catches. */
  example: string;
  mode: AutomationMode;
  /** Why the property settled on this setting. */
  rationale: string;
  /** Conditions that pull the enquiry back to a person whatever the mode says. */
  overrides: string[];
}

/** The property's undertaking on one channel, against which SLA is measured. */
export interface ResponseTarget {
  id: ID;
  source: LeadSource;
  /** First reply target in seconds. */
  targetSec: number;
  /** Hours the target applies, in the property's words. */
  appliesDuring: string;
  /** What happens outside those hours. */
  afterHours: string;
}

export type EscalationChannel = "in_app" | "email" | "whatsapp";

/**
 * A standing instruction to interrupt somebody.
 *
 * `afterLabel` is a sentence rather than a number of minutes because the
 * trigger is not always a clock: some of these fire on a value, some on a
 * word in a message, and a settings table that pretends they are all timers
 * would be lying about the third of them that are not.
 */
export interface EscalationRule {
  id: ID;
  trigger: string;
  afterLabel: string;
  notifyRole: TeamRole;
  channels: EscalationChannel[];
  enabled: boolean;
  /** What the person is expected to do when it reaches them. */
  expectation: string;
}

// ---------------------------------------------------------------------------
// UI-layer support types
// ---------------------------------------------------------------------------

export interface NavBadge {
  count: number;
  intent: "neutral" | "critical" | "caution";
}

export interface QuickAction {
  id: string;
  label: string;
  hint?: string;
}
