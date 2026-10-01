import { daysAgo, demoDate, hoursAgo } from "@/lib/clock";
import { quoteTotals } from "@/lib/quote";
import type { Booking, MealPlan, Paise } from "@/types";

const HOTEL_ID = "htl_grand_meridian";

/**
 * GST on hotel accommodation is banded by tariff: 12% at or below Rs 7,500 a
 * night, 18% above it. Deriving the money instead of typing it means the
 * arrival list, the revenue metric and the folio can never disagree.
 *
 * The band itself lives in `lib/quote.ts`, because the quote an operator sends
 * from the lead workspace has to produce the same total this ledger would.
 */
function money(nightlyRate: Paise, rooms: number, nights: number) {
  const { subtotal, taxes, total } = quoteTotals(nightlyRate, rooms, nights);
  return { subtotal, taxes, total };
}

type Draft = Omit<Booking, "hotelId" | "subtotal" | "taxes" | "total" | "amountPaid"> & {
  /** Only consulted when the stay carries a part payment. */
  amountPaidPct?: number;
};

function build(d: Draft): Booking {
  const { subtotal, taxes, total } = money(d.nightlyRate, d.rooms, d.nights);
  const paid =
    d.paymentStatus === "paid"
      ? total
      : d.paymentStatus === "advance_paid"
        ? Math.round(total * (d.amountPaidPct ?? 0.3))
        : d.paymentStatus === "refunded"
          ? 0
          : 0;
  const { amountPaidPct: _ignored, ...rest } = d;
  void _ignored;
  return { ...rest, hotelId: HOTEL_ID, subtotal, taxes, total, amountPaid: paid };
}

const BF: MealPlan = "breakfast";

/**
 * The booking ledger for the demo day.
 *
 * Shaped around 19 September 2026: five arrivals, four departures and a house
 * already holding guests, plus a tail of completed stays that gives the revenue
 * and repeat-guest numbers something real to sum over.
 */
