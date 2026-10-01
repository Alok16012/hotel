/**
 * Rates and the rules that govern what may be taken off them (§19).
 *
 * Two separate jobs live here, and keeping them apart matters.
 *
 * The first is the rate itself: what a room costs tonight before anybody
 * negotiates. That is derived from how full the night already is, which means
 * the rate card and the availability matrix cannot disagree. A screen that
 * shows a soft Tuesday at the same price as a sold-out Saturday is a screen
 * nobody consults twice.
 *
 * The second is the discount policy: how far below that rate a person may go,
 * and who signs when they want to go further. The rules are data, evaluated in
 * priority order, and the evaluation reports its own reasoning. An operator who
 * is told "twelve percent" and not why will eventually stop believing it.
 *
 * Nothing here reaches for the booking ledger. Occupancy arrives as an
 * argument, because `lib/availability.ts` already owns that calculation and one
 * of the two has to be the caller.
 */

import { AUTHORITY_BY_ROLE, PRICING_RULES } from "@/data/pricing";
import { ROOM_TYPE_BY_ID } from "@/data/hotel";
import { DEMO_NOW } from "@/lib/clock";
import { quoteTotals } from "@/lib/quote";
import type {
  GuestSegment,
  LeadSource,
  Paise,
  PricingCondition,
  PricingRule,
  Rate,
  TeamRole,
} from "@/types";

// ---------------------------------------------------------------------------
// The rate
// ---------------------------------------------------------------------------

/** Prices move in fifty rupee steps. Nobody quotes ₹6,417. */
const STEP = 5000;

function roundToStep(value: number): Paise {
  return Math.round(value / STEP) * STEP;
}

/**
 * What demand does to the price.
 *
 * Deliberately banded rather than continuous. A revenue manager thinks in
 * thresholds ("we are past seventy, stop discounting"), and a smooth curve
 * would produce a different rate every single day, which reads as noise.
 */
function demandMultiplier(occupancyPct: number): number {
  if (occupancyPct >= 85) return 1.18;
  if (occupancyPct >= 70) return 1.1;
  if (occupancyPct >= 55) return 1.04;
  if (occupancyPct >= 40) return 1;
  if (occupancyPct >= 25) return 0.94;
  return 0.88;
}

const IST_WEEKDAY = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
});

/** Friday and Saturday carry a premium at a four star city property. */
function isWeekend(date: string): boolean {
  const day = IST_WEEKDAY.format(new Date(`${date}T06:00:00+05:30`));
  return day === "Fri" || day === "Sat";
}

/**
 * The effective rate for one room type on one date.
 *
 * Derived, not stored, so there is exactly one answer to "what does a Premium
 * cost on the 26th" no matter which screen is asking.
 */
export function effectiveRate(roomTypeId: string, date: string, occupancyPct: number): Paise {
  const roomType = ROOM_TYPE_BY_ID[roomTypeId];
  if (!roomType) return 0;

  const weekend = isWeekend(date) ? 1.08 : 1;
  const raw = roomType.rackRate * demandMultiplier(occupancyPct) * weekend;

  // The floor is policy, not arithmetic: the rate may never derive its way
  // below the number the owner signed off on (§39).
  return Math.max(roomType.floorRate, roundToStep(raw));
}

/**
 * A full rate record, for the rate card.
 *
 * `lastChangedAt` is derived from the date rather than seeded, so the card does
 * not claim that every rate in the fortnight was touched at the same instant.
 */
