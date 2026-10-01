/**
 * View models for the lead workspace (§10-§14).
 *
 * The workspace is one interactive surface, so it is a client component, and a
 * client component must not reach into `data/`. Everything it needs is shaped
 * here on the server and handed over as plain objects: the row summary the
 * inbox sorts and filters on, and the full record the detail pane reads.
 *
 * Two things are derived rather than stored, and both are load bearing.
 *
 * The waiting clocks come from `lib/metrics.ts` so the inbox, the Command
 * Center and the exception queue all count a late reply the same way.
 *
 * Availability is counted off the booking ledger for the exact nights the
 * enquiry asks for, not read from a field. A stay requirement panel that says
 * "14 rooms free" without checking the nights in between would be the most
 * expensive lie in the product.
 */

import { BOOKINGS } from "@/data/bookings";
import { CONVERSATION_BY_LEAD } from "@/data/conversations";
import { EVENTS } from "@/data/events";
import { GUEST_BY_ID } from "@/data/guests";
import { ROOM_TYPES, ROOM_TYPE_BY_ID } from "@/data/hotel";
import { LEADS, LEAD_BY_ID } from "@/data/leads";
import { TEAM_BY_ID } from "@/data/team";
import { SLA_TARGET_SEC, leadValue, unattendedSec, waitingOnUsSec } from "@/lib/metrics";
import { initials } from "@/lib/utils";
import type {
  EventRecord,
  Guest,
  ISODate,
  ISODateTime,
  Lead,
  LeadPriority,
  LeadSource,
  LeadStage,
  LostReason,
  Message,
  Paise,
  RoomType,
  TeamMember,
} from "@/types";

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

const LIVE_BOOKINGS = BOOKINGS.filter((b) => b.status !== "cancelled");

