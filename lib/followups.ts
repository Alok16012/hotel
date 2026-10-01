/**
 * View models for the follow-up queue (§14).
 *
 * Same contract as `lib/leads.ts`: the screen is one interactive surface, so it
 * is a client component, so everything it needs is joined here on the server
 * and handed over as plain objects.
 *
 * Two things are derived rather than stored, and both exist because the queue
 * is useless without them.
 *
 * A follow-up on its own says "chase this". It does not say what is at stake,
 * so the commercial figures and the stay come across from the lead. Nobody
 * should have to open a second screen to find out whether they are chasing a
 * twenty-two room training block or one night in a Deluxe.
 *
 * The sequence position is counted rather than written down, because the thing
 * an operator actually wants to know before picking up the phone is how many
 * times this guest has already been contacted, and by whom. Two automated
 * chases followed by a third automated chase is the moment a person should take
 * over, and a stored `attempt: 3` would go stale the first time somebody
 * cancelled one.
 *
 * Attempts are counted off the completed follow-ups on the same enquiry rather
 * than the activity log, because the log records a delivery without recording
 * whose turn it was. The follow-up record carries both, so one source answers
 * the whole question and the two cannot drift apart.
 */

import { EVENTS } from "@/data/events";
import { FOLLOW_UPS } from "@/data/followups";
import { GUEST_BY_ID } from "@/data/guests";
import { ROOM_TYPE_BY_ID } from "@/data/hotel";
import { LEAD_BY_ID } from "@/data/leads";
import { TEAM_BY_ID } from "@/data/team";
import { leadValue } from "@/lib/metrics";
import { initials } from "@/lib/utils";
import type {
  FollowUp,
  FollowUpReason,
  FollowUpStatus,
  ISODate,
  ISODateTime,
  LeadSource,
  LeadStage,
  Paise,
  PaymentStatus,
} from "@/types";

export interface FollowUpRow {
  id: string;
  reason: FollowUpReason;
  note: string;
  suggestedAction: string;
  dueAt: ISODateTime;
  channel: LeadSource;
  status: FollowUpStatus;
  /** True when the automation layer scheduled it rather than a person. */
  isAutomated: boolean;
  completedAt?: ISODateTime;

  ownerId: string;
  ownerName: string;
  ownerInitials: string;

  leadId: string;
  leadReference: string;
  leadStage: LeadStage;

  guestId: string;
  guestName: string;
  guestInitials: string;
  company?: string;
  isReturningGuest: boolean;

  /** The quoted figure where a quote exists, the estimate before it. */
  value: Paise;
  valueIsQuoted: boolean;
  paymentStatus: PaymentStatus;
  /** When the quote this chases went out. Undefined when none has. */
  quotedAt?: ISODateTime;

  checkIn: ISODate;
  checkOut: ISODate;
  nights: number;
  rooms: number;
  roomTypeName?: string;

  /** Position among every touchpoint scheduled on this enquiry, oldest first. */
  sequenceIndex: number;
  sequenceTotal: number;
  /** Touchpoints on this enquiry that have already gone out. */
  attemptsSent: number;
  /** Of those, the ones no person touched. */
  attemptsAutomated: number;
}

/** Touchpoints already delivered on a lead, split by who delivered them. */
function attemptsFor(siblings: FollowUp[]) {
  const sent = siblings.filter((f) => f.status === "done");
  return {
    attemptsSent: sent.length,
    attemptsAutomated: sent.filter((f) => f.isAutomated).length,
  };
}

/**
 * When the quote behind the current figure went out.
 *
 * Only meaningful once the lead carries a quoted value. The activity log also
 * records drafts that were built and then held back, and stamping one of those
 * onto a row would tell an operator a price went to the guest when it did not.
 */
function quotedAtFor(leadId: string): ISODateTime | undefined {
  return EVENTS.filter((e) => e.leadId === leadId && e.kind === "quote_generated").sort((a, b) =>
    b.occurredAt.localeCompare(a.occurredAt),
  )[0]?.occurredAt;
}

export function getFollowUpRows(): FollowUpRow[] {
  // Sequence position is per lead, so the ordering is established once rather
  // than recomputed inside the map for every row.
  const byLead = new Map<string, FollowUp[]>();
  for (const followUp of FOLLOW_UPS) {
    const list = byLead.get(followUp.leadId) ?? [];
    list.push(followUp);
    byLead.set(followUp.leadId, list);
  }
  for (const list of byLead.values()) list.sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  const rows: FollowUpRow[] = [];

  for (const followUp of FOLLOW_UPS) {
    const lead = LEAD_BY_ID[followUp.leadId];
    const guest = GUEST_BY_ID[followUp.guestId];
    // A touchpoint with no enquiry behind it is a broken record, not a task.
    // Dropping it is better than rendering a row nobody can act on.
    if (!lead || !guest) continue;

    const owner = TEAM_BY_ID[followUp.ownerId];
    const roomType = lead.requirement.roomTypeId
      ? ROOM_TYPE_BY_ID[lead.requirement.roomTypeId]
      : undefined;
    const siblings = byLead.get(followUp.leadId) ?? [followUp];

    rows.push({
      id: followUp.id,
      reason: followUp.reason,
      note: followUp.note,
      suggestedAction: followUp.suggestedAction,
      dueAt: followUp.dueAt,
      channel: followUp.channel,
      status: followUp.status,
      isAutomated: followUp.isAutomated,
      completedAt: followUp.completedAt,

      ownerId: followUp.ownerId,
      ownerName: owner?.name ?? "Unassigned",
      ownerInitials: owner?.avatarInitials ?? initials(owner?.name ?? "Unassigned"),

      leadId: lead.id,
      leadReference: lead.reference,
      leadStage: lead.stage,

      guestId: guest.id,
      guestName: guest.name,
      guestInitials: initials(guest.name),
      company: guest.company,
      isReturningGuest: lead.isReturningGuest,

      value: leadValue(lead),
      valueIsQuoted: lead.commercials.quotedValue !== undefined,
      paymentStatus: lead.commercials.paymentStatus,
      quotedAt:
        lead.commercials.quotedValue !== undefined ? quotedAtFor(lead.id) : undefined,

      checkIn: lead.requirement.checkIn,
      checkOut: lead.requirement.checkOut,
      nights: lead.requirement.nights,
      rooms: lead.requirement.rooms,
      roomTypeName: roomType?.name,

      sequenceIndex: siblings.findIndex((s) => s.id === followUp.id) + 1,
      sequenceTotal: siblings.length,
      ...attemptsFor(siblings),
    });
  }

  return rows;
}