export const BOOKINGS: Booking[] = [
  // --- Arriving today ------------------------------------------------------
  build({
    id: "bkg_001",
    reference: "GM-26-4181",
    guestId: "gst_rohan_mehta",
    leadId: "led_026",
    status: "confirmed",
    checkIn: demoDate(0),
    checkOut: demoDate(2),
    nights: 2,
    roomTypeId: "rt_executive",
    roomNumbers: ["404", "406"],
    rooms: 2,
    adults: 2,
    children: 0,
    mealPlan: BF,
    nightlyRate: 1092500,
    paymentStatus: "paid",
    source: "whatsapp",
    createdById: "tm_manager",
    createdAt: daysAgo(14),
    specialRequests: ["High floor", "Late dinner on arrival"],
  }),
  build({
    id: "bkg_002",
    reference: "GM-26-4178",
    guestId: "gst_arun_krishnan",
    status: "confirmed",
    checkIn: demoDate(0),
    checkOut: demoDate(3),
    nights: 3,
    roomTypeId: "rt_premium",
    roomNumbers: ["507"],
    rooms: 1,
    adults: 2,
    children: 0,
    mealPlan: BF,
    nightlyRate: 807500,
    paymentStatus: "advance_paid",
    amountPaidPct: 0.4,
    source: "phone",
    createdById: "tm_reservations",
    createdAt: daysAgo(9),
    specialRequests: ["Airport pickup at 15:40"],
  }),
  build({
    id: "bkg_005",
    reference: "GM-26-4175",
    guestId: "gst_harpreet_singh",
    status: "confirmed",
    checkIn: demoDate(0),
    checkOut: demoDate(1),
    nights: 1,
    roomTypeId: "rt_deluxe",
    roomNumbers: ["208"],
    rooms: 1,
    adults: 1,
    children: 0,
    mealPlan: "room_only",
    nightlyRate: 617500,
    paymentStatus: "paid",
    source: "booking_com",
    // Same-day OTA reservation; the activity log records it at 00:20 (ev_106).
    createdAt: hoursAgo(11),
    specialRequests: [],
  }),
  build({
    id: "bkg_006",
    reference: "GM-26-4174",
    guestId: "gst_ananya_bose",
    status: "confirmed",
    checkIn: demoDate(0),
    checkOut: demoDate(2),
    nights: 2,
    roomTypeId: "rt_deluxe",
    roomNumbers: ["110", "111"],
    rooms: 2,
    adults: 4,
    children: 1,
    mealPlan: BF,
    nightlyRate: 650000,
    paymentStatus: "advance_paid",
    amountPaidPct: 0.5,
    source: "website",
    createdById: "tm_reservations",
    createdAt: daysAgo(11),
    specialRequests: ["Cot required", "Connecting rooms"],
  }),
  build({
    id: "bkg_007",
    reference: "GM-26-4171",
    guestId: "gst_tanvi_desai",
    status: "confirmed",
    checkIn: demoDate(0),
    checkOut: demoDate(1),
    nights: 1,
    roomTypeId: "rt_premium",
    roomNumbers: ["509"],
    rooms: 1,
    adults: 2,
    children: 0,
    mealPlan: BF,
    nightlyRate: 850000,
    paymentStatus: "paid",
    source: "website",
    createdAt: daysAgo(6),
    specialRequests: ["Quiet room away from the lift"],
  }),

  // --- In house ------------------------------------------------------------
  build({
    id: "bkg_003",
    reference: "GM-26-4168",
    guestId: "gst_lakshmi_pillai",
    leadId: "led_028",
    status: "checked_in",
    checkIn: demoDate(-1),
    checkOut: demoDate(2),
    nights: 3,
    roomTypeId: "rt_executive",
    roomNumbers: ["412"],
    rooms: 1,
    adults: 2,
    children: 0,
    mealPlan: BF,
    nightlyRate: 1092500,
    paymentStatus: "paid",
    source: "whatsapp",
    createdById: "tm_manager",
    createdAt: daysAgo(16),
    specialRequests: ["Room 412", "Filter coffee at 06:30"],
  }),
  build({
    id: "bkg_008",
    reference: "GM-26-4165",
    guestId: "gst_imran_qureshi",
    status: "checked_in",
    checkIn: demoDate(-5),
    checkOut: demoDate(2),
    nights: 7,
    roomTypeId: "rt_deluxe",
    roomNumbers: ["101", "102", "103"],
    rooms: 3,
    adults: 3,
    children: 0,
    mealPlan: "full_board",
    nightlyRate: 520000,
    paymentStatus: "advance_paid",
    amountPaidPct: 0.5,
    source: "whatsapp",
    createdById: "tm_manager",
    createdAt: daysAgo(21),
    specialRequests: ["Ground floor for equipment", "Laundry alternate days"],
  }),
  build({
    id: "bkg_009",
    reference: "GM-26-4162",
    guestId: "gst_deepak_joshi",
    status: "checked_in",
    checkIn: demoDate(-2),
    checkOut: demoDate(1),
    nights: 3,
    roomTypeId: "rt_premium",
    roomNumbers: ["504"],
    rooms: 1,
    adults: 1,
    children: 0,
    mealPlan: BF,
    nightlyRate: 807500,
    paymentStatus: "paid",
    source: "email",
    createdById: "tm_reservations",
    createdAt: daysAgo(13),
    specialRequests: ["Early breakfast at 06:30"],
  }),
  build({
    id: "bkg_010",
    reference: "GM-26-4159",
    guestId: "gst_zoya_khan",
    status: "checked_in",
    checkIn: demoDate(-1),
    checkOut: demoDate(1),
    nights: 2,
    roomTypeId: "rt_suite",
    roomNumbers: ["603"],
    rooms: 1,
    adults: 2,
    children: 0,
    mealPlan: "half_board",
    nightlyRate: 1757500,
    paymentStatus: "paid",
    source: "whatsapp",
    createdById: "tm_sales",
    createdAt: daysAgo(10),
    specialRequests: ["Balcony suite", "Sparkling water in the minibar"],
  }),
  build({
    id: "bkg_012",
    reference: "GM-26-4153",
    guestId: "gst_vivek_menon",
    status: "checked_in",
    checkIn: demoDate(-2),
    checkOut: demoDate(2),
    nights: 4,
    roomTypeId: "rt_premium",
    roomNumbers: ["511", "512"],
    rooms: 2,
    adults: 2,
    children: 0,
    mealPlan: BF,
    nightlyRate: 807500,
    paymentStatus: "advance_paid",
    amountPaidPct: 0.3,
    source: "email",
    createdById: "tm_reservations",
    createdAt: daysAgo(15),
    specialRequests: ["GST invoice to Kestrel Systems"],
  }),

  // --- Departing today -----------------------------------------------------
  build({
    id: "bkg_011",
    reference: "GM-26-4156",
    guestId: "gst_pooja_bhatt",
    status: "checked_in",
    checkIn: demoDate(-3),
    checkOut: demoDate(0),
    nights: 3,
    roomTypeId: "rt_deluxe",
    roomNumbers: ["204", "205"],
    rooms: 2,
    adults: 4,
    children: 0,
    mealPlan: BF,
    nightlyRate: 617500,
    paymentStatus: "paid",
    source: "website",
    createdById: "tm_sales",
    createdAt: daysAgo(17),
    specialRequests: [],
  }),
  build({
    id: "bkg_004",
    reference: "GM-26-4150",
    guestId: "gst_bhaskar_rao",
    leadId: "led_027",
    status: "checked_in",
    checkIn: demoDate(-2),
    checkOut: demoDate(0),
    nights: 2,
    roomTypeId: "rt_executive",
    roomNumbers: ["408"],
    rooms: 1,
    adults: 1,
    children: 0,
    mealPlan: BF,
    nightlyRate: 1150000,
    paymentStatus: "paid",
    source: "phone",
    createdById: "tm_reservations",
    createdAt: daysAgo(12),
    specialRequests: ["Airport drop at 05:00"],
  }),
  build({
    id: "bkg_013",
    reference: "GM-26-4147",
    guestId: "gst_neha_saxena",
    status: "checked_in",
    checkIn: demoDate(-2),
    checkOut: demoDate(0),
    nights: 2,
    roomTypeId: "rt_deluxe",
    roomNumbers: ["302"],
    rooms: 1,
    adults: 2,
    children: 0,
    mealPlan: BF,
    nightlyRate: 650000,
    paymentStatus: "paid",
    source: "website",
    createdAt: daysAgo(8),
    specialRequests: [],
  }),
  build({
    id: "bkg_014",
    reference: "GM-26-4144",
    guestId: "gst_aditya_verma",
    status: "checked_in",
    checkIn: demoDate(-4),
    checkOut: demoDate(0),
    nights: 4,
    roomTypeId: "rt_deluxe",
    roomNumbers: ["206"],
    rooms: 1,
    adults: 1,
    children: 0,
    mealPlan: "room_only",
    nightlyRate: 585000,
    paymentStatus: "paid",
    source: "booking_com",
    createdAt: daysAgo(19),
    specialRequests: [],
  }),

  // --- Future, confirmed ---------------------------------------------------
  build({
    id: "bkg_015",
    reference: "GM-26-4141",
    guestId: "gst_meenakshi_iyer",
    leadId: "led_024",
    status: "pending",
    checkIn: demoDate(1),
    checkOut: demoDate(3),
    nights: 2,
    roomTypeId: "rt_deluxe",
    roomNumbers: [],
    rooms: 1,
    adults: 2,
    children: 0,
    mealPlan: BF,
    nightlyRate: 617500,
    paymentStatus: "unpaid",
    source: "whatsapp",
    createdById: "tm_reservations",
    createdAt: daysAgo(6),
    specialRequests: ["Vegetarian meals only"],
  }),
  build({
    id: "bkg_016",
    reference: "GM-26-4138",
    guestId: "gst_sanjana_rao",
    status: "confirmed",
    checkIn: demoDate(7),
    checkOut: demoDate(9),
    nights: 2,
    roomTypeId: "rt_premium",
    roomNumbers: [],
    rooms: 1,
    adults: 2,
    children: 0,
    mealPlan: BF,
    nightlyRate: 850000,
    paymentStatus: "advance_paid",
    amountPaidPct: 0.3,
    source: "website",
    createdAt: daysAgo(4),
    specialRequests: [],
  }),
  build({
    id: "bkg_017",
    reference: "GM-26-4135",
    guestId: "gst_manish_gupta",
    status: "confirmed",
    checkIn: demoDate(12),
    checkOut: demoDate(15),
    nights: 3,
    roomTypeId: "rt_deluxe",
    roomNumbers: [],
    rooms: 2,
    adults: 2,
    children: 0,
    mealPlan: "half_board",
    nightlyRate: 585000,
    paymentStatus: "advance_paid",
    amountPaidPct: 0.25,
    source: "phone",
    createdById: "tm_manager",
    createdAt: daysAgo(7),
    specialRequests: ["Monthly billing to Coreline Steel"],
  }),

  // --- Completed -----------------------------------------------------------
  build({
    id: "bkg_018",
    reference: "GM-26-4102",
    guestId: "gst_kavya_nair",
    status: "checked_out",
    checkIn: demoDate(-34),
    checkOut: demoDate(-31),
    nights: 3,
    roomTypeId: "rt_suite",
    roomNumbers: ["601"],
    rooms: 1,
    adults: 2,
    children: 0,
    mealPlan: "half_board",
    nightlyRate: 1665000,
    paymentStatus: "paid",
    source: "whatsapp",
    createdById: "tm_manager",
    createdAt: daysAgo(48),
    specialRequests: ["Jasmine flowers on arrival"],
  }),
  build({
    id: "bkg_019",
    reference: "GM-26-4096",
    guestId: "gst_fatima_ansari",
    status: "checked_out",
    checkIn: demoDate(-27),
    checkOut: demoDate(-25),
    nights: 2,
    roomTypeId: "rt_deluxe",
    roomNumbers: ["309"],
    rooms: 1,
    adults: 2,
    children: 0,
    mealPlan: BF,
    nightlyRate: 617500,
    paymentStatus: "paid",
    source: "whatsapp",
    createdById: "tm_reception",
    createdAt: daysAgo(40),
    specialRequests: ["Non-smoking floor"],
  }),
  build({
    id: "bkg_020",
    reference: "GM-26-4088",
    guestId: "gst_george_thomas",
    status: "cancelled",
    checkIn: demoDate(-20),
    checkOut: demoDate(-18),
    nights: 2,
    roomTypeId: "rt_deluxe",
    roomNumbers: [],
    rooms: 1,
    adults: 2,
    children: 0,
    mealPlan: "room_only",
    nightlyRate: 650000,
    paymentStatus: "refunded",
    source: "booking_com",
    createdAt: daysAgo(30),
    specialRequests: [],
  }),
];

