import { DEMO_NOW } from "@/lib/clock";
import { GUEST_SEGMENT, LEAD_SOURCE, PRICING_OPERATOR, PRICING_SUBJECT } from "@/lib/labels";
import type {
  GuestSegment,
  LeadSource,
  PricingAction,
  PricingCondition,
  PricingConditionSubject,
  PricingOperator,
  PricingRule,
  RoomType,
} from "@/types";

/**
 * Client arithmetic and vocabulary for the pricing screen (§19).
 *
 * The rule builder edits a draft in the browser, so everything here works on
 * plain rule objects and never reaches for `data/`. Two ideas drive the shape.
 *
 * First, a condition is stored as a triple and read as a sentence. Nobody
 * maintains a policy written as `{ subject: "occupancy", operator: "gte" }`, so
 * the builder writes that form and shows the other one everywhere else.
 *
 * Second, priority is a position, not a number the operator types. Rules are
 * renumbered on every move so the list can never contain two rules at priority
 * 4, which is the state where an evaluation order stops being explainable.
 */

// ---------------------------------------------------------------------------
// Subjects, operators and their values
// ---------------------------------------------------------------------------

export const SUBJECTS: PricingConditionSubject[] = [
  "occupancy",
  "lead_time_days",
  "nights",
  "guest_segment",
  "room_type",
  "channel",
];

const NUMERIC_SUBJECTS = new Set<PricingConditionSubject>([
  "occupancy",
  "lead_time_days",
  "nights",
]);

export function isNumericSubject(subject: PricingConditionSubject): boolean {
  return NUMERIC_SUBJECTS.has(subject);
}

export const NUMERIC_OPERATORS: PricingOperator[] = ["lt", "lte", "gt", "gte", "eq", "between"];

/**
 * Categorical subjects only ever use membership.
 *
 * "Room type is Suite" and "room type is one of Suite" are the same statement,
 * and offering both is how a rule list ends up with two ways to say one thing.
 */
export const CATEGORICAL_OPERATORS: PricingOperator[] = ["in"];

export function operatorsFor(subject: PricingConditionSubject): PricingOperator[] {
  return isNumericSubject(subject) ? NUMERIC_OPERATORS : CATEGORICAL_OPERATORS;
}

export interface ValueOption {
  value: string;
  label: string;
}

export function optionsFor(
  subject: PricingConditionSubject,
  roomTypes: RoomType[],
): ValueOption[] {
  switch (subject) {
    case "guest_segment":
      return (Object.keys(GUEST_SEGMENT) as GuestSegment[]).map((k) => ({
        value: k,
        label: GUEST_SEGMENT[k].label,
      }));
    case "room_type":
      return roomTypes.map((rt) => ({ value: rt.id, label: rt.name }));
    case "channel":
      return (Object.keys(LEAD_SOURCE) as LeadSource[]).map((k) => ({
        value: k,
        label: LEAD_SOURCE[k].label,
      }));
    default:
      return [];
  }
}

/**
 * The unit that follows a numeric value, so "85" reads as "85%".
 *
 * Nights and days to arrival carry none: the subject already names the unit,
 * and "Nights is at least 5 nights" is the kind of sentence that makes a
 * generated rule list read as generated.
 */
function unitFor(subject: PricingConditionSubject): string {
  return subject === "occupancy" ? "%" : "";
}

function labelOf(
  subject: PricingConditionSubject,
  raw: string,
  roomTypes: RoomType[],
): string {
  return optionsFor(subject, roomTypes).find((o) => o.value === raw)?.label ?? raw;
}

/** One condition as a line a manager could read out in a handover. */
export function describeCondition(
  condition: PricingCondition,
  roomTypes: RoomType[],
): string {
  const subject = PRICING_SUBJECT[condition.subject];
  const operator = PRICING_OPERATOR[condition.operator];

  if (condition.operator === "between") {
    const [low, high] = condition.value as [number, number];
    return `${subject} ${operator} ${low}${unitFor(condition.subject)} and ${high}${unitFor(condition.subject)}`;
  }

  if (condition.operator === "in") {
    const values = (condition.value as string[]) ?? [];
    const names = values.map((v) => labelOf(condition.subject, v, roomTypes));
    // An empty list is a half-finished condition, not a condition on nothing.
    // "Room type is one of nothing yet" reads as a bug; say it plainly instead.
    if (!names.length) return `${subject} is not chosen yet`;
    return `${subject} ${operator} ${names.join(", ")}`;
  }

  if (isNumericSubject(condition.subject)) {
    const value = condition.value as number;
    return `${subject} ${operator} ${value}${unitFor(condition.subject)}`;
  }

  return `${subject} ${operator} ${labelOf(condition.subject, String(condition.value), roomTypes)}`;
}

/** The action as a sentence, for the places a badge alone is too terse. */
export function describeAction(action: PricingAction): string {
  switch (action.kind) {
    case "block":
      return "No discount at all";
    case "require_approval":
      return "Any discount needs a signature";
    case "allow_discount_up_to":
      return `Allow up to ${action.valuePct ?? 0}% off`;
    case "add_discount":
      return `Apply ${action.valuePct ?? 0}% off automatically`;
  }
}

