"use client";

import * as React from "react";
import { Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { ColumnHead } from "@/components/common/panel";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { ReportDefinition, ReportSchedule } from "@/types";
import { DELIVERY_LABEL } from "./model";

/**
 * Standing delivery instructions (§22).
 *
 * The switches and the time pickers work, and what they change is the
 * schedule as it is held in this session. Nothing is sent, because no mail or
 * messaging service is connected in this build, and the toast says that in
 * the same words the Integrations screen uses rather than implying a queue.
 *
 * Reports with no schedule are listed too. An unscheduled report is a real
 * state at a property, and a table showing only the four that are pushed
 * would hide the one nobody has asked for.
 */
export function SchedulePanel({
  schedules,
  definitions,
}: {
  schedules: ReportSchedule[];
  definitions: ReportDefinition[];
}) {
  const [rows, setRows] = React.useState(schedules);

  const named = React.useMemo(
    () => Object.fromEntries(definitions.map((d) => [d.id, d.name])),
    [definitions],
  );

  const unscheduled = definitions.filter(
    (definition) => !rows.some((row) => row.reportId === definition.id),
  );

  function update(id: string, patch: Partial<ReportSchedule>, message: string) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    toast(message, {
      description: "Held for this session. No mail or messaging service is connected in this build.",
    });
  }

  return (
    <div className="px-4 py-3">
      <div className="scrollbar-slim overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-body">
          <thead>
            <tr className="border-b border-hairline">
              <ColumnHead className="w-[13rem]">Report</ColumnHead>
              <ColumnHead className="w-[7rem]">Sends</ColumnHead>
              <ColumnHead className="w-[8rem]">At</ColumnHead>
              <ColumnHead>To</ColumnHead>
              <ColumnHead align="right" className="w-[5rem]">
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
                <td className="py-2 pr-3 align-middle">
                  <span className={cn("text-body", row.enabled && "text-text-primary")}>
                    {named[row.reportId] ?? row.reportId}
                  </span>
                  {row.dayLabel ? (
                    <span className="block text-micro text-text-muted">{row.dayLabel}</span>
                  ) : (
                    <span className="block text-micro text-text-muted">Every day</span>
                  )}
                </td>

                <td className="py-2 pr-3 align-middle">
                  <span className="inline-flex items-center gap-1.5 text-meta text-text-secondary">
                    {row.channel === "email" ? (
                      <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <MessageCircle className="size-3.5 shrink-0" aria-hidden="true" />
                    )}
                    {DELIVERY_LABEL[row.channel]}
                  </span>
                </td>

                <td className="py-2 pr-3 align-middle">
                  <Select
                    aria-label={`Send ${named[row.reportId]} at`}
                    value={row.sendAt}
                    disabled={!row.enabled}
                    onChange={(event) =>
                      update(
                        row.id,
                        { sendAt: event.target.value },
                        `${named[row.reportId]} moved to ${event.target.value}`,
                      )
                    }
                  >
                    {SEND_TIMES.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </Select>
                </td>

                <td className="py-2 pr-3 align-middle">
                  <ul className="flex flex-wrap gap-1">
                    {row.recipients.map((recipient) => (
                      <li
                        key={recipient}
                        className="rounded-[var(--radius-sm)] bg-surface-sunken px-1.5 py-0.5 text-micro text-text-secondary"
                      >
                        {recipient}
                      </li>
                    ))}
                  </ul>
                </td>

                <td className="py-2 text-right align-middle">
                  <Switch
                    checked={row.enabled}
                    aria-label={`${named[row.reportId]} scheduled delivery`}
                    onCheckedChange={(next) =>
                      update(
                        row.id,
                        { enabled: next },
                        next
                          ? `${named[row.reportId]} scheduled`
                          : `${named[row.reportId]} taken off the schedule`,
                      )
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {unscheduled.length ? (
        <p className="mt-3 text-micro text-text-muted">
          Not scheduled: {unscheduled.map((definition) => definition.name).join(", ")}.{" "}
          {unscheduled.length === 1 ? "It can" : "They can"} still be run and exported above.
        </p>
      ) : null}
    </div>
  );
}

/** The hours a property actually sends at: before a shift, or after one. */
const SEND_TIMES = ["06:00", "07:30", "08:00", "09:00", "10:00", "18:00", "21:00", "23:00"];