/**
 * Stays that never passed through the enquiry pipeline: OTA inventory, walk-ins
 * and desk bookings. They have no lead, but they hold rooms and they earn money,
 * so occupancy and revenue would both be wrong without them.
 */
interface HouseStay {
  id: string;
  ref: string;
  guestId: string;
  rooms: string[];
  roomTypeId: string;
  nightlyRate: Paise;
  checkInOffset: number;
  checkOutOffset: number;
  adults: number;
  children?: number;
  /**
   * Days between the reservation being made and the guest arriving.
   *
   * Varied per stay rather than held constant, because booking lead time is the
   * shape of the revenue curve: a walk-in books on the day, an OTA guest a week
   * or two out, someone booking direct on the website a month ahead. A single
   * shared value would pile every reservation onto the same two calendar days
   * and make the revenue sparkline a pair of spikes surrounded by nothing.
   */
  leadDays: number;
  source: Booking["source"];
  mealPlan?: MealPlan;
}

const HOUSE_STAYS: HouseStay[] = [
  { id: "bkg_101", ref: "GM-26-4180", guestId: "gst_ravi_chandran", rooms: ["104"], roomTypeId: "rt_deluxe", nightlyRate: 617500, checkInOffset: -1, checkOutOffset: 2, adults: 1, leadDays: 3, source: "booking_com" },
  { id: "bkg_102", ref: "GM-26-4179", guestId: "gst_sunita_menon", rooms: ["105", "106"], roomTypeId: "rt_deluxe", nightlyRate: 650000, checkInOffset: -2, checkOutOffset: 1, adults: 4, children: 2, leadDays: 12, source: "phone" },
  { id: "bkg_103", ref: "GM-26-4177", guestId: "gst_joseph_mathew", rooms: ["107"], roomTypeId: "rt_deluxe", nightlyRate: 585000, checkInOffset: -3, checkOutOffset: 1, adults: 2, leadDays: 18, source: "website" },
  { id: "bkg_104", ref: "GM-26-4176", guestId: "gst_kiran_shetty", rooms: ["108"], roomTypeId: "rt_deluxe", nightlyRate: 693000, checkInOffset: -1, checkOutOffset: 3, adults: 1, leadDays: 0, source: "walk_in", mealPlan: "room_only" },
  { id: "bkg_105", ref: "GM-26-4173", guestId: "gst_anil_dasgupta", rooms: ["109"], roomTypeId: "rt_deluxe", nightlyRate: 552500, checkInOffset: -4, checkOutOffset: 2, adults: 1, leadDays: 9, source: "phone" },
  { id: "bkg_106", ref: "GM-26-4172", guestId: "gst_preethi_raghavan", rooms: ["112"], roomTypeId: "rt_deluxe", nightlyRate: 728000, checkInOffset: -1, checkOutOffset: 1, adults: 2, leadDays: 1, source: "booking_com" },
  { id: "bkg_107", ref: "GM-26-4170", guestId: "gst_mohammed_ilyas", rooms: ["201"], roomTypeId: "rt_deluxe", nightlyRate: 617500, checkInOffset: -2, checkOutOffset: 2, adults: 2, leadDays: 3, source: "google_business" },
  { id: "bkg_108", ref: "GM-26-4169", guestId: "gst_sameer_chaudhary", rooms: ["202", "203"], roomTypeId: "rt_deluxe", nightlyRate: 585000, checkInOffset: -2, checkOutOffset: 3, adults: 2, leadDays: 21, source: "email" },
  { id: "bkg_109", ref: "GM-26-4167", guestId: "gst_nandini_hegde", rooms: ["207"], roomTypeId: "rt_deluxe", nightlyRate: 650000, checkInOffset: -1, checkOutOffset: 1, adults: 1, leadDays: 0, source: "walk_in" },
  { id: "bkg_110", ref: "GM-26-4166", guestId: "gst_vikas_bhatnagar", rooms: ["209"], roomTypeId: "rt_deluxe", nightlyRate: 617500, checkInOffset: -3, checkOutOffset: 2, adults: 2, leadDays: 11, source: "booking_com" },
  { id: "bkg_111", ref: "GM-26-4164", guestId: "gst_ritu_malhotra", rooms: ["210"], roomTypeId: "rt_deluxe", nightlyRate: 585000, checkInOffset: -2, checkOutOffset: 1, adults: 2, leadDays: 26, source: "website" },
  { id: "bkg_112", ref: "GM-26-4163", guestId: "gst_prakash_shenoy", rooms: ["301"], roomTypeId: "rt_deluxe", nightlyRate: 585000, checkInOffset: -1, checkOutOffset: 2, adults: 1, leadDays: 0, source: "walk_in", mealPlan: "room_only" },
  { id: "bkg_113", ref: "GM-26-4161", guestId: "gst_elena_fernandes", rooms: ["303", "304"], roomTypeId: "rt_deluxe", nightlyRate: 650000, checkInOffset: -2, checkOutOffset: 2, adults: 4, leadDays: 4, source: "booking_com" },
  { id: "bkg_114", ref: "GM-26-4160", guestId: "gst_gopal_varma", rooms: ["305"], roomTypeId: "rt_deluxe", nightlyRate: 617500, checkInOffset: -1, checkOutOffset: 1, adults: 2, leadDays: 2, source: "google_business" },
  { id: "bkg_115", ref: "GM-26-4158", guestId: "gst_devika_warrier", rooms: ["308"], roomTypeId: "rt_premium", nightlyRate: 850000, checkInOffset: -1, checkOutOffset: 2, adults: 2, leadDays: 14, source: "website" },
  { id: "bkg_116", ref: "GM-26-4157", guestId: "gst_ashwin_kamath", rooms: ["309"], roomTypeId: "rt_premium", nightlyRate: 765000, checkInOffset: -3, checkOutOffset: 1, adults: 1, leadDays: 8, source: "email" },
  { id: "bkg_117", ref: "GM-26-4155", guestId: "gst_rehana_begum", rooms: ["401"], roomTypeId: "rt_executive", nightlyRate: 1150000, checkInOffset: -1, checkOutOffset: 2, adults: 2, leadDays: 16, source: "phone" },
  { id: "bkg_118", ref: "GM-26-4154", guestId: "gst_aarav_chopra", rooms: ["602"], roomTypeId: "rt_suite", nightlyRate: 1757500, checkInOffset: -2, checkOutOffset: 1, adults: 2, leadDays: 7, source: "booking_com", mealPlan: "half_board" },
];

