"use client";

import { CornerDownRight } from "lucide-react";
import { SegmentedControl } from "@/components/common/segmented-control";
import { Badge } from "@/components/ui/badge";
import type { AutomationMode, AutomationRule } from "@/types";
import { AUTOMATION_MODE_CHOICES, AUTOMATION_MODE_META, AUTOMATION_MODE_ORDER } from "./model";

/**
 * The line between software and a person (§42).
 *
 * This is the only screen in the product where that line can be moved, so it
 * is shown as a list of real enquiries rather than a list of capabilities. An
 * owner deciding whether a quote may go out unattended is not thinking about
 * "quote generation"; they are thinking about the message a guest sent on
 * Tuesday, which is why each row carries one.
 *
 * The overrides matter as much as the mode. A rule set to send is still
 * pulled back to a person under the conditions listed beneath it, and a
 * settings screen that hid those would be describing a more reckless product
 * than this one.
 *
 * Controlled rather than holding its own copy of the rules, because the count
 * of automatic replies is printed at the top of the page and a summary that
 * disagrees with the table under it is worse than no summary.
 */
export function AutomationPanel({
  rules,
  onSetMode,
}: {
  rules: AutomationRule[];
  onSetMode: (rule: AutomationRule, mode: AutomationMode) => void;
}) {
  return (
    <div className="flex flex-col">
      <ul className="divide-y divide-hairline">
        {rules.map((rule) => (
          <li key={rule.id} className="px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="min-w-0 flex-1 basis-[18rem]">
                <h3 className="text-body font-medium text-text-primary">{rule.label}</h3>
                <p className="mt-0.5 text-meta italic text-text-secondary">
                  &ldquo;{rule.example}&rdquo;
                </p>
              </div>
              <SegmentedControl
                label={`${rule.label}: how it is answered`}
                options={AUTOMATION_MODE_CHOICES}
                value={rule.mode}
                onChange={(next) => onSetMode(rule, next)}
              />
            </div>

            <p className="mt-2 max-w-[74ch] text-meta text-text-muted">{rule.rationale}</p>

            {rule.overrides.length ? (
              <ul className="mt-2 flex flex-col gap-1">
                {rule.overrides.map((override) => (
                  <li
                    key={override}
                    className="flex items-start gap-1.5 text-micro text-text-secondary"
                  >
                    <CornerDownRight
                      className="mt-0.5 size-3 shrink-0 text-text-muted"
                      aria-hidden="true"
                    />
                    <span>
                      <span className="text-text-muted">Back to a person if </span>
                      {lowerFirst(override)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Sentence-cased overrides read as fragments once the lead-in is prefixed. */
function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}


/**
 * What the three settings mean, stated once above the table.
 *
 * Without this, "Send" and "Draft" are read as a speed setting instead of a
 * decision about who is answerable for what reaches a guest.
 */
export function AutomationLegend() {
  return (
    <ul className="flex flex-col gap-2.5 px-4 py-3">
      {AUTOMATION_MODE_ORDER.map((mode) => (
        <li key={mode} className="flex items-start gap-2.5">
          <Badge intent={AUTOMATION_MODE_META[mode].intent} className="mt-0.5 shrink-0">
            {AUTOMATION_MODE_META[mode].short}
          </Badge>
          <p className="min-w-0 flex-1 text-meta text-text-secondary">
            <span className="text-text-primary">{AUTOMATION_MODE_META[mode].label}.</span>{" "}
            {AUTOMATION_MODE_META[mode].meaning}
          </p>
        </li>
      ))}
    </ul>
  );
}
