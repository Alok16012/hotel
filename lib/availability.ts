/**
 * What the building can still sell, night by night (§18).
 *
 * Availability is the difference between three counts and one constant, and
 * every one of those counts has a different owner:
 *
 *   sold         the booking ledger. Money is owed or already taken.
 *   held         an open enquiry with rooms committed to it. Releases itself.
 *   blocked      the hotel withheld the rooms. Only a person gives them back.
 *   out of order housekeeping and maintenance. Not sellable at any price.
 *
 * Collapsing them into one "unavailable" number is the most common way an
 * availability screen becomes untrustworthy, because the four have completely
 * different answers to "can I sell this to the guest on the phone right now".
 *
 * Everything here is derived. Nothing in `data/` states an availability figure,
 * so the matrix, the floor map, the forecast and the rate card cannot drift
 * apart as the seed data changes.
 */

import { BOOKINGS } from "@/data/bookings";
import { GUEST_BY_ID } from "@/data/guests";
import { HOTEL, ROOM_TYPES, ROOM_TYPE_BY_ID } from "@/data/hotel";
import { INVENTORY_BLOCKS } from "@/data/inventory";
import { LEADS } from "@/data/leads";
import { OUT_OF_SERVICE, ROOMS } from "@/data/rooms";
import { demoDate } from "@/lib/clock";
import { effectiveRate, rateRecord } from "@/lib/pricing";
import type {
  InventoryBlock,
  InventoryCell,
  ISODate,
  Paise,
  Rate,
  Room,
  RoomStatus,
  RoomType,
} from "@/types";

/** The horizon every surface on this screen works over. */
export const FORECAST_DAYS = 14;

const LIVE_BOOKINGS = BOOKINGS.filter((b) => b.status !== "cancelled");

/**
 * Enquiries with rooms committed to them but no booking yet.
 *
 * Negotiating and payment pending are obvious: a price is agreed or an advance
 * is awaited, and selling the room underneath the guest is how a hotel loses
 * one. Quotes are not held as a rule, because a desk that blocks inventory on
 * every quote sells out on paper and empty in fact. The exception is an urgent
 * one, which in practice means the owner asked for the room to be kept.
 */
function holdsInventory(stage: string, priority: string): boolean {
  if (stage === "negotiating" || stage === "payment_pending") return true;
  return stage === "quote_sent" && priority === "urgent";
}

const HOLDING_LEADS = LEADS.filter((l) => holdsInventory(l.stage, l.priority));

/** Rooms physically blocked at the desk tonight, which the floor map shows. */
const HELD_TONIGHT = ROOMS.filter((r) => r.status === "held");

function occupies(checkIn: ISODate, checkOut: ISODate, date: ISODate): boolean {
  return checkIn <= date && checkOut > date;
}

// ---------------------------------------------------------------------------
// The matrix
// ---------------------------------------------------------------------------

export interface MatrixRow {
  roomType: RoomType;
  cells: InventoryCell[];
}

export interface DayColumn {
  date: ISODate;
  /** Sold and held over what is sellable, 0-1. */
  occupancy: number;
  sold: number;
  held: number;
  blocked: number;
  maintenance: number;
  sellable: number;
  available: number;
  /** Room revenue committed on this night. */
  revenue: Paise;
  /** Average rate across the rooms actually sold. */
  adr: Paise;
}

export interface InventoryMatrix {
  dates: ISODate[];
  rows: MatrixRow[];
  columns: DayColumn[];
  totalRooms: number;
}

function maintenanceOn(roomTypeId: string, date: ISODate): number {
  return OUT_OF_SERVICE.filter((oos) => {
    const room = ROOMS.find((r) => r.number === oos.number);
    return room?.roomTypeId === roomTypeId && date < demoDate(oos.returnsOnOffset);
  }).length;
}

function blockedOn(roomTypeId: string, date: ISODate, blocks: InventoryBlock[]): number {
  return blocks
    .filter((b) => b.roomTypeId === roomTypeId && b.from <= date && b.to >= date)
    .reduce((sum, b) => sum + b.rooms, 0);
}

function heldOn(roomTypeId: string, date: ISODate): number {
  // Today's holds are physical: a key is out of the rack at the desk, and the
  // floor map is the record. Future holds are commercial, and live on the
  // enquiry. Counting both on today would count the same room twice.
  if (date === demoDate(0)) {
    return HELD_TONIGHT.filter((r) => r.roomTypeId === roomTypeId).length;
  }
  return HOLDING_LEADS.filter(
    (l) =>
      l.requirement.roomTypeId === roomTypeId &&
      occupies(l.requirement.checkIn, l.requirement.checkOut, date),
  ).reduce((sum, l) => sum + l.requirement.rooms, 0);
}

function soldOn(roomTypeId: string, date: ISODate): number {
  return LIVE_BOOKINGS.filter(
    (b) => b.roomTypeId === roomTypeId && occupies(b.checkIn, b.checkOut, date),
  ).reduce((sum, b) => sum + b.rooms, 0);
}

function revenueOn(date: ISODate): { revenue: Paise; rooms: number } {
  const staying = LIVE_BOOKINGS.filter((b) => occupies(b.checkIn, b.checkOut, date));
  return {
    revenue: staying.reduce((sum, b) => sum + b.nightlyRate * b.rooms, 0),
    rooms: staying.reduce((sum, b) => sum + b.rooms, 0),
  };
}

