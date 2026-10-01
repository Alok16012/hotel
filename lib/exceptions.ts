/**
 * View models for the exception queue (§20).
 *
 * This screen exists because the rest of the product works. Everything the
 * automation layer was allowed to settle has already been settled somewhere
 * else; what lands here is the residue a person is actually required to own.
 * So the row carries more context than any other list in the application: an
 * exception read without the guest behind it, the money against it and the rule
 * it breaks is not a decision, it is a guess.
 *
 * Three joins, each for a reason:
 *
 * The guest comes across because severity is a property of the relationship as
 * much as the amount. Rs 4,500 given away to a nine-stay guest and the same sum
 * given away to a first-time walk-in are not the same decision, and the queue
 * should not make anybody open a second screen to tell them apart.
 *
 * The lead comes across because the floor that was breached and the figure the
 * guest asked for both live on the enquiry, not on the exception. Copying them
 * onto the exception record would let the two drift the first time a quote was
 * revised.
 *
 * Elapsed time is derived, never stored. For an open item it is how long the
 * queue has been holding it; for a resolved one it is how long the decision
 * took. Both are the same subtraction against different endpoints, and both go
 * stale within the hour if written down.
 */

import { BOOKING_BY_ID } from "@/data/bookings";
import { EXCEPTIONS } from "@/data/exceptions";
import { GUEST_BY_ID } from "@/data/guests";
import { ROOM_TYPE_BY_ID } from "@/data/hotel";
import { LEAD_BY_ID } from "@/data/leads";
import { TEAM_BY_ID } from "@/data/team";
import { DEMO_NOW } from "@/lib/clock";
import { initials } from "@/lib/utils";
import type {
  BookingStatus,
  ExceptionItem,
  ExceptionKind,
  ExceptionSeverity,
  ExceptionStatus,
  GuestSegment,
  ISODate,
  ISODateTime,
  LeadSource,
  LeadStage,
  MealPlan,
  Paise,
  TeamRole,
} from "@/types";

export interface ExceptionCommentRow {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorRole?: TeamRole;
  body: string;
  createdAt: ISODateTime;
}

/** The stay the exception is about, where one exists. */
export interface ExceptionStay {
  checkIn: ISODate;
  checkOut: ISODate;
  nights: number;
  rooms: number;
  roomTypeName?: string;
  mealPlan?: MealPlan;
}

export interface ExceptionRow {
  id: string;
  reference: string;
  kind: ExceptionKind;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  isOpen: boolean;

  title: string;
  reason: string;
  /** Advisory only. The point of this screen is that a person overrules it. */
  systemRecommendation: string;
  requestedAction: string;
  policyThreshold?: string;
  /** Signed. Negative means revenue given away against policy. */
  businessImpact: Paise;

  raisedAt: ISODateTime;
  resolvedAt?: ISODateTime;
  /** Seconds waiting, for an open item. Seconds to decide, for a closed one. */
  elapsedSec: number;

  assigneeId?: string;
  assigneeName?: string;
  assigneeInitials?: string;
  assigneeRole?: TeamRole;
  resolvedById?: string;
  resolvedByName?: string;
  /** What the person decided, in their words. Absent while the item is open. */
  decisionNote?: string;
  /** The figure authorised, where the decision changed the one requested. */
  modifiedValue?: Paise;

  guestId: string;
  guestName: string;
  guestInitials: string;
  guestCity?: string;
  guestCompany?: string;
  guestSegments: GuestSegment[];
  guestStays: number;
  guestLifetimeValue: Paise;

  leadId?: string;
  leadReference?: string;
  leadStage?: LeadStage;
  leadSource?: LeadSource;
  /** What was quoted, what the guest countered with, and the policy floor. */
  quotedValue?: Paise;
  requestedValue?: Paise;
  floorValue?: Paise;

  bookingId?: string;
  bookingReference?: string;
  bookingStatus?: BookingStatus;
  bookingTotal?: Paise;

  stay?: ExceptionStay;
  comments: ExceptionCommentRow[];
}

