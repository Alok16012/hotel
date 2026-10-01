import type { Hotel, RoomType } from "@/types";

export const HOTEL: Hotel = {
  id: "htl_grand_meridian",
  name: "Grand Meridian Hotel",
  city: "Bengaluru",
  state: "Karnataka",
  country: "India",
  timezone: "Asia/Kolkata",
  currency: "INR",
  starRating: 4,
  checkInTime: "14:00",
  checkOutTime: "11:00",
  totalRooms: 66,
  floors: 6,
  gstin: "29AAGCG4521M1ZP",
};

/**
 * A second property so the switcher in the sidebar is demonstrably real
 * rather than decorative. Only Grand Meridian carries seeded operational data.
 */
export const PROPERTIES: Hotel[] = [
  HOTEL,
  {
    ...HOTEL,
    id: "htl_meridian_whitefield",
    name: "Meridian Residency",
    city: "Whitefield",
    totalRooms: 38,
    floors: 4,
    starRating: 3,
    gstin: "29AAGCG4521M2ZQ",
  },
];

/** Inventory per §32: Deluxe 30, Premium 18, Executive 12, Suite 6. */
export const ROOM_TYPES: RoomType[] = [
  {
    id: "rt_deluxe",
    hotelId: HOTEL.id,
    code: "deluxe",
    name: "Deluxe",
    inventory: 30,
    maxOccupancy: 3,
    baseAdults: 2,
    sizeSqft: 280,
    rackRate: 650000, // ₹6,500
    floorRate: 430000, // ₹4,300 — the floor the demo story turns on (§39)
    amenities: ["Queen bed", "City view", "Work desk", "Free WiFi", "Tea/coffee maker"],
    tier: 1,
  },
  {
    id: "rt_premium",
    hotelId: HOTEL.id,
    code: "premium",
    name: "Premium",
    inventory: 18,
    maxOccupancy: 3,
    baseAdults: 2,
    sizeSqft: 340,
    rackRate: 850000, // ₹8,500
    floorRate: 595000, // ₹5,950
    amenities: ["King bed", "Garden view", "Lounge chair", "Mini bar", "Bathtub"],
    tier: 2,
  },
  {
    id: "rt_executive",
    hotelId: HOTEL.id,
    code: "executive",
    name: "Executive",
    inventory: 12,
    maxOccupancy: 4,
    baseAdults: 2,
    sizeSqft: 420,
    rackRate: 1150000, // ₹11,500
    floorRate: 805000, // ₹8,050
    amenities: ["King bed", "Separate living area", "Executive lounge access", "Mini bar"],
    tier: 3,
  },
  {
    id: "rt_suite",
    hotelId: HOTEL.id,
    code: "suite",
    name: "Suite",
    inventory: 6,
    maxOccupancy: 5,
    baseAdults: 2,
    sizeSqft: 640,
    rackRate: 1850000, // ₹18,500
    floorRate: 1295000, // ₹12,950
    amenities: [
      "King bed",
      "Private balcony",
      "Dining area",
      "Butler service",
      "Complimentary airport transfer",
    ],
    tier: 4,
  },
];

export const ROOM_TYPE_BY_ID = Object.fromEntries(
  ROOM_TYPES.map((rt) => [rt.id, rt]),
) as Record<string, RoomType>;
