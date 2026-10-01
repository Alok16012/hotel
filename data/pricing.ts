import { daysAgo, hoursAgo } from "@/lib/clock";
import type { DiscountAuthority, PricingRule } from "@/types";

/**
 * The discounting policy, written as rules instead of habits (§19).
 *
 * The point of this list is that a price concession stops being an argument.
 * Reception does not have to guess whether eighteen percent off a corporate
 * booking is acceptable; the rule says it is, and the rule says who signs when
 * it is not. Everything the desk is allowed to do without asking is here, and
 * everything else becomes an exception with a name on it.
 *
 * Rules evaluate in priority order, lowest number first. The first rule that
 * blocks ends the evaluation, the first rule that grants a ceiling sets it, and
 * anything after that is reported as matched but superseded, so an operator can
 * see why the ceiling is what it is rather than being handed a number.
 */
export const PRICING_RULES: PricingRule[] = [
  {
    id: "pr_001",
    name: "Protect a full house",
    description:
      "Once the night is 85 percent sold the rate holds. Nothing left to fill, so nothing to give away.",
    enabled: true,
    priority: 1,
    conditions: [{ subject: "occupancy", operator: "gte", value: 85 }],
    action: { kind: "block" },
    lastEditedAt: daysAgo(34),
    lastEditedById: "tm_owner",
  },
  {
    id: "pr_002",
    name: "Thin the discount on busy nights",
    description:
      "Between 70 and 85 percent sold, five points is the most anyone gives without asking.",
    enabled: true,
    priority: 2,
    conditions: [{ subject: "occupancy", operator: "between", value: [70, 85] }],
    action: { kind: "allow_discount_up_to", valuePct: 5 },
    lastEditedAt: daysAgo(34),
    lastEditedById: "tm_owner",
  },
  {
    id: "pr_003",
    name: "Suites are signed for",
    description:
      "Any discount on a suite goes to the manager. Six keys, and the rate on them sets the ceiling for the whole property.",
    enabled: true,
    priority: 3,
    conditions: [{ subject: "room_type", operator: "in", value: ["rt_suite"] }],
    action: { kind: "require_approval" },
    lastEditedAt: daysAgo(19),
    lastEditedById: "tm_owner",
  },
  {
    id: "pr_004",
    name: "Contracted corporate rate",
    description:
      "Corporate accounts carry a negotiated rate. Eighteen points off is the contract, not a concession.",
    enabled: true,
    priority: 4,
    conditions: [{ subject: "guest_segment", operator: "in", value: ["corporate"] }],
    action: { kind: "allow_discount_up_to", valuePct: 18 },
    lastEditedAt: daysAgo(11),
    lastEditedById: "tm_manager",
  },
  {
    id: "pr_005",
    name: "Reward the long stay",
    description:
      "Five nights or more earns twelve points. A guest who stays the week costs less to service than five who stay one.",
    enabled: true,
    priority: 5,
    conditions: [{ subject: "nights", operator: "gte", value: 5 }],
    action: { kind: "allow_discount_up_to", valuePct: 12 },
    lastEditedAt: daysAgo(7),
    lastEditedById: "tm_manager",
  },
  {
    id: "pr_006",
    name: "Fill a soft night",
    description:
      "Below 45 percent sold, fifteen points is available. An empty room earns nothing at any rate.",
    enabled: true,
    priority: 6,
    conditions: [{ subject: "occupancy", operator: "lt", value: 45 }],
    action: { kind: "allow_discount_up_to", valuePct: 15 },
    lastEditedAt: hoursAgo(30),
    lastEditedById: "tm_manager",
  },
  {
    id: "pr_007",
    name: "Late booking, soft night",
    description:
      "Arriving inside two days on a night under 55 percent sold. Eight points on top, applied automatically.",
    enabled: true,
    priority: 7,
    conditions: [
      { subject: "lead_time_days", operator: "lte", value: 2 },
      { subject: "occupancy", operator: "lt", value: 55 },
    ],
    action: { kind: "add_discount", valuePct: 8 },
    lastEditedAt: hoursAgo(30),
    lastEditedById: "tm_manager",
  },
  {
    id: "pr_008",
    name: "Hold parity with the channels",
    description:
      "Enquiries arriving through an OTA already carry the contracted rate. Discounting them again breaks parity and costs the commission twice.",
    enabled: true,
    priority: 8,
    conditions: [{ subject: "channel", operator: "in", value: ["booking_com"] }],
    action: { kind: "block" },
    lastEditedAt: daysAgo(26),
    lastEditedById: "tm_owner",
  },
  {
    id: "pr_009",
    name: "Monsoon weekday offer",
    description:
      "Twenty points on weekday stays through the rains. Paused since the season ended, kept for next June.",
    enabled: false,
    priority: 9,
    conditions: [{ subject: "nights", operator: "gte", value: 2 }],
    action: { kind: "allow_discount_up_to", valuePct: 20 },
    lastEditedAt: daysAgo(63),
    lastEditedById: "tm_manager",
  },
];

/**
 * Who can sign off how much (§19).
 *
 * Reception carries no discounting authority at all, which is deliberate: the
 * desk handles arrivals under time pressure and a rate concession made at the
 * counter is the one nobody can reconstruct afterwards.
 */
export const DISCOUNT_AUTHORITY: DiscountAuthority[] = [
  { role: "reception", ceiling: 0, escalatesTo: "reservations" },
  { role: "accountant", ceiling: 0, escalatesTo: "manager" },
  { role: "reservations", ceiling: 0.05, escalatesTo: "manager" },
  { role: "sales", ceiling: 0.1, escalatesTo: "manager" },
  { role: "manager", ceiling: 0.2, escalatesTo: "owner" },
  { role: "owner", ceiling: 0.35 },
];

export const AUTHORITY_BY_ROLE = Object.fromEntries(
  DISCOUNT_AUTHORITY.map((a) => [a.role, a]),
) as Record<string, DiscountAuthority>;
