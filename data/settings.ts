import type {
  AutomationRule,
  ContactChannel,
  EscalationRule,
  ResponseTarget,
} from "@/types";
// The chase limit is behaviour, not copy, so the two rules below that describe
// it read it from the same table the follow-up queue enforces.
import { CHASE_LIMIT, chasesAlreadyUnanswered, chasesUnanswered } from "@/lib/automation";

/**
 * The property's standing configuration (§37, §42).
 *
 * Everything here is a decision somebody at the hotel made once and now lives
 * with, which is what separates this screen from the rest of the product: no
 * figure on it is derived, and every row is an instruction the software is
 * expected to obey.
 *
 * The automation table is the important one. The product's claim is that
 * software handles the routine and a person handles the exception, and this is
 * where the line between them is drawn and can be moved. Written as three
 * modes rather than a switch, because the honest middle setting, draft it and
 * wait, is the one most of these enquiries sit in.
 */

/**
 * The ways guests actually reach this property.
 *
 * `reachesInbox` is false for two of them, and that is deliberate. Nobody has
 * connected the channel manager or the Instagram inbox in this build, so the
 * settings screen says which conversations the product can see rather than
 * implying it watches everything a guest might try.
 */
export const CONTACT_CHANNELS: ContactChannel[] = [
  {
    id: "cc_whatsapp",
    source: "whatsapp",
    handle: "+91 80 4718 2200",
    watchedHours: "24 hours",
    ownerRole: "reservations",
    reachesInbox: true,
  },
  {
    id: "cc_phone",
    source: "phone",
    handle: "+91 80 4718 2100",
    watchedHours: "24 hours, night shift after 22:00",
    ownerRole: "reception",
    reachesInbox: true,
  },
  {
    id: "cc_email",
    source: "email",
    handle: "reservations@grandmeridian.in",
    watchedHours: "08:00 to 21:00",
    ownerRole: "reservations",
    reachesInbox: true,
  },
  {
    id: "cc_website",
    source: "website",
    handle: "grandmeridian.in/enquiry",
    watchedHours: "08:00 to 21:00",
    ownerRole: "reservations",
    reachesInbox: true,
  },
  {
    id: "cc_google",
    source: "google_business",
    handle: "Grand Meridian Hotel, Residency Road",
    watchedHours: "08:00 to 21:00",
    ownerRole: "sales",
    reachesInbox: true,
  },
  {
    id: "cc_walk_in",
    source: "walk_in",
    handle: "Front desk, Residency Road",
    watchedHours: "24 hours",
    ownerRole: "reception",
    reachesInbox: true,
  },
  {
    id: "cc_instagram",
    source: "instagram",
    handle: "@grandmeridianblr",
    watchedHours: "10:00 to 19:00",
    ownerRole: "sales",
    reachesInbox: false,
  },
  {
    id: "cc_booking_com",
    source: "booking_com",
    handle: "Booking.com extranet, property 1182446",
    watchedHours: "08:00 to 21:00",
    ownerRole: "reservations",
    reachesInbox: false,
  },
];

/**
 * Where automation is allowed to stop and a person has to start.
 *
 * Ordered from the enquiries a property is comfortable letting software answer
 * to the ones it would never hand over. An owner reading down this list should
 * be able to see the moment the line is crossed.
 */
export const AUTOMATION_RULES: AutomationRule[] = [
  {
    id: "auto_availability",
    label: "Is a room free on these dates",
    example: "Do you have a double for the 24th and 25th?",
    mode: "send",
    rationale:
      "The answer is a number the software already holds, and a guest asking it is usually asking three other properties at the same time.",
    overrides: [
      "The stay runs over a date the rate calendar has flagged",
      "More rooms are asked for than are free on any one night",
    ],
  },
  {
    id: "auto_facts",
    label: "Facts about the property",
    example: "What time is check-in, and is parking free?",
    mode: "send",
    rationale:
      "Check-in time, parking, breakfast and the address do not change, and a person retyping them is a person not answering something harder.",
    overrides: ["The guest asks for an exception to the published policy"],
  },
  {
    id: "auto_quote_standard",
    label: "A price for a standard stay",
    example: "What would two nights in a deluxe room cost?",
    mode: "draft",
    rationale:
      "The rate is calculable, but a quote is a commitment. The draft is written and held so somebody sends it knowingly.",
    overrides: [
      "The quoted rate falls below the published floor",
      "The stay is four nights or longer",
    ],
  },
  {
    id: "auto_followup",
    label: "Chasing a quote that went quiet",
    example: "Following up on the quote sent on Tuesday.",
    mode: "send",
    rationale:
      "Two scheduled chases are better than none, and better than a colleague remembering at midnight.",
    overrides: [chasesAlreadyUnanswered(CHASE_LIMIT.send)],
  },
  {
    id: "auto_group",
    label: "Group and event enquiries",
    example: "We need 12 rooms for a wedding party in November.",
    mode: "human",
    rationale:
      "Volume, meal plans and a rate held for weeks are all negotiated together. No part of that is routine.",
    overrides: [],
  },
  {
    id: "auto_complaint",
    label: "A complaint or a service failure",
    example: "The room was not ready and nobody called us back.",
    mode: "human",
    rationale:
      "An automatic reply to a complaint reads as the property not listening, which is the complaint.",
    overrides: [],
  },
  {
    id: "auto_refund",
    label: "Cancellations and refunds",
    example: "We have to cancel. How much do we get back?",
    mode: "human",
    rationale:
      "Money leaving the property is a decision with a name attached to it.",
    overrides: [],
  },
];