/** Only two of the four actions carry a number. */
export function actionTakesValue(kind: PricingAction["kind"]): boolean {
  return kind === "allow_discount_up_to" || kind === "add_discount";
}

// ---------------------------------------------------------------------------
// Editing
// ---------------------------------------------------------------------------

export interface RuleForm {
  id: string | null;
  name: string;
  description: string;
  enabled: boolean;
  conditions: PricingCondition[];
  action: PricingAction;
}

export function blankCondition(subject: PricingConditionSubject): PricingCondition {
  if (isNumericSubject(subject)) {
    return { subject, operator: "gte", value: subject === "occupancy" ? 70 : 2 };
  }
  return { subject, operator: "in", value: [] };
}

/**
 * Keep a condition coherent when its subject or operator changes.
 *
 * Switching "occupancy is at least 85" to "guest segment" leaves a number
 * behind a membership test, which evaluates to nothing and reads as a rule that
 * mysteriously never fires. Reset the value instead of carrying it over.
 */
export function withSubject(
  condition: PricingCondition,
  subject: PricingConditionSubject,
): PricingCondition {
  if (isNumericSubject(subject) === isNumericSubject(condition.subject)) {
    return isNumericSubject(subject)
      ? { ...condition, subject }
      : { subject, operator: "in", value: [] };
  }
  return blankCondition(subject);
}

export function withOperator(
  condition: PricingCondition,
  operator: PricingOperator,
): PricingCondition {
  if (operator === "between") {
    const current = typeof condition.value === "number" ? condition.value : 50;
    return { ...condition, operator, value: [current, Math.min(100, current + 15)] };
  }
  if (condition.operator === "between") {
    const [low] = condition.value as [number, number];
    return { ...condition, operator, value: low };
  }
  return { ...condition, operator };
}

export function toForm(rule?: PricingRule): RuleForm {
  if (!rule) {
    return {
      id: null,
      name: "",
      description: "",
      enabled: true,
      conditions: [blankCondition("occupancy")],
      action: { kind: "allow_discount_up_to", valuePct: 10 },
    };
  }
  return {
    id: rule.id,
    name: rule.name,
    description: rule.description,
    enabled: rule.enabled,
    // Cloned, so abandoning the dialog leaves the draft list untouched.
    conditions: rule.conditions.map((c) => ({ ...c })),
    action: { ...rule.action },
  };
}

export function formIsValid(form: RuleForm): boolean {
  if (form.name.trim().length < 3) return false;
  if (form.conditions.length === 0) return false;
  return form.conditions.every((c) =>
    c.operator === "in" ? ((c.value as string[]) ?? []).length > 0 : true,
  );
}

/** Commit a form back into the draft list, preserving position. */
export function applyForm(
  rules: PricingRule[],
  form: RuleForm,
  editorId: string,
): PricingRule[] {
  const patch = {
    name: form.name.trim(),
    description: form.description.trim(),
    enabled: form.enabled,
    conditions: form.conditions,
    action: form.action,
    lastEditedAt: DEMO_NOW.toISOString(),
    lastEditedById: editorId,
  };

  if (form.id) {
    return rules.map((r) => (r.id === form.id ? { ...r, ...patch } : r));
  }

  // New rules land last. Evaluation order is a decision, and defaulting a new
  // rule to the top would silently outrank the policy already in place.
  return renumber([
    ...rules,
    { id: `pr_${Date.now()}`, priority: rules.length + 1, ...patch },
  ]);
}

export function setEnabled(rules: PricingRule[], id: string, enabled: boolean): PricingRule[] {
  return rules.map((r) => (r.id === id ? { ...r, enabled } : r));
}

export function removeRule(rules: PricingRule[], id: string): PricingRule[] {
  return renumber(rules.filter((r) => r.id !== id));
}

/** Priorities are always 1..n with no gaps, so the order is never ambiguous. */
export function renumber(rules: PricingRule[]): PricingRule[] {
  return [...rules]
    .sort((a, b) => a.priority - b.priority)
    .map((rule, index) => ({ ...rule, priority: index + 1 }));
}

export function move(rules: PricingRule[], id: string, direction: -1 | 1): PricingRule[] {
  const ordered = renumber(rules);
  const index = ordered.findIndex((r) => r.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ordered.length) return ordered;

  const next = [...ordered];
  [next[index], next[target]] = [next[target], next[index]];
  return next.map((rule, i) => ({ ...rule, priority: i + 1 }));
}

/**
 * Has the draft moved away from what is published?
 *
 * Compared on the fields that change behaviour. `lastEditedAt` is included
 * deliberately: an edit that only rewords a description still has to be
 * published before anyone else sees it.
 */
export function rulesDiffer(draft: PricingRule[], published: PricingRule[]): boolean {
  return JSON.stringify(renumber(draft)) !== JSON.stringify(renumber(published));
}

export function countChanges(draft: PricingRule[], published: PricingRule[]): number {
  const before = new Map(renumber(published).map((r) => [r.id, JSON.stringify(r)]));
  const after = new Map(renumber(draft).map((r) => [r.id, JSON.stringify(r)]));

  let changed = 0;
  for (const [id, json] of after) {
    if (before.get(id) !== json) changed += 1;
  }
  for (const id of before.keys()) {
    if (!after.has(id)) changed += 1;
  }
  return changed;
}
