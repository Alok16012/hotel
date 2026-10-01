import { hoursAgo, minutesAgo } from "@/lib/clock";
import { GUEST_BY_ID } from "./guests";
import { TEAM_BY_ID } from "./team";
import type {
  Conversation,
  LeadSource,
  Message,
  MessageAttachment,
  MessageDeliveryStatus,
} from "@/types";

/**
 * Conversation threads (§13).
 *
 * These are written as they would actually arrive: guests who do not state
 * their dates, staff who answer in fragments, automated acknowledgements that
 * are clearly labelled as automated, and internal notes that the guest never
 * sees. The automated turns are marked `isAutomated` so the interface can show
 * a person exactly which words were not written by a colleague — the product
 * loses its credibility the moment that distinction blurs (§20).
 *
 * Threads are stored oldest-first, which is the order the transcript renders.
 *
 * `lastMessageAt` here can be more recent than the lead's `lastActivityAt`, and
 * that is deliberate: a colleague leaving an internal note does not reset the
 * clock on how long a guest has been waiting for a reply. Guest messages, staff
 * replies and system entries move the lead's clock; notes do not.
 */

type Turn =
  | { from: "guest"; body: string; at: string; attachments?: MessageAttachment[] }
  | {
      from: "staff";
      who: string;
      body: string;
      at: string;
      status?: MessageDeliveryStatus;
      attachments?: MessageAttachment[];
    }
  | { from: "auto"; who: string; body: string; at: string; attachments?: MessageAttachment[] }
  | { from: "note"; who: string; body: string; at: string }
  | { from: "system"; body: string; at: string };

function thread(
  id: string,
  leadId: string,
  guestId: string,
  channel: LeadSource,
  unreadCount: number,
  turns: Turn[],
): Conversation {
  const guestName = GUEST_BY_ID[guestId]?.name ?? "Guest";

  const messages: Message[] = turns.map((t, i) => {
    const base = {
      id: `${id}_m${i + 1}`,
      conversationId: id,
      sentAt: t.at,
      channel,
    };

    switch (t.from) {
      case "guest":
        return {
          ...base,
          authorKind: "guest" as const,
          authorId: guestId,
          authorName: guestName,
          body: t.body,
          status: "read" as const,
          attachments: t.attachments,
        };
      case "staff":
        return {
          ...base,
          authorKind: "staff" as const,
          authorId: t.who,
          authorName: TEAM_BY_ID[t.who]?.name ?? "Team",
          body: t.body,
          status: t.status ?? ("read" as const),
          attachments: t.attachments,
        };
      case "auto":
        return {
          ...base,
          authorKind: "staff" as const,
          authorId: t.who,
          authorName: TEAM_BY_ID[t.who]?.name ?? "Team",
          body: t.body,
          status: "delivered" as const,
          isAutomated: true,
          attachments: t.attachments,
        };
      case "note":
        return {
          ...base,
          authorKind: "internal_note" as const,
          authorId: t.who,
          authorName: TEAM_BY_ID[t.who]?.name ?? "Team",
          body: t.body,
          status: "sent" as const,
        };
      case "system":
        return {
          ...base,
          authorKind: "system" as const,
          authorName: "System",
          body: t.body,
          status: "sent" as const,
        };
    }
  });

  return {
    id,
    leadId,
    guestId,
    channel,
    messages,
    unreadCount,
    lastMessageAt: messages[messages.length - 1].sentAt,
  };
}

