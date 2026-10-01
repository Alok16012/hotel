/**
 * The drafting assistant (§18, §20).
 *
 * This is the product's intelligence layer as it exists at this stage: a pure,
 * deterministic function over the lead, the guest record, the room type and the
 * live availability count. There is no model call, and the interface never
 * pretends there is one.
 *
 * Two properties matter more than the prose it produces.
 *
 * First, it is grounded. Every draft returns the list of facts it was built
 * from, and the interface shows that list beside the text, so an operator can
 * check the draft against the record without reading the whole thread again.
 *
 * Second, it never promises what the desk has not agreed to. Special requests
 * are repeated back rather than granted, a rate below the floor is flagged
 * instead of offered, and a block larger than the free inventory is never
 * confirmed. Those conditions come back as caveats, which is the assistant
 * saying where a person is still required.
 */

import { formatINR, formatDayMonth, formatStayRange } from "@/lib/format";
import { MEAL_PLAN_INCLUSION, quoteTotals } from "@/lib/quote";
import type { Guest, Lead, Paise, RoomType } from "@/types";

export interface AssistDraft {
  /** Editable message body. The operator owns it the moment it appears. */
  body: string;
  /** One line naming what the draft is trying to achieve. */
  intent: string;
  /** The record the draft was written from, in the operator's language. */
  grounding: string[];
  /** What the assistant could not settle on its own. */
  caveats: string[];
}

interface DraftInput {
  lead: Lead;
  guest: Guest;
  roomType?: RoomType;
  /** Rooms of this type free across every night of the stay. */
  roomsAvailable: number;
  /** Nightly rate the workspace is currently quoting. */
  nightlyRate: Paise;
  ownerName: string;
  hotelName: string;
}

function greeting(lead: Lead, guest: Guest): string {
  const firstName = guest.name.split(" ")[0];
  const formal = lead.source === "email" || lead.source === "booking_com";
  return formal ? `Dear ${guest.name},` : `Hello ${firstName},`;
}

function signOff(ownerName: string, hotelName: string): string {
  return `${ownerName}\n${hotelName}`;
}

function occupancyLine(lead: Lead): string {
  const { adults, children, rooms } = lead.requirement;
  const people = `${adults} ${adults === 1 ? "adult" : "adults"}${
    children > 0 ? ` and ${children} ${children === 1 ? "child" : "children"}` : ""
  }`;
  return `${rooms} ${rooms === 1 ? "room" : "rooms"} for ${people}`;
}

