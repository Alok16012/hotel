"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAutomationStatus } from "@/lib/repository";
import { formatPct } from "@/lib/format";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const STATE_COPY = {
  active: { label: "Automation on", dot: "bg-positive-500" },
  degraded: { label: "Automation degraded", dot: "bg-caution-500" },
  paused: { label: "Automation paused", dot: "bg-ink-400" },
} as const;

/**
 * The autonomy indicator (§21). This is the one place the product states how
 * much of the day ran without a human, which is the entire promise of
 * management by exception — so it lives in permanent chrome, not a report.
 *
 * The purple accent is reserved system-wide for automation and AI. Using it
 * anywhere else would dilute the one signal that means "a machine did this".
 */
export function AutomationStatus() {
  const status = getAutomationStatus();
  const copy = STATE_COPY[status.state];

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "hidden h-7 items-center gap-1.5 rounded-[var(--radius-control)] px-2 md:inline-flex",
            "border border-hairline bg-surface text-meta text-text-secondary",
            "transition-colors duration-[130ms] ease-[var(--ease-out-quint)]",
            "hover:border-hairline-strong hover:text-text-primary",
          )}
          aria-label={`${copy.label}. ${formatPct(status.autonomyRate, 0)} of enquiries handled without a human today.`}
        >
          <Sparkles className="size-3.5 text-intel-500" aria-hidden="true" />
          <span className="tabular font-medium text-text-primary">
            {formatPct(status.autonomyRate, 0)}
          </span>
          <span className="text-text-muted">autonomous</span>
          <span
            className={cn("ml-0.5 size-1.5 rounded-full", copy.dot)}
            aria-hidden="true"
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end" className="block max-w-[16rem] text-left font-normal">
        <p className="font-medium">{copy.label}</p>
        <p className="mt-1 text-text-onDark-muted">
          {status.handledToday} enquiries answered today with no staff involvement. The rest
          were routed to a person because they needed a judgement call.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
