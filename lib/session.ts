"use client";

import { create } from "zustand";
import type { AutomationMode } from "@/types";

/**
 * Settings changed in this tab, and nowhere else.
 *
 * No settings service is connected in this build, so a mode flipped on
 * /settings has to live somewhere for the rest of the session. It used to live
 * in the settings screen's own `useState`, which meant the follow-up queue had
 * never heard of it: an owner could reserve an enquiry type for a person, walk
 * to the queue, and watch automation carry on as before. The screens disagreed
 * about the same decision, which is the one thing a settings screen must not
 * allow.
 *
 * Kept separate from `useUi` on purpose. That store holds chrome preferences,
 * this one holds decisions about the property, and only the first kind should
 * survive a reload.
 *
 * Deliberately not persisted. The settings screen promises that changes last
 * as long as the tab does, and a store that quietly restored them from a
 * previous visit would make that promise false. It also keeps the server and
 * the first client render looking at the same seeded values.
 *
 * Overrides are held as sparse maps keyed by id rather than as whole copies of
 * the seeded rows. A copy would go stale the moment the seed moved; a map of
 * differences stays readable as exactly what a person has touched.
 */
interface SessionState {
  /** Automation rule id to the mode chosen in this tab. */
  automationModes: Record<string, AutomationMode>;
  setAutomationMode: (ruleId: string, mode: AutomationMode) => void;

  /** Response target id to the first-reply undertaking, in seconds. */
  responseTargets: Record<string, number>;
  setResponseTarget: (targetId: string, targetSec: number) => void;

  /** Escalation rule id to whether it is switched on. */
  escalations: Record<string, boolean>;
  setEscalationEnabled: (ruleId: string, enabled: boolean) => void;

  /** Back to the seeded configuration, as if the tab had just opened. */
  clearOverrides: () => void;
}

export const useSession = create<SessionState>()((set) => ({
  automationModes: {},
  setAutomationMode: (ruleId, mode) =>
    set((s) => ({ automationModes: { ...s.automationModes, [ruleId]: mode } })),

  responseTargets: {},
  setResponseTarget: (targetId, targetSec) =>
    set((s) => ({ responseTargets: { ...s.responseTargets, [targetId]: targetSec } })),

  escalations: {},
  setEscalationEnabled: (ruleId, enabled) =>
    set((s) => ({ escalations: { ...s.escalations, [ruleId]: enabled } })),

  clearOverrides: () => set({ automationModes: {}, responseTargets: {}, escalations: {} }),
}));
