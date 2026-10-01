"use client";

import { DEMO_TODAY } from "@/lib/clock";
import { formatDayMonth, formatWeekday } from "@/lib/format";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * The date the whole application is reasoning about (§9).
 *
 * Hotel work is anchored to a business day: arrivals today, the rate for
 * tonight, the follow-ups due before close. Showing that day in permanent
 * chrome means no screen has to re-explain what "today" refers to.
 */
export function TodayIndicator() {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <div
          className="hidden h-7 cursor-default items-center gap-1.5 rounded-[var(--radius-control)] px-2 text-meta lg:flex"
          aria-label={`Today is ${formatWeekday(DEMO_TODAY)}, ${formatDayMonth(DEMO_TODAY)}`}
        >
          <span className="font-medium text-text-primary">Today</span>
          <span className="tabular text-text-muted">{formatDayMonth(DEMO_TODAY)}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="block text-left font-normal">
        <p className="font-medium">{formatWeekday(DEMO_TODAY)}</p>
        <p className="text-text-onDark-muted">Business day, Asia/Kolkata</p>
      </TooltipContent>
    </Tooltip>
  );
}