/**
 * What the property undertakes on each channel.
 *
 * The targets differ by channel because guest expectation does. Somebody who
 * messages on WhatsApp is usually still deciding; somebody who writes an email
 * has already accepted they will wait.
 */
export const RESPONSE_TARGETS: ResponseTarget[] = [
  {
    id: "rt_whatsapp",
    source: "whatsapp",
    targetSec: 15 * 60,
    appliesDuring: "08:00 to 22:00",
    afterHours: "Acknowledged automatically, answered by 09:00",
  },
  {
    id: "rt_phone",
    source: "phone",
    targetSec: 5 * 60,
    appliesDuring: "24 hours",
    afterHours: "Night shift takes the call",
  },
  {
    id: "rt_walk_in",
    source: "walk_in",
    targetSec: 2 * 60,
    appliesDuring: "24 hours",
    afterHours: "Night shift is at the desk",
  },
  {
    id: "rt_website",
    source: "website",
    targetSec: 30 * 60,
    appliesDuring: "08:00 to 21:00",
    afterHours: "Answered by 09:00",
  },
  {
    id: "rt_google_business",
    source: "google_business",
    targetSec: 30 * 60,
    appliesDuring: "08:00 to 21:00",
    afterHours: "Answered by 09:00",
  },
  {
    id: "rt_instagram",
    source: "instagram",
    targetSec: 60 * 60,
    appliesDuring: "10:00 to 19:00",
    afterHours: "Answered the next working morning",
  },
  {
    id: "rt_email",
    source: "email",
    targetSec: 2 * 60 * 60,
    appliesDuring: "08:00 to 21:00",
    afterHours: "Answered by 10:00",
  },
  {
    id: "rt_booking_com",
    source: "booking_com",
    targetSec: 2 * 60 * 60,
    appliesDuring: "08:00 to 21:00",
    afterHours: "Answered by 10:00",
  },
];

/**
 * When to interrupt somebody.
 *
 * One of these is off, and it is left visible rather than removed. A property
 * that has switched off the rate-floor alert has made a decision, and the
 * settings screen should show that decision rather than a tidy list of the
 * rules that happen to be on.
 */
export const ESCALATION_RULES: EscalationRule[] = [
  {
    id: "esc_unanswered",
    trigger: "An enquiry passes its response target with no reply",
    afterLabel: "At the target, then again 30 min later",
    notifyRole: "manager",
    channels: ["in_app", "whatsapp"],
    enabled: true,
    expectation: "Answer it, or hand it to whoever is free.",
  },
  {
    id: "esc_vip",
    trigger: "A guest with three or more past stays writes in",
    afterLabel: "Immediately",
    notifyRole: "manager",
    channels: ["in_app"],
    enabled: true,
    expectation: "Decide whether this one is answered personally.",
  },
  {
    id: "esc_complaint",
    trigger: "A message reads as a complaint",
    afterLabel: "Immediately",
    notifyRole: "manager",
    channels: ["in_app", "whatsapp"],
    enabled: true,
    expectation: "Pick it up before the automated reply would have gone.",
  },
  {
    id: "esc_discount",
    trigger: "A discount above the role's ceiling is requested",
    afterLabel: "When the quote is built",
    notifyRole: "manager",
    channels: ["in_app"],
    enabled: true,
    expectation: "Approve the rate or send back a counter.",
  },
  {
    id: "esc_high_value",
    trigger: "An enquiry worth more than ₹1,00,000 arrives",
    afterLabel: "Immediately",
    notifyRole: "sales",
    channels: ["in_app", "email"],
    enabled: true,
    expectation: "Take ownership before it joins the ordinary queue.",
  },
  {
    id: "esc_handover",
    trigger: chasesUnanswered(CHASE_LIMIT.send),
    afterLabel: "Before the third chase is sent",
    notifyRole: "reservations",
    channels: ["in_app"],
    enabled: true,
    expectation: "Call, or close it as lost with a reason.",
  },
  {
    id: "esc_rate_floor",
    trigger: "A rate is sold below the published floor",
    afterLabel: "At confirmation",
    notifyRole: "owner",
    channels: ["email"],
    enabled: false,
    expectation: "Review the week's discounting rather than each booking.",
  },
  {
    id: "esc_overbook",
    trigger: "A room type is sold past its inventory",
    afterLabel: "Immediately",
    notifyRole: "reception",
    channels: ["in_app", "whatsapp"],
    enabled: true,
    expectation: "Move a guest or buy the room back before arrival.",
  },
];
