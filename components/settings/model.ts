/**
 * Wording for the settings screen.
 *
 * Client-safe: `lib/settings.ts` reads the seed, so the panels take their
 * types from it and their language from here.
 *
 * The automation copy carries the weight. Three modes written as three words
 * would be read as fast, medium and slow, so each one says what happens to a
 * guest's message, in the order it happens.
 */

import type {
  AutomationMode,
  AutomationRule,
  EscalationChannel,
  EscalationRule,
} from "@/types";
import { CHASE_RULE_ID, chaseLimitFor, chasesAlreadyUnanswered } from "@/lib/automation";
import type { BadgeProps } from "@/components/ui/badge";
import type { SegmentedOption } from "@/components/common/segmented-control";
import type { ResponseTargetRow } from "@/lib/settings";

export interface ModeMeta {
  label: string;
  /** What the guest experiences, shown in the legend. */
  meaning: string;
  /** The verb used on the control itself. */
  short: string;
  intent: NonNullable<BadgeProps["intent"]>;
}

export const AUTOMATION_MODE_META: Record<AutomationMode, ModeMeta> = {
  send: {
    label: "Answered automatically",
    short: "Send",
    meaning:
      "The reply goes out on its own and lands in the thread. A person sees it afterwards, alongside everything else that happened.",
    intent: "positive",
  },
  draft: {
    label: "Drafted and held",
    short: "Draft",
    meaning:
      "The reply is written and waits in the thread. Nothing reaches the guest until somebody sends it, which is usually one click.",
    intent: "intel",
  },
  human: {
    label: "Left for a person",
    short: "Person",
    meaning:
      "No reply is prepared. The enquiry joins the queue and waits for whoever is on shift to write it.",
    intent: "caution",
  },
};

export const AUTOMATION_MODE_ORDER: readonly AutomationMode[] = ["send", "draft", "human"];

/**
 * The same three modes, shaped for the segmented control on each rule.
 *
 * Ordered by how much of the reply leaves without a person, so the control
 * reads left to right as handing work back.
 */
export const AUTOMATION_MODE_CHOICES: readonly SegmentedOption<AutomationMode>[] =
  AUTOMATION_MODE_ORDER.map((mode) => ({
    id: mode,
    label: AUTOMATION_MODE_META[mode].short,
    hint: AUTOMATION_MODE_META[mode].label,
  }));

/**
 * The seeded rules with this tab's changes laid over them.
 *
 * Kept as a pure function of the seed and a sparse override map, so the
 * headline count at the top of the screen and the table below it are the same
 * derivation rather than two states that have to be kept in step.
 */
export function applyModeOverrides(
  rules: AutomationRule[],
  overrides: Record<string, AutomationMode>,
): AutomationRule[] {
  return rules.map((rule) => {
    const mode = overrides[rule.id];
    if (!mode || mode === rule.mode) return rule;

    // The chase rule's pull-back condition is a function of the mode, not a
    // sentence about it. Leaving the seeded wording in place would leave the
    // row saying a person takes over after two chases while the queue, reading
    // the same setting, hands the first one over.
    //
    // Reserved for a person, there is no condition left to state: nothing is
    // being sent for one to pull back from, which is how the other rules set
    // that way already read.
    if (rule.id === CHASE_RULE_ID) {
      const limit = chaseLimitFor(mode);
      return { ...rule, mode, overrides: limit === 0 ? [] : [chasesAlreadyUnanswered(limit)] };
    }
    return { ...rule, mode };
  });
}

/**
 * The same, for response targets.
 *
 * The measurements do not move, but what counts as meeting them does, so both
 * derived figures are recomputed. A target changed above a compliance share
 * still scored against the old one is the exact failure this screen exists to
 * prevent.
 */
export function applyTargetOverrides(
  rows: ResponseTargetRow[],
  overrides: Record<string, number>,
): ResponseTargetRow[] {
  return rows.map((row) => {
    const targetSec = overrides[row.target.id];
    if (targetSec === undefined || targetSec === row.target.targetSec) return row;

    const inside = row.responseTimes.filter((sec) => sec <= targetSec).length;
    return {
      ...row,
      target: { ...row.target, targetSec },
      compliance: row.responseTimes.length ? inside / row.responseTimes.length : undefined,
      meetingTarget: row.medianSec === undefined ? true : row.medianSec <= targetSec,
    };
  });
}

/** And for escalations, where the override is simply on or off. */
export function applyEscalationOverrides(
  rules: EscalationRule[],
  overrides: Record<string, boolean>,
): EscalationRule[] {
  return rules.map((rule) =>
    rule.id in overrides ? { ...rule, enabled: overrides[rule.id] } : rule,
  );
}

export const ESCALATION_CHANNEL_LABEL: Record<EscalationChannel, string> = {
  in_app: "In app",
  email: "Email",
  whatsapp: "WhatsApp",
};

/** The response targets an owner would realistically choose between. */
export const TARGET_CHOICES: readonly { value: number; label: string }[] = [
  { value: 2 * 60, label: "2 minutes" },
  { value: 5 * 60, label: "5 minutes" },
  { value: 15 * 60, label: "15 minutes" },
  { value: 30 * 60, label: "30 minutes" },
  { value: 60 * 60, label: "1 hour" },
  { value: 2 * 60 * 60, label: "2 hours" },
  { value: 4 * 60 * 60, label: "4 hours" },
];

/** Section anchors, so the jump rail and the headings cannot drift apart. */
export const SETTINGS_SECTIONS: readonly { id: string; label: string }[] = [
  { id: "property", label: "Property" },
  { id: "channels", label: "Contact channels" },
  { id: "policies", label: "Policies" },
  { id: "automation", label: "Automation" },
  { id: "targets", label: "Response targets" },
  { id: "escalations", label: "Escalation" },
];