for (const s of HOUSE_STAYS) {
  BOOKINGS.push(
    build({
      id: s.id,
      reference: s.ref,
      guestId: s.guestId,
      status: "checked_in",
      checkIn: demoDate(s.checkInOffset),
      checkOut: demoDate(s.checkOutOffset),
      nights: s.checkOutOffset - s.checkInOffset,
      roomTypeId: s.roomTypeId,
      roomNumbers: s.rooms,
      rooms: s.rooms.length,
      adults: s.adults,
      children: s.children ?? 0,
      mealPlan: s.mealPlan ?? BF,
      nightlyRate: s.nightlyRate,
      paymentStatus: "paid",
      source: s.source,
      createdAt: daysAgo(-s.checkInOffset + s.leadDays),
      specialRequests: [],
    }),
  );
}

/** Room number to stay, for every guest physically in the building tonight. */
export const HOUSE_OCCUPANCY: Record<string, { guestId: string; bookingId: string }> =
  Object.fromEntries(
    HOUSE_STAYS.flatMap((s) => s.rooms.map((r) => [r, { guestId: s.guestId, bookingId: s.id }])),
  );

/**
 * The forward book: rooms already committed on dates that have not arrived yet.
 *
 * Availability is the difference between what the building holds and what has
 * been sold, so a hotel with no forward book has nothing to show on an
 * inventory matrix and nothing to forecast. Without these the next fourteen
 * days read as an empty hotel, which is not a useful demo and not a truthful
 * one either.
 *
 * Rooms are held by type rather than by number. Front desk assigns a specific
 * room at or near arrival, so writing room numbers here would claim a decision
 * nobody has made yet, and would also let a future stay collide with a room the
 * live floor map has under maintenance.
 *
 * The curve decays with distance and lifts on Fridays and Saturdays, which is
 * what pickup actually looks like: close-in dates are nearly full, the third
 * week is a third full, and weekends run ahead of the weekdays around them.
 */