/** Every date the stay occupies a room: check-in night through the last night. */
function nightsBetween(checkIn: ISODate, checkOut: ISODate): ISODate[] {
  const nights: ISODate[] = [];
  const cursor = new Date(`${checkIn}T12:00:00+05:30`);
  const end = new Date(`${checkOut}T12:00:00+05:30`);
  while (cursor < end && nights.length < 400) {
    nights.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return nights;
}

/**
 * Rooms of a type still sellable across *every* night of a stay.
 *
 * The worst night governs, because a guest cannot be moved out on the Tuesday
 * of a three night stay. Taking the average, or checking only the arrival
 * night, is how a hotel oversells a wedding block.
 */
export function roomsAvailableFor(roomTypeId: string | undefined, checkIn: ISODate, checkOut: ISODate) {
  const roomType = roomTypeId ? ROOM_TYPE_BY_ID[roomTypeId] : undefined;
  if (!roomType) return { available: 0, inventory: 0, tightestNight: undefined as ISODate | undefined };

  let worst = roomType.inventory;
  let tightestNight: ISODate | undefined;

  for (const night of nightsBetween(checkIn, checkOut)) {
    const held = LIVE_BOOKINGS.filter(
      (b) => b.roomTypeId === roomTypeId && b.checkIn <= night && night < b.checkOut,
    ).reduce((sum, b) => sum + b.rooms, 0);

    const free = roomType.inventory - held;
    if (free < worst) {
      worst = free;
      tightestNight = night;
    }
  }

  return { available: Math.max(worst, 0), inventory: roomType.inventory, tightestNight };
}

// ---------------------------------------------------------------------------
// Row summary (the inbox)
// ---------------------------------------------------------------------------

export interface LeadRow {
  id: string;
  reference: string;
  guestId: string;
  guestName: string;
  guestInitials: string;
  company?: string;
  source: LeadSource;
  stage: LeadStage;
  priority: LeadPriority;
  /** The quoted number once one exists, the estimate before it. */
  value: Paise;
  valueIsQuoted: boolean;
  checkIn: ISODate;
  checkOut: ISODate;
  nights: number;
  rooms: number;
  adults: number;
  children: number;
  roomTypeName?: string;
  ownerId?: string;
  ownerName?: string;
  ownerInitials?: string;
  unreadCount: number;
  lastMessagePreview: string;
  lastActivityAt: ISODateTime;
  createdAt: ISODateTime;
  /** Seconds the guest has been waiting on a message nobody has answered. */
  waitingSec: number;
  /** Of that, the part nobody on the desk has even acknowledged. */
  unattendedSec: number;
  isBreaching: boolean;
  firstResponseSec?: number;
  isReturningGuest: boolean;
  tags: string[];
  nextAction: string;
  nextActionDueAt?: ISODateTime;
  lostReason?: LostReason;
  hasThread: boolean;
}

function toRow(lead: Lead): LeadRow {
  const guest = GUEST_BY_ID[lead.guestId];
  const owner = lead.assigneeId ? TEAM_BY_ID[lead.assigneeId] : undefined;
  const roomType = lead.requirement.roomTypeId
    ? ROOM_TYPE_BY_ID[lead.requirement.roomTypeId]
    : undefined;
  const unattended = unattendedSec(lead.id);

  return {
    id: lead.id,
    reference: lead.reference,
    guestId: lead.guestId,
    guestName: guest?.name ?? "Unknown guest",
    guestInitials: initials(guest?.name ?? "Unknown guest"),
    company: guest?.company,
    source: lead.source,
    stage: lead.stage,
    priority: lead.priority,
    value: leadValue(lead),
    valueIsQuoted: lead.commercials.quotedValue !== undefined,
    checkIn: lead.requirement.checkIn,
    checkOut: lead.requirement.checkOut,
    nights: lead.requirement.nights,
    rooms: lead.requirement.rooms,
    adults: lead.requirement.adults,
    children: lead.requirement.children,
    roomTypeName: roomType?.name,
    ownerId: owner?.id,
    ownerName: owner?.name,
    ownerInitials: owner?.avatarInitials,
    unreadCount: lead.unreadCount,
    lastMessagePreview: lead.lastMessagePreview,
    lastActivityAt: lead.lastActivityAt,
    createdAt: lead.createdAt,
    waitingSec: waitingOnUsSec(lead.id),
    unattendedSec: unattended,
    isBreaching: unattended > SLA_TARGET_SEC,
    firstResponseSec: lead.firstResponseSec,
    isReturningGuest: lead.isReturningGuest,
    tags: lead.tags,
    nextAction: lead.nextAction,
    nextActionDueAt: lead.nextActionDueAt,
    lostReason: lead.lostReason,
    hasThread: CONVERSATION_BY_LEAD[lead.id] !== undefined,
  };
}

export function getLeadRows(): LeadRow[] {
  return LEADS.map(toRow);
}

// ---------------------------------------------------------------------------
// Full record (the detail pane)
// ---------------------------------------------------------------------------

/**
 * One sellable room category, costed for this enquiry's exact dates.
 *
 * The quote builder lets an operator move the enquiry to another category, and
 * that only helps if the alternative comes with its own availability and its
 * own floor. Counting it here keeps the arithmetic on the server and keeps the
 * builder honest when the requested category is sold out.
 */
export interface QuoteOption {
  roomTypeId: string;
  name: string;
  inventory: number;
  available: number;
  rackRate: Paise;
  floorRate: Paise;
  maxOccupancy: number;
}

export interface LeadDetail {
  lead: Lead;
  guest: Guest;
  owner?: TeamMember;
  roomType?: RoomType;
  /** Every category, cheapest first, priced and counted for these nights. */
  options: QuoteOption[];
  /** Oldest first, exactly as the transcript renders. */
  messages: Message[];
  /** Everything the desk and the automation did on this enquiry, newest first. */
  events: EventRecord[];
  roomsAvailable: number;
  inventory: number;
  tightestNight?: ISODate;
  /**
   * The nightly rate the quote builder opens on: what was already quoted if a
   * quote exists, otherwise the rate the estimate was built from.
   */
  suggestedRate: Paise;
}

function suggestedRateFor(lead: Lead, roomType?: RoomType): Paise {
  const roomNights = Math.max(lead.requirement.rooms * lead.requirement.nights, 1);
  const base = lead.commercials.quotedValue ?? lead.commercials.estimatedValue;
  const derived = Math.round(base / roomNights);
  return derived > 0 ? derived : (roomType?.rackRate ?? 0);
}

export function getLeadDetail(leadId: string): LeadDetail | undefined {
  const lead = LEAD_BY_ID[leadId];
  const guest = lead ? GUEST_BY_ID[lead.guestId] : undefined;
  if (!lead || !guest) return undefined;

  const roomType = lead.requirement.roomTypeId
    ? ROOM_TYPE_BY_ID[lead.requirement.roomTypeId]
    : undefined;
  const { available, inventory, tightestNight } = roomsAvailableFor(
    lead.requirement.roomTypeId,
    lead.requirement.checkIn,
    lead.requirement.checkOut,
  );

  const options: QuoteOption[] = ROOM_TYPES.map((type) => ({
    roomTypeId: type.id,
    name: type.name,
    inventory: type.inventory,
    available: roomsAvailableFor(type.id, lead.requirement.checkIn, lead.requirement.checkOut)
      .available,
    rackRate: type.rackRate,
    floorRate: type.floorRate,
    maxOccupancy: type.maxOccupancy,
  })).sort((a, b) => a.rackRate - b.rackRate);

  return {
    lead,
    guest,
    owner: lead.assigneeId ? TEAM_BY_ID[lead.assigneeId] : undefined,
    roomType,
    options,
    messages: CONVERSATION_BY_LEAD[lead.id]?.messages ?? [],
    events: EVENTS.filter((e) => e.leadId === lead.id).sort((a, b) =>
      b.occurredAt.localeCompare(a.occurredAt),
    ),
    roomsAvailable: available,
    inventory,
    tightestNight,
    suggestedRate: suggestedRateFor(lead, roomType),
  };
}

export function getLeadDetails(): Record<string, LeadDetail> {
  const entries = LEADS.map((lead) => [lead.id, getLeadDetail(lead.id)] as const).filter(
    (entry): entry is readonly [string, LeadDetail] => entry[1] !== undefined,
  );
  return Object.fromEntries(entries);
}