export function draftReply(input: DraftInput): AssistDraft {
  const { lead, guest, roomType, roomsAvailable, nightlyRate, ownerName, hotelName } = input;
  const req = lead.requirement;
  const stay = formatStayRange(req.checkIn, req.checkOut, req.nights);
  const totals = quoteTotals(nightlyRate, req.rooms, req.nights);
  const roomName = roomType?.name ?? "room";

  const grounding: string[] = [
    `Stay: ${stay}`,
    `Requirement: ${occupancyLine(lead)}`,
    roomType ? `Room type on file: ${roomType.name}` : "No room type chosen yet",
    `Rate in the quote: ${formatINR(nightlyRate)} a night`,
    `Availability: ${roomsAvailable} ${roomName.toLowerCase()} ${
      roomsAvailable === 1 ? "room" : "rooms"
    } free across every night`,
  ];
  if (req.mealPlan) grounding.push(MEAL_PLAN_INCLUSION[req.mealPlan]);
  if (lead.isReturningGuest) {
    grounding.push(`Returning guest: ${guest.totalStays} previous stays`);
  }

  const caveats: string[] = [];
  if (req.rooms > roomsAvailable) {
    caveats.push(
      `Only ${roomsAvailable} of the ${req.rooms} rooms asked for are free across the whole stay. The draft does not confirm the full block.`,
    );
  }
  if (req.specialRequests.length > 0) {
    caveats.push(
      `${req.specialRequests.length} special ${
        req.specialRequests.length === 1 ? "request is" : "requests are"
      } repeated back, not granted. Confirm with the department before sending.`,
    );
  }
  if (lead.commercials.requestedValue && lead.commercials.requestedValue < lead.commercials.floorValue) {
    caveats.push(
      `The rate the guest asked for is below the floor of ${formatINR(lead.commercials.floorValue)}. Approval is required before it can be offered.`,
    );
  }

  const requestLines =
    req.specialRequests.length > 0
      ? `\n\nOn your requests, I have noted ${req.specialRequests
          .map((r) => r.toLowerCase())
          .join("; ")}. I will confirm each of these with the team and come back to you.`
      : "";

  switch (lead.stage) {
    case "new":
    case "contacted":
    case "qualified": {
      return {
        intent: "Answer the enquiry with availability and a priced option",
        grounding,
        caveats,
        body: `${greeting(lead, guest)}

Thank you for writing to us about ${stay}. I have checked ${occupancyLine(lead)} and can hold ${Math.min(req.rooms, roomsAvailable)} ${roomName.toLowerCase()} ${Math.min(req.rooms, roomsAvailable) === 1 ? "room" : "rooms"} for you.

The rate works out to ${formatINR(nightlyRate)} per room per night, which comes to ${formatINR(totals.total)} for the full stay including GST.${
          req.mealPlan ? ` ${MEAL_PLAN_INCLUSION[req.mealPlan]}.` : ""
        }${requestLines}

Shall I hold these rooms for you? They are on a provisional block until we hear back.

${signOff(ownerName, hotelName)}`,
      };
    }

    case "quote_sent": {
      return {
        intent: "Chase the quote without discounting it",
        grounding,
        caveats,
        body: `${greeting(lead, guest)}

Following up on the quote for ${stay}: ${formatINR(nightlyRate)} per room per night, ${formatINR(totals.total)} in total including GST.

The rooms are still on a provisional hold, though ${formatDayMonth(req.checkIn)} is filling up. If the dates still work for you I can confirm them today.

Is there anything in the quote you would like me to look at again?

${signOff(ownerName, hotelName)}`,
      };
    }

    case "negotiating": {
      const asked = lead.commercials.requestedValue;
      const floor = lead.commercials.floorValue;
      return {
        intent: "Hold the rate and offer value instead of a discount",
        grounding: asked ? [...grounding, `Guest asked for ${formatINR(asked)}`] : grounding,
        caveats,
        body: `${greeting(lead, guest)}

Thank you for coming back on the rate. I can do ${formatINR(nightlyRate)} per room per night for ${stay}, which brings the stay to ${formatINR(totals.total)} including GST.

That is the best I can hold at this notice${asked && asked < floor ? ", and going lower needs my manager to sign it off" : ""}. What I can add instead is an early check-in at no charge, subject to the rooms being ready on the morning.

If that works, I will confirm the booking now.

${signOff(ownerName, hotelName)}`,
      };
    }

    case "payment_pending": {
      return {
        intent: "Collect the advance and confirm the booking",
        grounding,
        caveats,
        body: `${greeting(lead, guest)}

Your rooms for ${stay} are held and ready to confirm. The total is ${formatINR(totals.total)} including GST, and an advance of ${formatINR(Math.round(totals.total * 0.3))} confirms them.

I can send a payment link on this number, or share our bank details if a transfer is easier. The hold runs until this evening, after which the rooms go back into inventory.

${signOff(ownerName, hotelName)}`,
      };
    }

    case "booked": {
      return {
        intent: "Prepare the arrival",
        grounding,
        caveats,
        body: `${greeting(lead, guest)}

Looking forward to welcoming you on ${formatDayMonth(req.checkIn)}. Your ${occupancyLine(lead)} ${
          req.rooms === 1 ? "is" : "are"
        } confirmed, check-in is from 2 PM and check-out at 11 AM.

If you share your arrival time I will have the rooms ready and keep someone at the desk for you.${requestLines}

${signOff(ownerName, hotelName)}`,
      };
    }

    case "lost":
    default: {
      return {
        intent: "Leave the door open for the next set of dates",
        grounding,
        caveats,
        body: `${greeting(lead, guest)}

Sorry we could not make ${stay} work this time. If your plans shift, do write to me directly and I will see what I can hold for you.

We usually have better availability midweek, and I am happy to keep an eye out for the dates you need.

${signOff(ownerName, hotelName)}`,
      };
    }
  }
}
