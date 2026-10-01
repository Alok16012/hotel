"use client";

import * as React from "react";
import { toast } from "sonner";
import { ColumnHead } from "@/components/common/panel";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TEAM_ROLE } from "@/lib/labels";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { EscalationRule } from "@/types";
import { applyEscalationOverrides, ESCALATION_CHANNEL_LABEL } from "./model";

/**
 * Standing instructions to interrupt somebody (§42).
 *
 * The last column is the one that makes this a settings screen and not a
 * notification preferences pane: every rule says what the person is expected
 * to do when it reaches them. An alert with no expected response is a rule
 * that will be switched off within a fortnight, and switching it off is the
 * only honest thing to do with it.
 *
 * Rules that are off stay in the table. A property that has decided not to be
 * told about something has made a decision worth seeing.
 */
export function EscalationPanel({ rules }: { rules: EscalationRule[] }) {
  // Held beside the automation modes rather than in this table, so every
  // decision made on this screen leaves by the same door and can be read back
  // by anything that needs it.
  const escalations = useSession((s) => s.escalations);
  const setEscalationEnabled = useSession((s) => s.setEscalationEnabled);
  const rows = React.useMemo(
    () => applyEscalationOverrides(rules, escalations),
    [rules, escalations],
  );

  function toggle(rule: EscalationRule, enabled: boolean) {
    setEscalationEnabled(rule.id, enabled);
    toast(enabled ? "Escalation switched on" : "Escalation switched off", {
      description: enabled
        ? `${TEAM_ROLE[rule.notifyRole]} will be told. Held for this session; nothing is delivered in this build.`
        : `Nobody will be told when ${lowerFirst(rule.trigger)}. Held for this session.`,
    });
  }

  return (
    <div className="scrollbar-slim overflow-x-auto px-4 py-3">
      <table className="w-full min-w-[50rem] border-collapse text-body">
        <thead>
          <tr className="border-b border-hairline">
            <ColumnHead className="w-[19rem] px-0 pr-3">When</ColumnHead>
            <ColumnHead className="w-[11rem] px-0 pr-3">Fires</ColumnHead>
            <ColumnHead className="w-[12rem] px-0 pr-3">Tells</ColumnHead>
            <ColumnHead className="px-0 pr-3">Expected of them</ColumnHead>
            <ColumnHead align="right" className="w-[4rem] px-0">
              On
            </ColumnHead>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={cn(
                "border-b border-hairline last:border-0",
                !row.enabled && "text-text-muted",
              )}
            >
              <td className="py-2 pr-3 align-top">
                <span className={cn("text-body", row.enabled && "text-text-primary")}>
                  {row.trigger}
                </span>
              </td>

              <td className="py-2 pr-3 align-top text-meta text-text-secondary">
                {row.afterLabel}
              </td>

              <td className="py-2 pr-3 align-top">
                <span className={cn("text-meta", row.enabled && "text-text-primary")}>
                  {TEAM_ROLE[row.notifyRole]}
                </span>
                <span className="mt-1 flex flex-wrap gap-1">
                  {row.channels.map((channel) => (
                    <Badge key={channel} intent={row.enabled ? "outline" : "neutral"}>
                      {ESCALATION_CHANNEL_LABEL[channel]}
                    </Badge>
                  ))}
                </span>
              </td>

              <td className="py-2 pr-3 align-top text-meta text-text-secondary">
                {row.expectation}
              </td>

              <td className="py-2 text-right align-top">
                <Switch
                  checked={row.enabled}
                  aria-label={`Escalate when ${lowerFirst(row.trigger)}`}
                  onCheckedChange={(next) => toggle(row, next)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
