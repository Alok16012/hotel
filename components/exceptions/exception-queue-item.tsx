"use client";

import { MessageSquare } from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { DEMO_NOW } from "@/lib/clock";
import type { ExceptionRow } from "@/lib/exceptions";
import { formatAge, formatDuration, formatINRCompact } from "@/lib/format";
import { EXCEPTION_KIND } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { ExceptionSeverity } from "@/types";

/**
 * A rail rather than a badge for severity.
 *
 * The queue is read down the left edge, one item after another, and a coloured
 * bar is legible in that sweep in a way a small word is not. The word is still
 * in the decision panel, because colour on its own is not a label.
 */
const SEVERITY_RAIL: Record<ExceptionSeverity, string> = {
  critical: "bg-critical-600",
  high: "bg-critical-500",
  medium: "bg-caution-500",
  low: "bg-ink-300",
};

export function ExceptionQueueItem({
  row,
  selected,
  onSelect,
}: {
  row: ExceptionRow;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const giveaway = row.businessImpact < 0;

  return (
    <li>
      <button
        type="button"
        aria-current={selected ? "true" : undefined}
        onClick={() => onSelect(row.id)}
        className={cn(
          "group relative flex w-full gap-2.5 overflow-hidden rounded-[var(--radius-card)] py-2 pl-3 pr-2.5 text-left",
          "transition-colors duration-[80ms]",
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500",
          selected ? "bg-brand-50 shadow-[var(--shadow-hairline)]" : "hover:bg-ink-50",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-1 left-0 w-[3px] rounded-full",
            SEVERITY_RAIL[row.severity],
            row.isOpen ? "opacity-100" : "opacity-30",
          )}
        />

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span data-numeric className="text-micro font-medium text-text-muted">
              {row.reference}
            </span>
            <span className="text-micro text-text-muted">·</span>
            <span className="truncate text-micro text-text-secondary">
              {EXCEPTION_KIND[row.kind]}
            </span>
            {row.isOpen ? null : (
              <StatusBadge kind="exceptionStatus" value={row.status} size="sm" className="ml-auto" />
            )}
          </span>

          <span
            className={cn(
              "mt-0.5 block text-meta leading-snug",
              selected ? "font-medium text-text-primary" : "text-text-primary",
            )}
          >
            {row.title}
          </span>

          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-micro text-text-muted">
            <span className="truncate">{row.guestName}</span>
            {row.businessImpact !== 0 ? (
              <span
                data-numeric
                className={cn("font-medium", giveaway ? "text-critical-700" : "text-text-secondary")}
              >
                {giveaway ? "−" : "+"}
                {formatINRCompact(Math.abs(row.businessImpact))}
              </span>
            ) : (
              <span>No rupee value</span>
            )}
            <span data-numeric>
              {row.isOpen
                ? `waiting ${formatAge(row.raisedAt, DEMO_NOW)}`
                : `decided in ${formatDuration(row.elapsedSec)}`}
            </span>
            {row.comments.length > 0 ? (
              <span className="inline-flex items-center gap-0.5">
                <MessageSquare className="size-2.5" aria-hidden="true" />
                <span data-numeric>{row.comments.length}</span>
              </span>
            ) : null}
          </span>
        </span>

        {row.assigneeInitials ? (
          <Avatar
            size="xs"
            tone="neutral"
            initials={row.assigneeInitials}
            className="mt-0.5 shrink-0"
          />
        ) : null}
      </button>
    </li>
  );
}