/**
 * The room type by date grid.
 *
 * Built in two passes because the rate depends on how full the night is, and
 * how full the night is depends on every room type. The house numbers settle
 * first, then each cell is priced against them.
 */
export function getInventoryMatrix(
  days: number = FORECAST_DAYS,
  blocks: InventoryBlock[] = INVENTORY_BLOCKS,
): InventoryMatrix {
  const dates = Array.from({ length: days }, (_, i) => demoDate(i));

  const columns: DayColumn[] = dates.map((date) => {
    let sold = 0;
    let held = 0;
    let blocked = 0;
    let maintenance = 0;

    for (const roomType of ROOM_TYPES) {
      sold += soldOn(roomType.id, date);
      held += heldOn(roomType.id, date);
      blocked += blockedOn(roomType.id, date, blocks);
      maintenance += maintenanceOn(roomType.id, date);
    }

    const sellable = HOTEL.totalRooms - maintenance - blocked;
    const { revenue, rooms } = revenueOn(date);

    return {
      date,
      sold,
      held,
      blocked,
      maintenance,
      sellable,
      available: Math.max(0, sellable - sold - held),
      occupancy: sellable > 0 ? (sold + held) / sellable : 0,
      revenue,
      adr: rooms > 0 ? Math.round(revenue / rooms) : 0,
    };
  });

  const occupancyByDate = new Map(columns.map((c) => [c.date, c.occupancy * 100]));

  const rows: MatrixRow[] = ROOM_TYPES.map((roomType) => ({
    roomType,
    cells: dates.map((date) => {
      const sold = soldOn(roomType.id, date);
      const held = heldOn(roomType.id, date);
      const blocked = blockedOn(roomType.id, date, blocks);
      const maintenance = maintenanceOn(roomType.id, date);

      return {
        date,
        roomTypeId: roomType.id,
        total: roomType.inventory,
        sold,
        held,
        blocked,
        maintenance,
        available: Math.max(0, roomType.inventory - maintenance - blocked - sold - held),
        rate: effectiveRate(roomType.id, date, occupancyByDate.get(date) ?? 0),
      };
    }),
  }));

  return { dates, rows, columns, totalRooms: HOTEL.totalRooms };
}

// ---------------------------------------------------------------------------
// The rate card
// ---------------------------------------------------------------------------

export interface RateCardRow {
  roomType: RoomType;
  rates: Rate[];
}

/**
 * Rack, floor and current effective rate per room type across the horizon.
 *
 * The occupancy series travels with the rates rather than being fetched
 * beside them, because a rate on this screen only means anything against the
 * night it was calculated for.
 */
export interface RateCalendar {
  dates: ISODate[];
  rows: RateCardRow[];
  occupancy: number[];
}

export function getRateCalendar(days: number = FORECAST_DAYS): RateCalendar {
  const matrix = getInventoryMatrix(days);
  return {
    dates: matrix.dates,
    occupancy: matrix.columns.map((c) => c.occupancy),
    rows: ROOM_TYPES.map((roomType) => ({
      roomType,
      rates: matrix.dates.map((date, i) =>
        rateRecord(roomType.id, date, matrix.columns[i].occupancy * 100),
      ),
    })),
  };
}

// ---------------------------------------------------------------------------
// The floor map
// ---------------------------------------------------------------------------

export interface MapRoom {
  number: string;
  floor: number;
  status: RoomStatus;
  roomTypeId: string;
  roomTypeName: string;
  guestName?: string;
  bookingId?: string;
  note?: string;
}

export interface MapFloor {
  floor: number;
  rooms: MapRoom[];
}

export interface FloorMap {
  floors: MapFloor[];
  counts: Record<RoomStatus, number>;
  sellable: number;
  occupiedTonight: number;
}

const STATUS_ORDER: RoomStatus[] = [
  "occupied",
  "arriving",
  "departing",
  "held",
  "maintenance",
  "available",
];

export function getFloorMap(): FloorMap {
  const byFloor = new Map<number, MapRoom[]>();

  for (const room of ROOMS) {
    const list = byFloor.get(room.floor) ?? [];
    list.push(toMapRoom(room));
    byFloor.set(room.floor, list);
  }

  const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<RoomStatus, number>;
  for (const room of ROOMS) counts[room.status] += 1;

  return {
    // Top floor first, the way a person standing in front of the building
    // would read a board in the back office.
    floors: [...byFloor.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([floor, rooms]) => ({ floor, rooms })),
    counts,
    sellable: ROOMS.length - counts.maintenance,
    occupiedTonight: counts.occupied + counts.arriving + counts.held,
  };
}

function toMapRoom(room: Room): MapRoom {
  return {
    number: room.number,
    floor: room.floor,
    status: room.status,
    roomTypeId: room.roomTypeId,
    roomTypeName: ROOM_TYPE_BY_ID[room.roomTypeId]?.name ?? room.roomTypeId,
    guestName: room.guestId ? GUEST_BY_ID[room.guestId]?.name : undefined,
    bookingId: room.bookingId,
    note: room.housekeepingNote,
  };
}