interface ForwardStay {
  id: string;
  ref: string;
  guestId: string;
  roomTypeId: string;
  rooms: number;
  nightlyRate: Paise;
  checkInOffset: number;
  checkOutOffset: number;
  adults: number;
  children?: number;
  /** Days between the reservation being taken and the demo day. */
  bookedAgo: number;
  source: Booking["source"];
  mealPlan?: MealPlan;
  /** Unpaid is the default: most of the book is held on a card guarantee. */
  payment?: Booking["paymentStatus"];
  request?: string;
}

const FORWARD_STAYS: ForwardStay[] = [
  { id: "bkg_201", ref: "GM-26-4103", guestId: "gst_abhijit_borah", roomTypeId: "rt_premium", rooms: 2, nightlyRate: 722500, checkInOffset: 10, checkOutOffset: 13, adults: 4, bookedAgo: 39, source: "website", payment: "advance_paid", request: "Adjoining rooms if the floor allows" },
  { id: "bkg_202", ref: "GM-26-4104", guestId: "gst_dev_bhattacharya", roomTypeId: "rt_executive", rooms: 5, nightlyRate: 862500, checkInOffset: 9, checkOutOffset: 12, adults: 5, bookedAgo: 38, source: "email", payment: "advance_paid", request: "Board room for eight from 09:00 on all three days" },
  { id: "bkg_203", ref: "GM-26-4105", guestId: "gst_siddharth_rane", roomTypeId: "rt_executive", rooms: 2, nightlyRate: 977500, checkInOffset: 3, checkOutOffset: 6, adults: 2, bookedAgo: 36, source: "email", payment: "paid", request: "Invoice to Kestrel Media with GSTIN on the folio" },
  { id: "bkg_204", ref: "GM-26-4106", guestId: "gst_reema_jhaveri", roomTypeId: "rt_premium", rooms: 2, nightlyRate: 807500, checkInOffset: 12, checkOutOffset: 15, adults: 3, children: 1, bookedAgo: 35, source: "phone", payment: "advance_paid", request: "Extra bed in one room" },
  { id: "bkg_205", ref: "GM-26-4107", guestId: "gst_nirmala_achanta", roomTypeId: "rt_suite", rooms: 2, nightlyRate: 1665000, checkInOffset: 13, checkOutOffset: 16, adults: 4, bookedAgo: 34, source: "phone", mealPlan: "half_board", payment: "advance_paid", request: "Anniversary stay. Cake on the second evening" },
  { id: "bkg_206", ref: "GM-26-4108", guestId: "gst_shruti_kulkarni", roomTypeId: "rt_premium", rooms: 3, nightlyRate: 765000, checkInOffset: 6, checkOutOffset: 8, adults: 6, bookedAgo: 33, source: "website", payment: "advance_paid" },
  { id: "bkg_207", ref: "GM-26-4109", guestId: "gst_sudha_ramaswamy", roomTypeId: "rt_premium", rooms: 2, nightlyRate: 790500, checkInOffset: 5, checkOutOffset: 8, adults: 4, bookedAgo: 32, source: "booking_com" },
  { id: "bkg_208", ref: "GM-26-4110", guestId: "gst_rakesh_jaitley", roomTypeId: "rt_suite", rooms: 1, nightlyRate: 1757500, checkInOffset: 9, checkOutOffset: 12, adults: 2, bookedAgo: 30, source: "website", payment: "advance_paid" },
  { id: "bkg_209", ref: "GM-26-4111", guestId: "gst_indrani_sen", roomTypeId: "rt_deluxe", rooms: 3, nightlyRate: 585000, checkInOffset: 12, checkOutOffset: 15, adults: 5, children: 2, bookedAgo: 28, source: "phone", request: "Three rooms on the same floor" },
  { id: "bkg_210", ref: "GM-26-4112", guestId: "gst_zubin_irani", roomTypeId: "rt_executive", rooms: 2, nightlyRate: 920000, checkInOffset: 13, checkOutOffset: 16, adults: 2, bookedAgo: 26, source: "email", payment: "advance_paid", request: "Late check-out on the last day" },
  { id: "bkg_211", ref: "GM-26-4113", guestId: "gst_yusuf_merchant", roomTypeId: "rt_deluxe", rooms: 2, nightlyRate: 617500, checkInOffset: 10, checkOutOffset: 13, adults: 4, bookedAgo: 24, source: "booking_com" },
  { id: "bkg_212", ref: "GM-26-4114", guestId: "gst_gautam_bhandari", roomTypeId: "rt_premium", rooms: 2, nightlyRate: 850000, checkInOffset: 8, checkOutOffset: 11, adults: 2, children: 2, bookedAgo: 23, source: "website", payment: "advance_paid", request: "High floor, away from the lift" },
  { id: "bkg_213", ref: "GM-26-4115", guestId: "gst_swati_deshmukh", roomTypeId: "rt_deluxe", rooms: 8, nightlyRate: 494000, checkInOffset: 13, checkOutOffset: 15, adults: 16, children: 3, bookedAgo: 22, source: "phone", mealPlan: "full_board", payment: "advance_paid", request: "Wedding party. Rooms held together, early check-in for four" },
  { id: "bkg_214", ref: "GM-26-4116", guestId: "gst_manoj_varughese", roomTypeId: "rt_deluxe", rooms: 2, nightlyRate: 552500, checkInOffset: 9, checkOutOffset: 12, adults: 3, bookedAgo: 21, source: "google_business" },
  { id: "bkg_215", ref: "GM-26-4117", guestId: "gst_naveen_bhatia", roomTypeId: "rt_executive", rooms: 2, nightlyRate: 891250, checkInOffset: 1, checkOutOffset: 4, adults: 2, bookedAgo: 20, source: "email", payment: "paid", request: "Corporate rate as agreed. Folio to Sundial Textiles" },
  { id: "bkg_216", ref: "GM-26-4118", guestId: "gst_ritika_chawla", roomTypeId: "rt_deluxe", rooms: 2, nightlyRate: 585000, checkInOffset: 8, checkOutOffset: 11, adults: 4, bookedAgo: 19, source: "booking_com", payment: "advance_paid" },
  { id: "bkg_217", ref: "GM-26-4119", guestId: "gst_charu_mahadevan", roomTypeId: "rt_suite", rooms: 2, nightlyRate: 1702000, checkInOffset: 5, checkOutOffset: 8, adults: 4, bookedAgo: 17, source: "phone", mealPlan: "half_board", payment: "advance_paid" },
  { id: "bkg_218", ref: "GM-26-4120", guestId: "gst_leela_raghunathan", roomTypeId: "rt_deluxe", rooms: 3, nightlyRate: 617500, checkInOffset: 7, checkOutOffset: 10, adults: 5, children: 1, bookedAgo: 16, source: "website" },
  { id: "bkg_219", ref: "GM-26-4121", guestId: "gst_meghna_sinha", roomTypeId: "rt_deluxe", rooms: 4, nightlyRate: 533000, checkInOffset: 5, checkOutOffset: 10, adults: 7, bookedAgo: 15, source: "email", payment: "advance_paid", request: "Training group. Same wing for all five nights" },
  { id: "bkg_220", ref: "GM-26-4122", guestId: "gst_lalitha_venkatesh", roomTypeId: "rt_executive", rooms: 2, nightlyRate: 908500, checkInOffset: 11, checkOutOffset: 14, adults: 2, bookedAgo: 13, source: "email", payment: "advance_paid" },
  { id: "bkg_221", ref: "GM-26-4123", guestId: "gst_sneha_karanth", roomTypeId: "rt_deluxe", rooms: 4, nightlyRate: 676000, checkInOffset: 6, checkOutOffset: 8, adults: 8, bookedAgo: 12, source: "booking_com", request: "Two twin rooms, two doubles" },
  { id: "bkg_222", ref: "GM-26-4124", guestId: "gst_arvind_sekhri", roomTypeId: "rt_suite", rooms: 1, nightlyRate: 1850000, checkInOffset: 1, checkOutOffset: 3, adults: 2, bookedAgo: 11, source: "phone", mealPlan: "half_board", payment: "paid" },
  { id: "bkg_223", ref: "GM-26-4125", guestId: "gst_anitha_sundaram", roomTypeId: "rt_deluxe", rooms: 3, nightlyRate: 598000, checkInOffset: 1, checkOutOffset: 6, adults: 4, children: 3, bookedAgo: 10, source: "website", payment: "advance_paid", request: "Two connecting rooms for the children" },
  { id: "bkg_224", ref: "GM-26-4126", guestId: "gst_rajiv_sampath", roomTypeId: "rt_premium", rooms: 1, nightlyRate: 833000, checkInOffset: 2, checkOutOffset: 5, adults: 2, bookedAgo: 9, source: "google_business" },
  { id: "bkg_225", ref: "GM-26-4127", guestId: "gst_aisha_rahman", roomTypeId: "rt_deluxe", rooms: 2, nightlyRate: 650000, checkInOffset: 6, checkOutOffset: 9, adults: 3, children: 1, bookedAgo: 9, source: "whatsapp", payment: "advance_paid" },
  { id: "bkg_226", ref: "GM-26-4128", guestId: "gst_pallavi_nayak", roomTypeId: "rt_deluxe", rooms: 3, nightlyRate: 569500, checkInOffset: 4, checkOutOffset: 9, adults: 5, bookedAgo: 8, source: "email", payment: "advance_paid" },
  { id: "bkg_227", ref: "GM-26-4129", guestId: "gst_prateek_anand", roomTypeId: "rt_executive", rooms: 1, nightlyRate: 1035000, checkInOffset: 6, checkOutOffset: 9, adults: 1, bookedAgo: 7, source: "website" },
  { id: "bkg_228", ref: "GM-26-4130", guestId: "gst_karan_ahluwalia", roomTypeId: "rt_deluxe", rooms: 3, nightlyRate: 604500, checkInOffset: 3, checkOutOffset: 8, adults: 6, bookedAgo: 6, source: "booking_com" },
  { id: "bkg_229", ref: "GM-26-4131", guestId: "gst_vinod_thakur", roomTypeId: "rt_premium", rooms: 2, nightlyRate: 782000, checkInOffset: 3, checkOutOffset: 6, adults: 3, bookedAgo: 6, source: "phone", payment: "advance_paid", request: "Site visit party. Early breakfast at 06:30" },
  { id: "bkg_230", ref: "GM-26-4132", guestId: "gst_tarun_gowda", roomTypeId: "rt_deluxe", rooms: 2, nightlyRate: 637000, checkInOffset: 2, checkOutOffset: 7, adults: 2, bookedAgo: 5, source: "whatsapp", payment: "advance_paid" },
  { id: "bkg_231", ref: "GM-26-4133", guestId: "gst_farhan_qadri", roomTypeId: "rt_deluxe", rooms: 3, nightlyRate: 663000, checkInOffset: 2, checkOutOffset: 5, adults: 5, children: 2, bookedAgo: 4, source: "website" },
  { id: "bkg_232", ref: "GM-26-4134", guestId: "gst_kamala_iyengar", roomTypeId: "rt_premium", rooms: 2, nightlyRate: 875500, checkInOffset: 1, checkOutOffset: 4, adults: 4, bookedAgo: 4, source: "phone", payment: "advance_paid" },
  { id: "bkg_233", ref: "GM-26-4136", guestId: "gst_omar_sheikh", roomTypeId: "rt_deluxe", rooms: 2, nightlyRate: 702000, checkInOffset: 1, checkOutOffset: 3, adults: 3, bookedAgo: 3, source: "booking_com" },
  { id: "bkg_234", ref: "GM-26-4137", guestId: "gst_nisha_pandey", roomTypeId: "rt_deluxe", rooms: 2, nightlyRate: 715000, checkInOffset: 1, checkOutOffset: 4, adults: 4, bookedAgo: 2, source: "whatsapp", payment: "advance_paid", request: "Quiet rooms. One guest works nights" },
];