export const CONVERSATIONS: Conversation[] = [
  thread("cnv_001", "led_001", "gst_priya_sharma", "whatsapp", 3, [
    {
      from: "guest",
      at: minutesAgo(52),
      body: "Hello, I found you through the wedding packages page. Do you take group bookings in November?",
    },
    {
      from: "auto",
      who: "tm_sales",
      at: minutesAgo(51),
      body: "Thank you for writing to Grand Meridian. Yes, we host wedding groups. Could you share your dates and approximate room count so the right person can put a package together for you?",
    },
    {
      from: "guest",
      at: minutesAgo(38),
      body: "12th to 14th November. My brother's wedding. The venue is nearby so we only need rooms and meals.",
    },
    {
      from: "guest",
      at: minutesAgo(21),
      body: "We need 14 rooms for 2 nights. Can you share the wedding package with meals included?",
    },
    {
      from: "system",
      at: minutesAgo(20),
      body: "14 deluxe rooms are available for 12-14 Nov. 16 remain unsold across both nights.",
    },
    {
      from: "guest",
      at: minutesAgo(7),
      body: "Also please tell me if the couple's families can have connecting rooms, and whether we can do a small haldi setup in the lawn on the morning of the 13th.",
    },
  ]),

  thread("cnv_002", "led_002", "gst_rohan_mehta", "whatsapp", 2, [
    {
      from: "guest",
      at: minutesAgo(64),
      body: "Hi Anjali, Rohan here from Vector Labs. Planning the next Bengaluru review.",
    },
    {
      from: "auto",
      who: "tm_manager",
      at: minutesAgo(63),
      body: "Good morning Mr Mehta, good to hear from you. I have your file open: executive rooms, high floor, breakfast, invoice to Vector Labs. What dates are you looking at?",
    },
    {
      from: "guest",
      at: minutesAgo(34),
      body: "Same as last time please, 4 executive rooms, 30th to 2nd. Invoice to the company.",
    },
    {
      from: "guest",
      at: minutesAgo(18),
      body: "And if the corporate rate from last quarter still stands I can confirm today itself.",
    },
  ]),

  thread("cnv_003", "led_003", "gst_sanjana_rao", "website", 1, [
    {
      from: "guest",
      at: minutesAgo(42),
      body: "Do you allow small pets? We have a 6kg beagle travelling with us. Looking at 22nd and 23rd September for one deluxe room.",
    },
    {
      from: "auto",
      who: "tm_reception",
      at: minutesAgo(41),
      body: "Thank you for your enquiry. Our published policy does not allow pets, so I have passed this to a colleague who can tell you whether an exception is possible. You will hear back this morning.",
    },
    {
      from: "note",
      who: "tm_owner",
      at: minutesAgo(33),
      body: "Ground floor only, no lawn access, Rs 1,500 cleaning deposit. One-off, and not to be put in writing as a policy change.",
    },
  ]),

  thread("cnv_004", "led_004", "gst_vivek_menon", "email", 1, [
    {
      from: "guest",
      at: minutesAgo(94),
      body: "Attaching our travel requisition. Need 8 rooms and a meeting room for the 9th. Premium category if available, breakfast included, and we will need a GST invoice against Kestrel Systems.",
      attachments: [
        {
          id: "att_001",
          kind: "document",
          name: "Kestrel-travel-requisition-Oct.pdf",
          sizeLabel: "214 KB",
        },
      ],
    },
  ]),

  thread("cnv_005", "led_006", "gst_divya_reddy", "instagram", 2, [
    {
      from: "guest",
      at: hoursAgo(15),
      body: "Saw your reel! Can 2 adults and 2 kids fit in one executive room?",
    },
    {
      from: "auto",
      who: "tm_telecaller",
      at: minutesAgo(890),
      body: "Thanks for reaching out. Our desk is closed for the night, so someone will come back to you after 9am with room options and family pricing.",
    },
    {
      from: "guest",
      at: hoursAgo(14),
      body: "Sure. Kids are 6 and 9. Also what are the pool timings for children?",
    },
  ]),

  thread("cnv_006", "led_012", "gst_nikhil_agarwal", "email", 0, [
    {
      from: "guest",
      at: hoursAgo(50),
      body: "We are planning a four-day residential training for 40 people in November. Looking for 22 rooms, full board, and a conference room with a projector and sound. Please send a proposal.",
    },
    {
      from: "staff",
      who: "tm_sales",
      at: hoursAgo(49),
      body: "Thank you Mr Agarwal. Four days and 22 rooms is a straightforward block for us in that window. Before I price it, will all 40 participants be residential, or are some local?",
    },
    { from: "guest", at: hoursAgo(26), body: "All 40 residential. Twin sharing for 18 of them." },
    {
      from: "staff",
      who: "tm_sales",
      at: hoursAgo(25),
      body: "Understood. Two tea breaks a day and lunch in the hall, or in the restaurant?",
    },
    { from: "guest", at: hoursAgo(21), body: "In the hall, so we do not lose time." },
    {
      from: "guest",
      at: hoursAgo(4),
      body: "One thing to flag: we are comparing two other properties and will shortlist on Monday morning.",
    },
    {
      from: "note",
      who: "tm_sales",
      at: hoursAgo(3),
      body: "Highest-value open lead on the board at Rs 5.72 lakh. Hall rate from ops is pending and I need it today, not Monday.",
    },
  ]),

  thread("cnv_007", "led_013", "gst_imran_qureshi", "whatsapp", 0, [
    {
      from: "guest",
      at: hoursAgo(27),
      body: "Anjali, the project crew is back from the 27th. Six rooms, three weeks this time.",
    },
    {
      from: "staff",
      who: "tm_manager",
      at: hoursAgo(26),
      body: "Good to hear from you Mr Qureshi. Six deluxe, ground floor for the equipment, laundry alternate days, monthly invoice, same as March?",
    },
    { from: "guest", at: hoursAgo(25), body: "Exactly the same. But the budget is tighter." },
    {
      from: "guest",
      at: hoursAgo(24),
      body: "Asking Rs 4,000 per night for the 21-night block. That is under our floor, I know, but it is a large commitment.",
    },
    {
      from: "system",
      at: hoursAgo(5),
      body: "Rate request is Rs 300 below the deluxe floor of Rs 4,300. Raised as exception EX-0312 for approval.",
    },
    {
      from: "note",
      who: "tm_reservations",
      at: hoursAgo(2),
      body: "Deluxe is 62% sold across those 21 nights, so we are not giving away scarce stock. Countering at the floor with full board is defensible.",
    },
  ]),

  thread("cnv_008", "led_016", "gst_kavya_nair", "whatsapp", 0, [
    {
      from: "guest",
      at: hoursAgo(51),
      body: "Anjali, I am coming down on the 23rd for three nights. Is 601 free?",
    },
    {
      from: "staff",
      who: "tm_manager",
      at: hoursAgo(51),
      body: "It is, and I have put a hold on it for you. Jasmine on arrival as usual?",
    },
    {
      from: "guest",
      at: hoursAgo(50),
      body: "Please. And transfers both ways this time, the flight lands late.",
    },
    {
      from: "staff",
      who: "tm_manager",
      at: hoursAgo(27),
      body: "Sending the quote now: suite 601, three nights, half board, transfers included.",
      attachments: [
        { id: "att_002", kind: "quote", name: "Quote GM-Q-0318, suite 601", sizeLabel: "1 page" },
      ],
    },
    {
      from: "guest",
      at: hoursAgo(26),
      body: "Rs 17,000 a night would work better for me. Vikram knows how often I am here.",
    },
    {
      from: "note",
      who: "tm_manager",
      at: minutesAgo(70),
      body: "601 is held until 18:00. I am not replying to this myself, it goes to Vikram.",
    },
    {
      from: "system",
      at: hoursAgo(1),
      body: "Guest is flagged as the owner's personal contact. Rate exception routed to Vikram Nair as EX-0311.",
    },
  ]),

  thread("cnv_009", "led_018", "gst_zoya_khan", "whatsapp", 0, [
    { from: "guest", at: hoursAgo(96), body: "Hi, do you have a suite with a balcony?" },
    {
      from: "auto",
      who: "tm_sales",
      at: hoursAgo(96),
      body: "We do, two of our six suites have a private balcony overlooking the garden. May I know your dates?",
    },
    { from: "guest", at: hoursAgo(94), body: "3rd and 4th October, two of us." },
    {
      from: "staff",
      who: "tm_sales",
      at: hoursAgo(21),
      body: "Both balcony suites are free for those nights. Quote attached, with the repeat-guest rate applied.",
      attachments: [
        { id: "att_003", kind: "quote", name: "Quote GM-Q-0314, balcony suite", sizeLabel: "1 page" },
      ],
    },
    {
      from: "system",
      at: minutesAgo(1240),
      body: "Quote delivered and read. No reply since.",
    },
    {
      from: "note",
      who: "tm_sales",
      at: hoursAgo(3),
      body: "She asked for balcony photographs on the call and I never sent them. That is probably the reason for the silence.",
    },
  ]),

  thread("cnv_010", "led_021", "gst_bhaskar_rao", "whatsapp", 0, [
    {
      from: "guest",
      at: hoursAgo(120),
      body: "Three executive rooms for the 24th to 27th. Lounge access as always.",
    },
    {
      from: "staff",
      who: "tm_sales",
      at: hoursAgo(119),
      body: "Noted Mr Rao. Sending the quote this afternoon with lounge access and the 05:00 airport drop included.",
    },
    {
      from: "staff",
      who: "tm_sales",
      at: hoursAgo(96),
      body: "Quote attached: Rs 10,925 per room per night after the repeat-guest discount.",
      attachments: [
        { id: "att_004", kind: "quote", name: "Quote GM-Q-0309, 3 executive", sizeLabel: "1 page" },
      ],
    },
    {
      from: "guest",
      at: hoursAgo(26),
      body: "Can you do 9,200 per night for three rooms? We book here every quarter.",
    },
    {
      from: "system",
      at: hoursAgo(26),
      body: "Rs 9,200 clears the executive floor of Rs 8,050. No approval required.",
    },
    {
      from: "staff",
      who: "tm_sales",
      at: hoursAgo(4),
      body: "I can meet you at Rs 9,200 with lounge access retained. Shall I confirm the three rooms?",
      status: "delivered",
    },
  ]),

  thread("cnv_011", "led_024", "gst_meenakshi_iyer", "whatsapp", 0, [
    {
      from: "guest",
      at: hoursAgo(144),
      body: "One deluxe room for the 20th and 21st. Pure vegetarian meals please.",
    },
    {
      from: "auto",
      who: "tm_reservations",
      at: hoursAgo(144),
      body: "Certainly. Our kitchen runs a separate vegetarian section. Sending you the rate now.",
    },
    {
      from: "staff",
      who: "tm_reservations",
      at: hoursAgo(120),
      body: "Rs 6,175 per night with breakfast, all inclusive of taxes. Payment link below holds the room.",
      attachments: [
        { id: "att_005", kind: "quote", name: "Quote GM-Q-0301, 1 deluxe", sizeLabel: "1 page" },
      ],
    },
    { from: "guest", at: hoursAgo(119), body: "That works. I will pay by this evening." },
    {
      from: "system",
      at: hoursAgo(72),
      body: "Payment link unopened after 48 hours. Room 212 held pending advance.",
    },
    {
      from: "auto",
      who: "tm_reservations",
      at: hoursAgo(24),
      body: "A gentle reminder that your room is held until 18:00 tomorrow. The payment link stays valid until then.",
    },
    {
      from: "note",
      who: "tm_reservations",
      at: hoursAgo(3),
      body: "She arrives tomorrow. Call her. A fourth automated reminder is not going to do it.",
    },
  ]),

  thread("cnv_012", "led_025", "gst_fatima_ansari", "whatsapp", 0, [
    {
      from: "guest",
      at: hoursAgo(168),
      body: "I would like to book again for the 7th and 8th of October. But I never heard back about the air conditioning last time.",
    },
    {
      from: "staff",
      who: "tm_manager",
      at: hoursAgo(167),
      body: "You are right, and I am sorry. The unit in 309 failed on your second night and we did not close the loop with you. Let me put that right.",
    },
    {
      from: "staff",
      who: "tm_manager",
      at: hoursAgo(166),
      body: "I have applied a 15% goodwill discount to this stay and put you on the non-smoking floor, away from the lift. Rs 11,050 for the two nights.",
    },
    { from: "guest", at: hoursAgo(165), body: "Thank you. I will send the advance today." },
    {
      from: "system",
      at: hoursAgo(120),
      body: "Advance of Rs 3,000 received. Balance outstanding.",
    },
    {
      from: "system",
      at: hoursAgo(2),
      body: "Complaint from stay GM-26-4096 has no recorded settlement. Raised as exception EX-0310.",
    },
  ]),

  thread("cnv_013", "led_007", "gst_arun_krishnan", "phone", 0, [
    {
      from: "system",
      at: hoursAgo(28),
      body: "Inbound call, 4 min 20 sec, answered by Sneha Iyer.",
    },
    {
      from: "note",
      who: "tm_reservations",
      at: hoursAgo(27),
      body: "Two premium rooms, 25th and 26th. Airport pickup for both guests. Agreed Rs 8,075 a night verbally. He wants it in writing before Monday.",
    },
    {
      from: "staff",
      who: "tm_reservations",
      at: hoursAgo(3),
      body: "Confirming in writing as promised: two premium rooms at Rs 8,075 per night including breakfast, with airport pickup for both guests.",
      status: "delivered",
    },
  ]),

  thread("cnv_014", "led_008", "gst_harpreet_singh", "booking_com", 0, [
    {
      from: "guest",
      at: hoursAgo(31),
      body: "Enquiry via Booking.com, two deluxe rooms, 5th and 6th October, breakfast included.",
    },
    {
      from: "auto",
      who: "tm_telecaller",
      at: hoursAgo(31),
      body: "Thank you for your enquiry. Both rooms are available. Sending our options now.",
    },
    {
      from: "auto",
      who: "tm_telecaller",
      at: hoursAgo(3),
      body: "If you book with us directly we can offer the same rooms at Rs 5,850 a night instead of Rs 6,500, since we save the platform commission. The booking stays fully cancellable either way.",
    },
  ]),

  thread("cnv_015", "led_005", "gst_suresh_babu", "walk_in", 1, [
    {
      from: "system",
      at: minutesAgo(140),
      body: "Walk-in logged at reception by Karthik Reddy. Single room requested for tonight, paying by card.",
    },
    {
      from: "note",
      who: "tm_reception",
      at: minutesAgo(138),
      body: "Gentleman is waiting in the lobby. 12 deluxe rooms free tonight. He needs a rate and a key.",
    },
  ]),

  thread("cnv_016", "led_017", "gst_deepak_joshi", "email", 0, [
    {
      from: "guest",
      at: hoursAgo(72),
      body: "Two premium rooms for the 29th and 30th. Early breakfast at 06:30 if the kitchen can manage it.",
    },
    {
      from: "auto",
      who: "tm_reservations",
      at: hoursAgo(72),
      body: "The kitchen opens at 06:00, so 06:30 is comfortable. Preparing your quote now.",
    },
    {
      from: "staff",
      who: "tm_reservations",
      at: hoursAgo(26),
      body: "Quote attached with the 5% repeat-guest discount applied: Rs 32,300 for the two rooms across both nights.",
      attachments: [
        { id: "att_006", kind: "quote", name: "Quote GM-Q-0311, 2 premium", sizeLabel: "1 page" },
      ],
    },
    {
      from: "note",
      who: "tm_reservations",
      at: minutesAgo(12),
      body: "He is in house right now on GM-26-4162. Catch him at breakfast instead of emailing a third time.",
    },
  ]),
];

export const CONVERSATION_BY_LEAD = Object.fromEntries(
  CONVERSATIONS.map((c) => [c.leadId, c]),
) as Record<string, Conversation>;

export const CONVERSATION_BY_ID = Object.fromEntries(
  CONVERSATIONS.map((c) => [c.id, c]),
) as Record<string, Conversation>;
