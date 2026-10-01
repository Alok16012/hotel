/**
 * Where automation stops and a person starts (§42).
 *
 * The product's central claim is that software handles the repetition and a
 * person handles the exception. The place that claim is actually cashed is
 * here: how many times automation may chase a quiet enquiry before the queue
 * says a person should pick up the phone.
 *
 * The number lived in three places before this module: the follow-up queue
 * decided it in code, the automation rule described it in prose, and the
 * escalation rule described it again. Changing the setting moved none of them.
 * All three now read from this table, so the setting is the behaviour rather
 * than a label beside it.
 *
 * Pure by design. It imports a type and nothing else, which is what lets the
 * seed, the settings screen and the queue all read it without a cycle.
 */

import type { AutomationMode } from "@/types";

/**
 * The automation rule that governs chasing a quote that went quiet.
 *
 * Named rather than looked up by position, because the settings screen lets
 * the rules be reordered and the queue has to keep finding the same one.
 */
export const CHASE_RULE_ID = "auto_followup";

/**
 * How many chases automation may send before the work is handed over.
 *
 * Reading down: when replies go out on their own, two unanswered chases is
 * enough repetition to stop; when they are only drafted, a person is already
 * in the loop after the first; when the enquiry type is reserved for a person,
 * automation has no business sending any of them.
 */
export const CHASE_LIMIT: Record<AutomationMode, number> = {
  send: 2,
  draft: 1,
  human: 0,
};

export function chaseLimitFor(mode: AutomationMode): number {
  return CHASE_LIMIT[mode];
}

/** Small counts read better as words in a sentence somebody has to act on. */
function countWord(n: number): string {
  return ["No", "One", "Two", "Three", "Four", "Five"][n] ?? String(n);
}

function chaseSubject(limit: number): string {
  return limit === 1 ? "One automated chase has" : `${countWord(limit)} automated chases have`;
}

/** The condition itself, as the escalation rule states it. */
export function chasesUnanswered(limit: number): string {
  if (limit === 0) return "Automation is not allowed to chase this enquiry type";
  return `${chaseSubject(limit)} gone unanswered`;
}

/** The same condition written as a reason to pull a rule back to a person. */
export function chasesAlreadyUnanswered(limit: number): string {
  if (limit === 0) return "Automation is not allowed to chase this enquiry type";
  return `${chaseSubject(limit)} already gone unanswered`;
}

/**
 * What changing this rule does to the queue, said at the moment it is changed.
 *
 * The settings screen is not where the consequence shows up, so the toast has
 * to carry it. Otherwise the only way to learn that a mode moved the handover
 * point is to walk to the queue and notice the badges moved.
 */
export function chaseHandoverCopy(mode: AutomationMode): string {
  const limit = CHASE_LIMIT[mode];
  if (limit === 0) return "The follow-up queue now hands these to a person without chasing.";
  if (limit === 1) return "The follow-up queue now hands these over after one unanswered chase.";
  return `The follow-up queue now hands these over after ${countWord(limit).toLowerCase()} unanswered chases.`;
}
