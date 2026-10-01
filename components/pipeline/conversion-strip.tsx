"use client";

import { ChevronRight, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatINRCompact, formatPct } from "@/lib/format";
import { LOST_REASON } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { LostSummary, StageStep } from "./model";

/**
 * How far the book has travelled, in one band above the board (§15).
 *
 * The honest framing matters more than the chart. Nothing in this model records
 * when a lead entered a stage, so these are not historical conversion rates:
 * they are the share of the current book that has reached each stage. An
 * enquiry sitting at Qualified is held back, not lost, and the strip says so.
 * A percentage that claims more than the data supports is worse than no
 * percentage at all in a room where people make pricing decisions.
 */
export function ConversionStrip({
  steps,
  lost,
  className,
}: {
  steps: StageStep[];
  lost: LostSummary;
  className?: string;
}) {
  const start = steps[0]?.reached ?? 0;
  const booked = steps[steps.length - 1]?.reached ?? 0;
  const overall = start === 0 ? null : booked / start;

  return (
    <section
      aria-label="Stage reach"
      className={cn(
        "flex flex-wrap items-stretch gap-x-1 gap-y-2.5 rounded-[var(--radius-surface)] bg-surface px-3 py-2.5",
        "shadow-[var(--shadow-raised)]",
        className,
      )}
    >
      <div className="flex shrink-0 flex-col justify-center pr-3">
        <span className="flex items-center gap-1 text-micro uppercase tracking-wider text-text-muted">
          Reached
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  "cursor-help rounded-[var(--radius-micro)] text-text-muted",
                  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500",
                )}
              >
                <Info className="size-3" aria-hidden="true" />
                <span className="sr-only">What stage reach measures</span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[20rem] font-normal leading-snug">
              Share of the enquiries on this board that have got as far as each stage. A snapshot
              of where the book stands, not a historical conversion rate.
            </TooltipContent>
          </Tooltip>
        </span>
        <span data-numeric className="text-meta font-semibold text-text-primary">
          {overall === null ? "No enquiries" : `${formatPct(overall, 0)} booked`}
        </span>
      </div>

      {/* The chain scrolls rather than wraps. A funnel read top to bottom in
          three broken rows is not a funnel, and on a phone the wrapped version
          clipped the stage labels entirely. It sits on its own line below the
          two summaries at narrow widths. */}
      <ol
        className={cn(
          "scrollbar-slim order-last flex w-full flex-nowrap items-center gap-x-0.5 overflow-x-auto",
          "sm:order-none sm:w-auto sm:min-w-0 sm:flex-1",
        )}
      >
        {steps.map((step, index) => (
          <li key={step.stage} className="flex shrink-0 items-center">
            {index > 0 ? (
              <span className="flex shrink-0 flex-col items-center px-1">
                <ChevronRight className="size-3 text-ink-300" aria-hidden="true" />
                <span
                  data-numeric
                  className={cn(
                    "text-micro leading-none",
                    step.carriedPct !== null && step.carriedPct < 0.5
                      ? "font-medium text-caution-700"
                      : "text-text-muted",
                  )}
                >
                  {step.carriedPct === null ? "" : formatPct(step.carriedPct, 0)}
                </span>
              </span>
            ) : null}

            <div className="rounded-[var(--radius-sm)] px-1.5 py-0.5">
              <p data-numeric className="text-card font-semibold leading-tight text-text-primary">
                {step.reached}
              </p>
              <p className="whitespace-nowrap text-micro leading-tight text-text-muted">
                {step.label}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {/* Lost is set apart rather than being the last link in the chain. It is
          not a stage the others pass through, and drawing it inline would imply
          an order the data does not have. */}
      <div className="ml-auto flex shrink-0 items-center gap-2 border-l border-hairline pl-3 sm:ml-0">
        <div>
          <p data-numeric className="text-card font-semibold leading-tight text-critical-700">
            {lost.count}
          </p>
          <p className="text-micro leading-tight text-text-muted">
            Lost · {formatINRCompact(lost.value)}
          </p>
        </div>
        {/* A single reason is only named as the cause when it actually accounts
            for most of the losses. Three enquiries lost three different ways is
            not a pattern, and naming the first of them would send somebody off
            to fix the wrong thing. */}
        {lost.count === 1 && lost.reasons[0] ? (
          <p className="max-w-[11rem] text-micro leading-tight text-text-muted">
            {LOST_REASON[lost.reasons[0].reason]}
          </p>
        ) : lost.dominant ? (
          <p className="max-w-[11rem] text-micro leading-tight text-text-muted">
            Mostly {LOST_REASON[lost.dominant.reason].toLowerCase()}
            <span data-numeric> ({lost.dominant.count})</span>
          </p>
        ) : lost.reasons.length > 1 ? (
          <p data-numeric className="max-w-[11rem] text-micro leading-tight text-text-muted">
            {lost.reasons.length} different reasons
          </p>
        ) : null}
      </div>
    </section>
  );
}