function secondsBetween(from: ISODateTime, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - new Date(from).getTime()) / 1000));
}

function toCommentRow(comment: ExceptionItem["comments"][number]): ExceptionCommentRow {
  return {
    id: comment.id,
    authorId: comment.authorId,
    authorName: comment.authorName,
    authorInitials: TEAM_BY_ID[comment.authorId]?.avatarInitials ?? initials(comment.authorName),
    authorRole: TEAM_BY_ID[comment.authorId]?.role,
    body: comment.body,
    createdAt: comment.createdAt,
  };
}

function toRow(item: ExceptionItem, now: Date): ExceptionRow {
  const guest = GUEST_BY_ID[item.guestId];
  const lead = item.leadId ? LEAD_BY_ID[item.leadId] : undefined;
  const booking = item.bookingId ? BOOKING_BY_ID[item.bookingId] : undefined;
  const assignee = item.assigneeId ? TEAM_BY_ID[item.assigneeId] : undefined;
  const resolver = item.resolvedById ? TEAM_BY_ID[item.resolvedById] : undefined;

  // The booking wins over the lead when both are attached: a complaint about a
  // stay that happened is about the stay that happened, not the enquiry that
  // produced it.
  const stay: ExceptionStay | undefined = booking
    ? {
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights: booking.nights,
        rooms: booking.rooms,
        roomTypeName: ROOM_TYPE_BY_ID[booking.roomTypeId]?.name,
        mealPlan: booking.mealPlan,
      }
    : lead
      ? {
          checkIn: lead.requirement.checkIn,
          checkOut: lead.requirement.checkOut,
          nights: lead.requirement.nights,
          rooms: lead.requirement.rooms,
          roomTypeName: lead.requirement.roomTypeId
            ? ROOM_TYPE_BY_ID[lead.requirement.roomTypeId]?.name
            : undefined,
          mealPlan: lead.requirement.mealPlan,
        }
      : undefined;

  return {
    id: item.id,
    reference: item.reference,
    kind: item.kind,
    severity: item.severity,
    status: item.status,
    isOpen: item.status === "open" || item.status === "assigned",

    title: item.title,
    reason: item.reason,
    systemRecommendation: item.systemRecommendation,
    requestedAction: item.requestedAction,
    policyThreshold: item.policyThreshold,
    businessImpact: item.businessImpact,

    raisedAt: item.raisedAt,
    resolvedAt: item.resolvedAt,
    elapsedSec: item.resolvedAt
      ? secondsBetween(item.raisedAt, new Date(item.resolvedAt))
      : secondsBetween(item.raisedAt, now),

    assigneeId: item.assigneeId,
    assigneeName: assignee?.name,
    assigneeInitials: assignee?.avatarInitials,
    assigneeRole: assignee?.role,
    resolvedById: item.resolvedById,
    resolvedByName: resolver?.name,
    decisionNote: item.decisionNote,
    modifiedValue: item.modifiedValue,

    guestId: item.guestId,
    guestName: guest?.name ?? "Unknown guest",
    guestInitials: initials(guest?.name ?? "?"),
    guestCity: guest?.city,
    guestCompany: guest?.company,
    guestSegments: guest?.segments ?? [],
    guestStays: guest?.totalStays ?? 0,
    guestLifetimeValue: guest?.lifetimeValue ?? 0,

    leadId: lead?.id,
    leadReference: lead?.reference,
    leadStage: lead?.stage,
    leadSource: lead?.source,
    quotedValue: lead?.commercials.quotedValue,
    requestedValue: lead?.commercials.requestedValue,
    floorValue: lead?.commercials.floorValue,

    bookingId: booking?.id,
    bookingReference: booking?.reference,
    bookingStatus: booking?.status,
    bookingTotal: booking?.total,

    stay,
    comments: [...item.comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(toCommentRow),
  };
}

export function getExceptionRows(now: Date = DEMO_NOW): ExceptionRow[] {
  return EXCEPTIONS.map((item) => toRow(item, now));
}
