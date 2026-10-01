import { daysAgo, demoDate } from "@/lib/clock";
import type { InventoryBlock } from "@/types";

/**
 * Inventory the hotel has taken off sale itself (§18).
 *
 * Three different things reduce what can be sold on a date, and conflating them
 * is how an availability screen stops being trusted:
 *
 *   sold    a booking exists, money is owed or paid
 *   held    an open enquiry has rooms committed to it, and will release them
 *   blocked the hotel withheld the rooms, and only the hotel can give them back
 *
 * These are the third kind. They are few on purpose: a property that blocks
 * heavily is a property that cannot sell, and a demo full of blocks would teach
 * the wrong habit.
 */
export const INVENTORY_BLOCKS: InventoryBlock[] = [
  {
    id: "blk_001",
    roomTypeId: "rt_premium",
    from: demoDate(8),
    to: demoDate(9),
    rooms: 2,
    reason: "Fire safety audit. Both rooms opened up for the inspector",
    createdById: "tm_manager",
    createdAt: daysAgo(12),
  },
  {
    id: "blk_002",
    roomTypeId: "rt_suite",
    from: demoDate(11),
    to: demoDate(12),
    rooms: 1,
    reason: "Owner's family staying. Not to be sold",
    createdById: "tm_owner",
    createdAt: daysAgo(5),
  },
  {
    id: "blk_003",
    roomTypeId: "rt_deluxe",
    from: demoDate(12),
    to: demoDate(13),
    rooms: 4,
    reason: "Wedding option held for the Deshmukh party while they confirm numbers",
    createdById: "tm_sales",
    createdAt: daysAgo(3),
  },
];