for (const s of FORWARD_STAYS) {
  BOOKINGS.push(
    build({
      id: s.id,
      reference: s.ref,
      guestId: s.guestId,
      status: "confirmed",
      checkIn: demoDate(s.checkInOffset),
      checkOut: demoDate(s.checkOutOffset),
      nights: s.checkOutOffset - s.checkInOffset,
      roomTypeId: s.roomTypeId,
      // Deliberately empty. The room number is chosen on the day.
      roomNumbers: [],
      rooms: s.rooms,
      adults: s.adults,
      children: s.children ?? 0,
      mealPlan: s.mealPlan ?? BF,
      nightlyRate: s.nightlyRate,
      paymentStatus: s.payment ?? "unpaid",
      source: s.source,
      createdAt: daysAgo(s.bookedAgo),
      specialRequests: s.request ? [s.request] : [],
    }),
  );
}

export const BOOKING_BY_ID = Object.fromEntries(BOOKINGS.map((b) => [b.id, b])) as Record<
  string,
  Booking
>;

/** Bookings whose check-in is the demo day. */
export const ARRIVALS_TODAY = BOOKINGS.filter(
  (b) => b.checkIn === demoDate(0) && b.status !== "cancelled",
);

/** Bookings whose check-out is the demo day. */
export const DEPARTURES_TODAY = BOOKINGS.filter(
  (b) => b.checkOut === demoDate(0) && b.status !== "cancelled",
);

/** Already in the building overnight and staying on. */
export const IN_HOUSE = BOOKINGS.filter(
  (b) => b.status === "checked_in" && b.checkIn < demoDate(0) && b.checkOut > demoDate(0),
);
