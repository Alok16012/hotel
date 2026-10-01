"use client";

import * as React from "react";
import { AlarmClock, Inbox, TriangleAlert } from "lucide-react";
import { Avatar, toneForName } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { TeamRow } from "@/lib/team";
import { formatDuration, formatINRCompact, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { slaBand } from "./model";

/**
 * One colleague.
 *
 * The card is split by measurement window, not by importance. The top half is
 * the queue as it stands this minute and is the half a manager acts on; the
 * bottom half is the trailing month and is the half they have a conversation
 * about. Mixing the two into one column of figures would invite the reading
 * that a quiet morning had improved somebody's conversion rate.
 */
export function MemberCard({ row }: { row: TeamRow }) {
  const { member } = row;
  const band = slaBand(row.slaComplianceRate);
  const measured = row.handledLeadCount > 0;

  return (
    <article className="flex flex-col overflow-hidden rounded-[var(--radius-surface)] bg-surface shadow-[var(--shadow-raised)]">
      <header className="flex items-start gap-3 px-4 py-3">
        <Avatar
          size="lg"
          tone={toneForName(member.name)}
          initials={member.avatarInitials}
          presence={member.status}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-body font-semibold text-text-primary">{member.name}</h3>
          <p className="truncate text-meta text-text-secondary">{row.roleLabel}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-micro text-text-muted">
            <span>{row.shiftLabel}</span>
            <span aria-hidden="true">·</span>
            <span data-numeric>{row.shiftWindow}</span>
          </p>
        </div>

        {/* Presence and shift are separate facts. When they disagree the badge
            says which one is unusual rather than quietly resolving it. */}
        <Badge
          intent={row.onShift ? (member.status === "offline" ? "caution" : "positive") : "neutral"}
        >
          {row.onShift
            ? member.status === "offline"
              ? "On shift, offline"
              : row.presenceLabel
            : "Off shift"}
        </Badge>
      </header>

      <div className="grid grid-cols-3 gap-px border-y border-hairline bg-hairline">
        <Stat
          icon={<Inbox className="size-3" aria-hidden="true" />}
          label="Open now"
          value={String(row.openLeads)}
        />
        <Stat
          icon={<AlarmClock className="size-3" aria-hidden="true" />}
          label="Awaiting reply"
          value={String(row.awaitingReply)}
          tone={row.awaitingReply > 0 ? "caution" : undefined}
        />
        <Stat
          icon={<TriangleAlert className="size-3" aria-hidden="true" />}
          label="Past target"
          value={String(row.breached)}
          tone={row.breached > 0 ? "critical" : undefined}
        />
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2 text-micro text-text-muted">
        {/* With nothing open there is no value to state, and "₹0 in open
            enquiries" reads as a poor result rather than an empty queue. */}
        {row.openLeads > 0 ? (
          <span data-numeric>{formatINRCompact(row.pipelineValue)} in open enquiries</span>
        ) : (
          <span>Nothing open</span>
        )}
        {row.followUpsToday > 0 ? (
          <span data-numeric>
            {row.followUpsToday} follow-up{row.followUpsToday === 1 ? "" : "s"} due
          </span>
        ) : null}
        {row.openExceptions > 0 ? (
          <span data-numeric className="text-critical-700">
            {row.openExceptions} waiting on a decision
          </span>
        ) : null}
      </div>

      <div className="mt-auto border-t border-hairline bg-surface-sunken/50 px-4 py-2.5">
        <p className="text-micro font-medium uppercase tracking-[0.08em] text-text-muted">
          Last 30 days
        </p>

        {measured ? (
          <dl className="mt-1.5 grid grid-cols-3 gap-2">
            <Measure
              label="Median reply"
              value={formatDuration(row.medianResponseSec)}
              tone={row.medianResponseSec > 900 ? "caution" : undefined}
            />
            <Measure
              label="Inside target"
              value={formatPct(row.slaComplianceRate, 0)}
              tone={band === "good" ? "positive" : band === "watch" ? "caution" : "critical"}
            />
            <Measure label="Converted" value={formatPct(row.conversionRate, 0)} />
          </dl>
        ) : (
          <p className="mt-1 text-meta text-text-muted">
            No enquiries handled in the window, so there is nothing to measure.
          </p>
        )}

        {/* Two roles sit at a zero ceiling, which is a routing rule rather than
            a measurement. Printing "approves discounts to 0%" would read as a
            performance figure, so the sentence changes shape instead. */}
        {row.authority ? (
          <p className="mt-2 text-micro text-text-muted">
            {row.authority.ceiling === 0 ? (
              <>
                No discount without approval
                {row.escalatesToLabel ? ` from ${row.escalatesToLabel}` : ""}
              </>
            ) : (
              <>
                Approves discounts to{" "}
                <span data-numeric className="font-medium text-text-secondary">
                  {formatPct(row.authority.ceiling, 0)}
                </span>
                {row.escalatesToLabel
                  ? `, then it goes to ${row.escalatesToLabel}`
                  : ", and has the last word"}
              </>
            )}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "caution" | "critical";
}) {
  return (
    <div className="bg-surface px-3 py-2">
      <p className="flex items-center gap-1 text-micro text-text-muted">
        {icon}
        {label}
      </p>
      <p
        data-numeric
        className={cn(
          "mt-0.5 text-section font-semibold leading-none tracking-[-0.01em]",
          tone === "critical"
            ? "text-critical-700"
            : tone === "caution"
              ? "text-caution-700"
              : "text-text-primary",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Measure({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "caution" | "critical";
}) {
  return (
    <div>
      <dt className="text-micro text-text-muted">{label}</dt>
      <dd
        data-numeric
        className={cn(
          "mt-0.5 text-body font-semibold",
          tone === "positive"
            ? "text-positive-700"
            : tone === "caution"
              ? "text-caution-700"
              : tone === "critical"
                ? "text-critical-700"
                : "text-text-primary",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
