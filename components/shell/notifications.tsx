"use client";

import Link from "next/link";
import { Bell, CalendarClock, Inbox, ShieldAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNavCounts } from "@/lib/repository";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Alert {
  icon: LucideIcon;
  tone: "critical" | "caution" | "neutral";
  title: string;
  detail: string;
  href: string;
}

const TONE_RING = {
  critical: "bg-critical-100 text-critical-600",
  caution: "bg-caution-100 text-caution-700",
  neutral: "bg-ink-100 text-ink-600",
} as const;

/**
 * Notifications here are aggregate, not per-event.
 *
 * A management-by-exception product that pings on every enquiry trains the
 * operator to ignore the bell. These three lines answer one question — "is
 * anything waiting on me?" — and each one is a link into the queue that owns it.
 */
export function Notifications() {
  const counts = getNavCounts();

  const alerts: Alert[] = [
    {
      icon: ShieldAlert,
      tone: "critical",
      title: `${counts.openExceptions} exceptions need a decision`,
      detail: "Discount below floor, a VIP request and one complaint.",
      href: "/exceptions",
    },
    {
      icon: Inbox,
      tone: "caution",
      title: `${counts.leadsNeedingReply} leads awaiting reply`,
      detail: "Past the 15-minute response target for their channel.",
      href: "/leads",
    },
    {
      icon: CalendarClock,
      tone: "neutral",
      title: `${counts.followUpsDue} follow-ups due today`,
      detail: "Scheduled touchpoints on quotes sent earlier this week.",
      href: "/follow-ups",
    },
  ];

  const total = counts.openExceptions + counts.leadsNeedingReply + counts.followUpsDue;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={`Notifications, ${total} items need attention`}
        >
          <Bell />
          {counts.openExceptions > 0 ? (
            // A dot, not a count: the exact number lives one click away, and a
            // numeric badge in permanent chrome reads as a score to clear.
            <span
              className="absolute right-1 top-1 size-1.5 rounded-full bg-critical-500 ring-2 ring-canvas"
              aria-hidden="true"
            />
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[21rem] p-0">
        <div className="flex items-center justify-between px-3 pb-1.5 pt-2.5">
          <DropdownMenuLabel className="p-0">Needs attention</DropdownMenuLabel>
          <span className="tabular text-micro text-text-muted">{total} items</span>
        </div>
        <DropdownMenuSeparator className="mx-0 my-0" />

        <ul className="p-1">
          {alerts.map((alert) => (
            <li key={alert.href}>
              <Link
                href={alert.href}
                className={cn(
                  "flex items-start gap-2.5 rounded-[var(--radius-sm)] p-2",
                  "transition-colors duration-[80ms] hover:bg-ink-50",
                  "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500",
                )}
              >
                <span
                  className={cn(
                    "mt-px grid size-6 shrink-0 place-items-center rounded-[var(--radius-sm)]",
                    TONE_RING[alert.tone],
                  )}
                >
                  <alert.icon className="size-3.5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-body font-medium text-text-primary">
                    {alert.title}
                  </span>
                  <span className="mt-0.5 block text-meta leading-snug text-text-muted">
                    {alert.detail}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <DropdownMenuSeparator className="mx-0 my-0" />
        <p className="px-3 py-2 text-micro text-text-muted">
          Routine enquiries are handled automatically and are not listed here.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