export function rateRecord(roomTypeId: string, date: string, occupancyPct: number): Rate {
  const roomType = ROOM_TYPE_BY_ID[roomTypeId];
  const daysOut = Math.max(
    0,
    Math.round(
      (new Date(`${date}T06:00:00+05:30`).getTime() - DEMO_NOW.getTime()) / 86_400_000,
    ),
  );
  // Close-in dates are repriced more recently than dates three weeks out. The
  // stagger is deterministic so the server and the client agree.
  const hoursSinceChange = 4 + daysOut * 9 + (roomType ? roomType.tier * 3 : 0);

  return {
    id: `rate_${roomTypeId}_${date}`,
    roomTypeId,
    date,
    rackRate: roomType?.rackRate ?? 0,
    floorRate: roomType?.floorRate ?? 0,
    currentRate: effectiveRate(roomTypeId, date, occupancyPct),
    occupancyPct,
    lastChangedAt: new Date(DEMO_NOW.getTime() - hoursSinceChange * 3_600_000).toISOString(),
    lastChangedById: "tm_manager",
  };
}

// ---------------------------------------------------------------------------
// The rules
// ---------------------------------------------------------------------------

export interface RuleInput {
  roomTypeId: string;
  nights: number;
  rooms: number;
  /** Days between now and arrival. */
  leadTimeDays: number;
  segments: GuestSegment[];
  channel: LeadSource;
  /** House occupancy on the arrival date, 0-100. */
  occupancyPct: number;
}

function subjectValue(condition: PricingCondition, input: RuleInput): number | string | string[] {
  switch (condition.subject) {
    case "occupancy":
      return input.occupancyPct;
    case "lead_time_days":
      return input.leadTimeDays;
    case "nights":
      return input.nights;
    case "guest_segment":
      return input.segments;
    case "room_type":
      return input.roomTypeId;
    case "channel":
      return input.channel;
  }
}

function matches(condition: PricingCondition, input: RuleInput): boolean {
  const actual = subjectValue(condition, input);

  switch (condition.operator) {
    case "lt":
      return typeof actual === "number" && actual < (condition.value as number);
    case "lte":
      return typeof actual === "number" && actual <= (condition.value as number);
    case "gt":
      return typeof actual === "number" && actual > (condition.value as number);
    case "gte":
      return typeof actual === "number" && actual >= (condition.value as number);
    case "eq":
      return actual === condition.value;
    case "between": {
      const [low, high] = condition.value as [number, number];
      return typeof actual === "number" && actual >= low && actual <= high;
    }
    case "in": {
      const allowed = condition.value as string[];
      // A guest carries several segments, so membership is an intersection.
      return Array.isArray(actual)
        ? actual.some((v) => allowed.includes(v))
        : allowed.includes(actual as string);
    }
  }
}

export type MatchOutcome = "applied" | "superseded";

export interface RuleMatch {
  rule: PricingRule;
  outcome: MatchOutcome;
  /** Why it did or did not carry, in one line an operator can read out. */
  effect: string;
}

export interface RuleEvaluation {
  /** Largest discount available without an approval, as a fraction. */
  ceiling: number;
  /** Discount the rules apply on their own, as a fraction. */
  automatic: number;
  blocked: boolean;
  requiresApproval: boolean;
  matches: RuleMatch[];
  /** Rules that were considered and did not match. */
  skipped: PricingRule[];
}

/**
 * Walk the rule list in priority order and report what carried.
 *
 * First block ends it. First ceiling sets it. Anything later that would also
 * have set a ceiling is kept in the result marked superseded, because the
 * question an operator actually asks is not "what is my limit" but "why is my
 * limit that".
 */
