import { daysAgo, hoursAgo, minutesAgo } from "@/lib/clock";
import type { ExceptionItem } from "@/types";

/**
 * The exception queue (§20) — the part of the product that justifies the rest.
 *
 * Everything the automation layer could settle on its own has already been
 * settled. What surfaces here is only what a human is actually required to
 * decide: money below the floor, a guest the owner personally knows, and a
 * complaint with an unagreed remedy. Three open items is the target, not a
 * coincidence: a queue that is never short is a queue nobody reads.
 *
 * `businessImpact` is signed. Negative means revenue given away against policy.
 */
export const EXCEPTIONS: ExceptionItem[] = [
  {
    id: "exc_001",
    reference: "EX-0312",
    kind: "pricing",
    severity: "high",
    status: "open",
    guestId: "gst_imran_qureshi",
    leadId: "led_013",
    title: "Long-stay rate Rs 300 below the deluxe floor",
    reason:
      "Imran Qureshi has asked for Rs 4,000 per room per night on a 21-night, six-room block. The deluxe floor is Rs 4,300. Over the full block the gap is Rs 37,800.",
    systemRecommendation:
      "Counter at Rs 4,300 with laundry and full board included. The package value covers his ask without breaking the floor, and the block still clears Rs 5.42 lakh.",
    requestedAction: "Approve Rs 4,000/night, counter at the floor, or decline",
    policyThreshold: "Deluxe floor rate Rs 4,300 per night",
    businessImpact: -3780000,
    raisedAt: hoursAgo(5),
    assigneeId: "tm_manager",
    comments: [
      {
        id: "exc_001_c1",
        authorId: "tm_sales",
        authorName: "Meera Krishnan",
        body: "He ran the same crew here in March at Rs 4,350. Holding the floor worked then.",
        createdAt: hoursAgo(4),
      },
      {
        id: "exc_001_c2",
        authorId: "tm_reservations",
        authorName: "Sneha Iyer",
        body: "Deluxe is 62% sold across those 21 nights, so we are not giving away scarce stock.",
        createdAt: hoursAgo(2),
      },
    ],
  },
  {
    id: "exc_002",
    reference: "EX-0311",
    kind: "vip",
    severity: "critical",
    status: "open",
    guestId: "gst_kavya_nair",
    leadId: "led_016",
    title: "Owner's personal contact requesting suite 601 at a discount",
    reason:
      "Kavya Nair has asked for suite 601 for three nights with airport transfers at Rs 17,000 a night. Her file is flagged: any rate exception on her bookings goes to Vikram personally.",
    systemRecommendation:
      "Hold 601 and route to the owner. Do not quote a counter automatically. She is a nine-stay guest with Rs 1.14 lakh lifetime value and the flag is explicit.",
    requestedAction: "Owner decision on the 8% discount and complimentary transfers",
    policyThreshold: "Suite floor rate Rs 12,950 per night",
    businessImpact: -450000,
    raisedAt: hoursAgo(1),
    assigneeId: "tm_owner",
    comments: [
      {
        id: "exc_002_c1",
        authorId: "tm_manager",
        authorName: "Anjali Deshpande",
        body: "601 is held until 18:00. Flagging to Vikram rather than replying myself.",
        createdAt: minutesAgo(48),
      },
    ],
  },
  {
    id: "exc_003",
    kind: "complaint",
    reference: "EX-0310",
    severity: "medium",
    status: "open",
    guestId: "gst_fatima_ansari",
    leadId: "led_025",
    bookingId: "bkg_019",
    title: "Air-conditioning complaint from stay GM-26-4096 still unresolved",
    reason:
      "The air-conditioning in room 309 failed on the second night of her last stay. No compensation has been agreed, and she has since made a fresh booking with a 15% goodwill discount already applied to the quote.",
    systemRecommendation:
      "Confirm the 15% goodwill discount as the settlement and close the complaint in writing before she arrives. Room 310 is already out of service for re-grouting, so the underlying fault is being addressed.",
    requestedAction: "Confirm the discount as final settlement, or offer an alternative remedy",
    businessImpact: -195000,
    raisedAt: hoursAgo(2),
    assigneeId: "tm_manager",
    comments: [
      {
        id: "exc_003_c1",
        authorId: "tm_reception",
        authorName: "Karthik Reddy",
        body: "Maintenance confirmed the coil, not the thermostat. 307 is down for the same reason.",
        createdAt: hoursAgo(1),
      },
    ],
  },

  // --- Recently resolved, kept for the audit trail -------------------------
  {
    id: "exc_004",
    reference: "EX-0309",
    kind: "pricing",
    severity: "medium",
    status: "approved",
    guestId: "gst_bhaskar_rao",
    leadId: "led_021",
    title: "5% repeat-guest discount on three executive rooms",
    reason:
      "Bhaskar Rao asked for Rs 9,200 per night against a Rs 11,500 rack rate. The request sits above the Rs 8,050 floor.",
    systemRecommendation: "Approve. The rate clears the floor and he books quarterly.",
    requestedAction: "Approve the negotiated nightly rate",
    policyThreshold: "Executive floor rate Rs 8,050 per night",
    businessImpact: -517500,
    // Raised before it was resolved, which is not as obvious as it sounds: the
    // resolution screen measures time-to-decision off this pair, and a resolved
    // stamp that predates the raised one reads back as a negative wait.
    raisedAt: hoursAgo(34),
    resolvedAt: hoursAgo(30),
    resolvedById: "tm_manager",
    decisionNote:
      "Approved at the rate he asked for. It clears the executive floor by Rs 1,150 and he has booked every quarter since March 2024.",
    comments: [],
  },
  {
    id: "exc_005",
    reference: "EX-0308",
    kind: "policy",
    severity: "low",
    status: "modified",
    guestId: "gst_sanjana_rao",
    leadId: "led_003",
    title: "Pet request outside the published policy",
    reason: "A guest has asked to bring a 6kg dog. The published policy is no pets.",
    systemRecommendation:
      "Decline politely and offer the boarding kennel two streets away, which the property has used before.",
    requestedAction: "Confirm the exception or hold the policy",
    businessImpact: 0,
    raisedAt: minutesAgo(40),
    resolvedAt: minutesAgo(33),
    resolvedById: "tm_owner",
    decisionNote:
      "Allowed as a one-off against the published policy. Ground floor room, no lawn access, Rs 1,500 cleaning deposit held at check-in. The policy itself does not change.",
    comments: [
      {
        id: "exc_005_c1",
        authorId: "tm_owner",
        authorName: "Vikram Nair",
        body: "Ground floor only, no lawn access, Rs 1,500 cleaning deposit. One-off.",
        createdAt: minutesAgo(33),
      },
    ],
  },
  {
    id: "exc_006",
    reference: "EX-0307",
    kind: "refund",
    severity: "medium",
    status: "approved",
    guestId: "gst_george_thomas",
    bookingId: "bkg_020",
    title: "Full refund on a cancellation inside the 48-hour window",
    reason:
      "Cancelled 31 hours before arrival. Policy allows retention of one night. The guest cited a hospital admission.",
    systemRecommendation:
      "Refund in full. The retained night is Rs 6,500 against a guest relationship worth more than that.",
    requestedAction: "Approve the full refund or retain one night",
    policyThreshold: "One night retained inside 48 hours",
    businessImpact: -650000,
    raisedAt: daysAgo(19),
    // Six hours to decide. Identical stamps would have shown as a refund signed
    // off in zero seconds, which nobody does and nobody should believe.
    resolvedAt: hoursAgo(19 * 24 - 6),
    resolvedById: "tm_manager",
    decisionNote:
      "Refunded in full, including the night policy allows us to keep. Hospital admission, documented, and he has stayed eleven times.",
    comments: [],
  },
];

export const OPEN_EXCEPTIONS = EXCEPTIONS.filter((e) => e.status === "open");

export const EXCEPTION_BY_ID = Object.fromEntries(EXCEPTIONS.map((e) => [e.id, e])) as Record<
  string,
  ExceptionItem
>;
