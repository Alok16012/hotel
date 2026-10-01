import { HOUSE_OCCUPANCY } from "./bookings";
import type { Room, RoomStatus } from "@/types";

const HOTEL_ID = "htl_grand_meridian";

/**
 * The physical building. Six floors, 66 keys, laid out the way the property
 * actually sells: deluxe stock low, suites at the top.
 *
 *   Floor 1-2   101-112, 201-212   Deluxe     (24)
 *   Floor 3     301-306            Deluxe     (6)
 *               307-312            Premium    (6)
 *   Floor 4     401-412            Executive  (12)
 *   Floor 5     501-512            Premium    (12)
 *   Floor 6     601-606            Suite      (6)
 *
 * Room state is derived from the booking ledger rather than invented, so the
 * inventory map and the arrivals list cannot drift apart. Only the exceptions —
 * rooms out of order, rooms held for a pending decision — are stated by hand.
 */

interface FloorPlan {
  floor: number;
  from: number;
  to: number;
  roomTypeId: string;
}

const FLOOR_PLAN: FloorPlan[] = [
  { floor: 1, from: 101, to: 112, roomTypeId: "rt_deluxe" },
  { floor: 2, from: 201, to: 212, roomTypeId: "rt_deluxe" },
  { floor: 3, from: 301, to: 306, roomTypeId: "rt_deluxe" },
  { floor: 3, from: 307, to: 312, roomTypeId: "rt_premium" },
  { floor: 4, from: 401, to: 412, roomTypeId: "rt_executive" },
  { floor: 5, from: 501, to: 512, roomTypeId: "rt_premium" },
  { floor: 6, from: 601, to: 606, roomTypeId: "rt_suite" },
];

/**
 * Rooms with a guest in them right now. The pipeline stays are listed here; the
 * OTA and walk-in stays are merged in from the booking ledger so there is one
 * source of truth for who is in which room.
 */
const OCCUPIED: Record<string, { guestId: string; bookingId: string }> = {
  ...HOUSE_OCCUPANCY,
  "101": { guestId: "gst_imran_qureshi", bookingId: "bkg_008" },
  "102": { guestId: "gst_imran_qureshi", bookingId: "bkg_008" },
  "103": { guestId: "gst_imran_qureshi", bookingId: "bkg_008" },
  "412": { guestId: "gst_lakshmi_pillai", bookingId: "bkg_003" },
  "504": { guestId: "gst_deepak_joshi", bookingId: "bkg_009" },
  "511": { guestId: "gst_vivek_menon", bookingId: "bkg_012" },
  "512": { guestId: "gst_vivek_menon", bookingId: "bkg_012" },
  "603": { guestId: "gst_zoya_khan", bookingId: "bkg_010" },
};

/** Still occupied this morning, checking out by 11:00. */
const DEPARTING: Record<string, { guestId: string; bookingId: string }> = {
  "204": { guestId: "gst_pooja_bhatt", bookingId: "bkg_011" },
  "205": { guestId: "gst_pooja_bhatt", bookingId: "bkg_011" },
  "206": { guestId: "gst_aditya_verma", bookingId: "bkg_014" },
  "302": { guestId: "gst_neha_saxena", bookingId: "bkg_013" },
  "408": { guestId: "gst_bhaskar_rao", bookingId: "bkg_004" },
};

/** Blocked for a guest arriving after 14:00 today. */
const ARRIVING: Record<string, { guestId: string; bookingId: string }> = {
  "110": { guestId: "gst_ananya_bose", bookingId: "bkg_006" },
  "111": { guestId: "gst_ananya_bose", bookingId: "bkg_006" },
  "208": { guestId: "gst_harpreet_singh", bookingId: "bkg_005" },
  "404": { guestId: "gst_rohan_mehta", bookingId: "bkg_001" },
  "406": { guestId: "gst_rohan_mehta", bookingId: "bkg_001" },
  "507": { guestId: "gst_arun_krishnan", bookingId: "bkg_002" },
  "509": { guestId: "gst_tanvi_desai", bookingId: "bkg_007" },
};

/** Held against an open decision. Released automatically if it is not taken. */
const HELD: Record<string, { guestId: string; note: string }> = {
  "601": {
    guestId: "gst_kavya_nair",
    note: "Held for the owner's VIP guest pending the suite quote decision",
  },
  "212": {
    guestId: "gst_meenakshi_iyer",
    note: "Held against an unpaid advance. Auto-releases at 18:00 today",
  },
};

/**
 * Out of order. These reduce sellable inventory and belong in the count.
 *
 * Each one carries the night it returns to sale, because the availability
 * matrix has to stop subtracting it on that date. Without the return date the
 * fourteen-day forecast would quietly sell a hotel three rooms smaller than it
 * is for the whole fortnight.
 */
export interface OutOfService {
  number: string;
  note: string;
  /** First night the room is sellable again. */
  returnsOnOffset: number;
}

export const OUT_OF_SERVICE: OutOfService[] = [
  {
    number: "307",
    note: "Air-conditioning coil replacement. Back in service in two days",
    returnsOnOffset: 2,
  },
  {
    number: "310",
    note: "Bathroom re-grouting after the complaint on stay GM-26-4096",
    returnsOnOffset: 4,
  },
  {
    number: "605",
    note: "Deep clean and carpet replacement scheduled this week",
    returnsOnOffset: 5,
  },
];

const MAINTENANCE: Record<string, string> = Object.fromEntries(
  OUT_OF_SERVICE.map((r) => [r.number, r.note]),
);

function buildRooms(): Room[] {
  const rooms: Room[] = [];

  for (const band of FLOOR_PLAN) {
    for (let n = band.from; n <= band.to; n++) {
      const number = String(n);
      let status: RoomStatus = "available";
      let guestId: string | undefined;
      let bookingId: string | undefined;
      let housekeepingNote: string | undefined;

      if (MAINTENANCE[number]) {
        status = "maintenance";
        housekeepingNote = MAINTENANCE[number];
      } else if (OCCUPIED[number]) {
        status = "occupied";
        ({ guestId, bookingId } = OCCUPIED[number]);
      } else if (DEPARTING[number]) {
        status = "departing";
        ({ guestId, bookingId } = DEPARTING[number]);
        housekeepingNote = "Checkout by 11:00. Turn the room for the evening";
      } else if (ARRIVING[number]) {
        status = "arriving";
        ({ guestId, bookingId } = ARRIVING[number]);
      } else if (HELD[number]) {
        status = "held";
        guestId = HELD[number].guestId;
        housekeepingNote = HELD[number].note;
      }

      rooms.push({
        id: `rm_${number}`,
        hotelId: HOTEL_ID,
        number,
        floor: band.floor,
        roomTypeId: band.roomTypeId,
        status,
        guestId,
        bookingId,
        housekeepingNote,
      });
    }
  }

  return rooms;
}

export const ROOMS: Room[] = buildRooms();

export const ROOM_BY_NUMBER = Object.fromEntries(ROOMS.map((r) => [r.number, r])) as Record<
  string,
  Room
>;

/**
 * Occupancy the way a front office counts it: keys with a body in them tonight.
 * Departing rooms free up before the evening, so they are not counted; arriving
 * and held rooms are, because they cannot be sold again today.
 */
export const OCCUPANCY_TONIGHT = ROOMS.filter(
  (r) => r.status === "occupied" || r.status === "arriving" || r.status === "held",
).length;

export const SELLABLE_ROOMS = ROOMS.filter((r) => r.status !== "maintenance").length;

export const OCCUPANCY_RATE = OCCUPANCY_TONIGHT / SELLABLE_ROOMS;