export function evaluateRules(
  input: RuleInput,
  rules: PricingRule[] = PRICING_RULES,
): RuleEvaluation {
  const active = rules.filter((r) => r.enabled).sort((a, b) => a.priority - b.priority);

  const matched: RuleMatch[] = [];
  const skipped: PricingRule[] = [];

  let ceiling: number | undefined;
  let automatic = 0;
  let blocked = false;
  let requiresApproval = false;

  for (const rule of active) {
    if (!rule.conditions.every((c) => matches(c, input))) {
      skipped.push(rule);
      continue;
    }

    if (blocked) {
      matched.push({ rule, outcome: "superseded", effect: "Not reached. The night is closed to discounting" });
      continue;
    }

    switch (rule.action.kind) {
      case "block":
        // A block is absolute, whatever an earlier rule already allowed. The
        // entries above it have to be rewritten or the trace shows a ceiling
        // that no longer exists, which is how a desk agent promises a discount
        // the system will refuse.
        for (let i = 0; i < matched.length; i += 1) {
          if (matched[i].outcome !== "applied") continue;
          matched[i] = {
            rule: matched[i].rule,
            outcome: "superseded",
            effect: `Overruled by rule ${rule.priority}, which closes discounting entirely`,
          };
        }
        blocked = true;
        ceiling = 0;
        automatic = 0;
        matched.push({ rule, outcome: "applied", effect: "No discount available on this enquiry" });
        break;

      case "allow_discount_up_to":
        if (ceiling === undefined) {
          ceiling = (rule.action.valuePct ?? 0) / 100;
          matched.push({
            rule,
            outcome: "applied",
            effect: `Ceiling set at ${rule.action.valuePct} percent`,
          });
        } else {
          matched.push({
            rule,
            outcome: "superseded",
            effect: `Would have allowed ${rule.action.valuePct} percent. A higher rule already set the ceiling`,
          });
        }
        break;

      case "add_discount":
        automatic += (rule.action.valuePct ?? 0) / 100;
        matched.push({
          rule,
          outcome: "applied",
          effect: `${rule.action.valuePct} percent applied automatically`,
        });
        break;

      case "require_approval":
        requiresApproval = true;
        matched.push({ rule, outcome: "applied", effect: "Any discount needs a signature" });
        break;
    }
  }

  const resolved = ceiling ?? 0;
  return {
    ceiling: resolved,
    automatic: Math.min(automatic, resolved),
    blocked,
    requiresApproval,
    matches: matched,
    skipped,
  };
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

export interface QuoteSimulation {
  evaluation: RuleEvaluation;
  /** Rate before any discount. */
  listRate: Paise;
  /** Rate after the discounts the rules apply on their own. */
  sellRate: Paise;
  /** Lowest rate reachable inside the ceiling. */
  bestRate: Paise;
  floorRate: Paise;
  /** True when the ceiling would take the rate under the policy floor. */
  floorBinds: boolean;
  subtotal: Paise;
  taxes: Paise;
  total: Paise;
  /** Roles that can sign the full ceiling on their own. */
  canApprove: TeamRole[];
}

/**
 * The rule set is a parameter because the pricing screen simulates against a
 * draft, not against what is published. Handing the simulator a different list
 * is the whole point of letting someone try a rule before committing to it.
 */
export function simulateQuote(
  input: RuleInput,
  date: string,
  rules: PricingRule[] = PRICING_RULES,
): QuoteSimulation {
  const evaluation = evaluateRules(input, rules);
  const roomType = ROOM_TYPE_BY_ID[input.roomTypeId];
  const listRate = effectiveRate(input.roomTypeId, date, input.occupancyPct);
  const floorRate = roomType?.floorRate ?? 0;

  const sellRaw = Math.round(listRate * (1 - evaluation.automatic));
  const bestRaw = Math.round(listRate * (1 - evaluation.ceiling));

  const sellRate = Math.max(floorRate, roundToStep(sellRaw));
  const bestRate = Math.max(floorRate, roundToStep(bestRaw));

  const { subtotal, taxes, total } = quoteTotals(sellRate, input.rooms, input.nights);

  const canApprove = Object.values(AUTHORITY_BY_ROLE)
    .filter((a) => a.ceiling >= evaluation.ceiling && a.ceiling > 0)
    .map((a) => a.role);

  return {
    evaluation,
    listRate,
    sellRate,
    bestRate,
    floorRate,
    floorBinds: bestRaw < floorRate,
    subtotal,
    taxes,
    total,
    canApprove,
  };
}
