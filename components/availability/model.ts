/**
 * Client-side arithmetic for the availability screen.
 *
 * The matrix arrives from the server already derived. What happens here is the
 * overlay: an operator blocks four Deluxe over a weekend, and every number on
 * the screen has to move in the same frame without a round trip. Rather than
 * recompute availability from the ledger in the browser, the overlay works out
 * the difference between the blocks the server priced and the blocks that now
 * exist, and applies that difference.
 *
 * The published rate deliberately does not move when rooms are blocked. A block
 * changes what is sellable, not what the hotel is asking; repricing the date
 * because someone took two rooms out for an audit would be a pricing decision
 * disguised as an availability one.
 */

import type { DayColumn, InventoryMatrix } from "@/lib/availability";
import type { InventoryBlock, ISODate, Paise } from "@/types";

export interface BlockForm {
  roomTypeId: string;
  from: ISODate;
  to: ISODate;
  rooms: number;
  reason: string;
}

/** Rooms withheld for one room type on one date by the given block list. */
export function blockedFor(blocks: InventoryBlock[], roomTypeId: string, date: ISODate): number {
  return blocks
    .filter((b) => b.roomTypeId === roomTypeId && b.from <= date && b.to >= date)
    .reduce((sum, b) => sum + b.rooms, 0);
}

export function datesInRange(from: ISODate, to: ISODate, all: ISODate[]): ISODate[] {
  return all.filter((d) => d >= from && d <= to);
}

/**
 * Re-derive the matrix against a different set of blocks.
 *
 * Only `blocked` and everything downstream of it changes. Sold and held come
 * from the ledger and the enquiry book and are not the operator's to move from
 * this screen.
 */
export function overlayBlocks(
  base: InventoryMatrix,
  current: InventoryBlock[],
): InventoryMatrix {
  const rows = base.rows.map((row) => ({
    roomType: row.roomType,
    cells: row.cells.map((cell) => {
      const blocked = blockedFor(current, cell.roomTypeId, cell.date);
      if (blocked === cell.blocked) return cell;
      return {
        ...cell,
        blocked,
        available: Math.max(0, cell.total - cell.maintenance - blocked - cell.sold - cell.held),
      };
    }),
  }));

  const columns: DayColumn[] = base.columns.map((column, i) => {
    const blocked = rows.reduce((sum, row) => sum + row.cells[i].blocked, 0);
    if (blocked === column.blocked) return column;

    const sellable = base.totalRooms - column.maintenance - blocked;
    return {
      ...column,
      blocked,
      sellable,
      available: Math.max(0, sellable - column.sold - column.held),
      occupancy: sellable > 0 ? (column.sold + column.held) / sellable : 0,
    };
  });

  return { ...base, rows, columns };
}

export interface BlockRow extends InventoryBlock {
  roomTypeName: string;
  createdByName?: string;
  nights: number;
  /** Room nights withheld, which is what the block actually costs. */
  roomNights: number;
  /** Revenue foregone at the published rate for those nights. */
  valueAtRisk: Paise;
}

/**
 * Blocks with the cost of holding them attached.
 *
 * Value at risk is read off the same matrix the screen is showing, so a block
 * and the grid above it can never quote different rates for the same night.
 */
export function buildBlockRows(
  blocks: InventoryBlock[],
  matrix: InventoryMatrix,
  authorName: (id?: string) => string | undefined,
): BlockRow[] {
  const rateAt = new Map(
    matrix.rows.flatMap((row) => row.cells.map((c) => [`${c.roomTypeId}|${c.date}`, c.rate])),
  );
  const nameOf = new Map(matrix.rows.map((row) => [row.roomType.id, row.roomType.name]));

  return blocks
    .map((block) => {
      const nights = datesInRange(block.from, block.to, matrix.dates);
      return {
        ...block,
        roomTypeName: nameOf.get(block.roomTypeId) ?? block.roomTypeId,
        createdByName: authorName(block.createdById),
        nights: nights.length,
        roomNights: nights.length * block.rooms,
        valueAtRisk: nights.reduce(
          (sum, date) => sum + (rateAt.get(`${block.roomTypeId}|${date}`) ?? 0) * block.rooms,
          0,
        ),
      };
    })
    .sort((a, b) => a.from.localeCompare(b.from));
}

/** Fewest rooms free for a type across a range, which is what a block can take. */
export function capacityAcross(
  matrix: InventoryMatrix,
  roomTypeId: string,
  from: ISODate,
  to: ISODate,
): { available: number; nights: number } {
  const row = matrix.rows.find((r) => r.roomType.id === roomTypeId);
  if (!row) return { available: 0, nights: 0 };

  const cells = row.cells.filter((c) => c.date >= from && c.date <= to);
  if (cells.length === 0) return { available: 0, nights: 0 };

  return {
    available: Math.min(...cells.map((c) => c.available)),
    nights: cells.length,
  };
}

export type Pressure = "open" | "filling" | "tight" | "full";

/**
 * How a night reads at a glance.
 *
 * Four bands, not a gradient. An operator scanning a fortnight is answering
 * "where do I have a problem", and a continuous ramp makes every column a
 * slightly different colour with no threshold to act on.
 */
export function pressureOf(occupancy: number): Pressure {
  if (occupancy >= 0.95) return "full";
  if (occupancy >= 0.8) return "tight";
  if (occupancy >= 0.55) return "filling";
  return "open";
}

export const PRESSURE_LABEL: Record<Pressure, string> = {
  open: "Open",
  filling: "Filling",
  tight: "Tight",
  full: "Full",
};

/** Cell background and text, keyed to the same four bands. */
export const PRESSURE_CELL: Record<Pressure, string> = {
  open: "bg-surface text-text-primary",
  filling: "bg-accent-100/70 text-text-primary",
  tight: "bg-caution-100 text-caution-700",
  full: "bg-critical-100 text-critical-700",
};

export const PRESSURE_BAR: Record<Pressure, string> = {
  open: "bg-ink-300",
  filling: "bg-accent-500",
  tight: "bg-caution-500",
  full: "bg-critical-500",
};
