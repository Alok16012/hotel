/**
 * Room pricing arithmetic, in one place.
 *
 * GST on hotel accommodation in India is banded by the tariff actually charged:
 * 12% at or below Rs 7,500 a night, 18% above it. That rule already governed
 * the seeded booking ledger, and the quote builder has to agree with it to the
 * rupee, so both now read it from here. A second copy of a tax rule is a
 * guarantee that two screens will eventually disagree.
 *
 * Every figure is integer paise.
 */

import type { MealPlan, Paise } from "@/types";

/** Rs 7,500 a night, the slab boundary. */
export const GST_SLAB_PAISE = 750_000;

export function gstRateFor(nightlyRate: Paise): number {
  return nightlyRate > GST_SLAB_PAISE ? 0.18 : 0.12;
}

export interface QuoteTotals {
  nightlyRate: Paise;
  rooms: number;
  nights: number;
  /** Room nights sold: rooms x nights. The number a guest checks by hand. */
  roomNights: number;
  subtotal: Paise;
  gstRate: number;
  taxes: Paise;
  total: Paise;
}

export function quoteTotals(nightlyRate: Paise, rooms: number, nights: number): QuoteTotals {
  const roomNights = rooms * nights;
  const subtotal = nightlyRate * roomNights;
  const gstRate = gstRateFor(nightlyRate);
  const taxes = Math.round(subtotal * gstRate);
  return { nightlyRate, rooms, nights, roomNights, subtotal, gstRate, taxes, total: subtotal + taxes };
}

/**
 * What the nightly rate already covers.
 *
 * The seeded rates are inclusive of the plan the enquiry asked for, which is
 * why the quote builder prices rooms only and states the plan as an inclusion.
 * Adding a per-head supplement here would make every quote disagree with the
 * lead's own estimated value, and the operator would have no way to tell which
 * of the two numbers was wrong.
 */
export const MEAL_PLAN_INCLUSION: Record<MealPlan, string> = {
  room_only: "Room only, no meals included",
  breakfast: "Breakfast for all occupants included",
  half_board: "Breakfast and dinner included",
  full_board: "All three meals included",
};

/**
 * Discount the quoted rate represents against the published rack rate, as whole
 * percent. Rounded because a desk negotiates in points, not in fractions, and a
 * raw ratio printed straight into the interface reads as noise.
 *
 * Negative when the quote sits above rack, which callers are expected to treat
 * as "no discount" rather than as a surcharge to advertise.
 */
export function discountPct(nightlyRate: Paise, rackRate: Paise): number {
  if (rackRate <= 0) return 0;
  return Math.round(((rackRate - nightlyRate) / rackRate) * 100);
}
