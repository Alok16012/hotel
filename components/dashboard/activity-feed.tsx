"use client";

import * as React from "react";
import {
  ArrowRightLeft,
  BadgeIndianRupee,
  BellRing,
  CalendarCheck,
  FileText,
  Gavel,
  MessageSquare,
  Repeat2,
  Send,
  Sparkles,
  TrendingUp,
  UserPlus,
  UserRoundCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Panel, PanelLink } from "@/components/common/panel";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ActorKind, EventKind, EventRecord } from "@/types";

/**
 * Everything the property did today, newest first (§9, §21).
 *
 * The filter is the argument the product is making: switch to "Needed a
 * person" and the list collapses from forty-five entries to a handful. That
 * contrast is the whole thesis of management by exception, and it is more
 * convincing as a list you can shrink yourself than as a percentage.
 */
const FILTERS = [
  { id: "all", label: "Everything" },
  { id: "automated", label: "Handled by itself" },
  { id: "human", label: "Needed a person" },
  { id: "guest", label: "From guests" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function matches(event: EventRecord, filter: FilterId): boolean {
  switch (filter) {
    case "automated":
      return event.resolvedAutonomously;
    case "human":
      return event.actorKind === "staff";
    case "guest":
      return event.actorKind === "guest";
    default:
      return true;
  }
}

export function ActivityFeed({ events }: { events: EventRecord[] }) {
  const [filter, setFilter] = React.useState<FilterId>("all");
  const visible = events.filter((e) => matches(e, filter));

  return (
    <Panel
      title="Live activity"
      description="Every action taken on the property today, across all eight channels."
      footer={<PanelLink href="/reports">Full activity log</PanelLink>}
      className="min-h-0"
    >
      <div
        role="group"
        aria-label="Filter activity"
        className="scrollbar-slim flex gap-1 overflow-x-auto border-b border-hairline px-3 py-2"
      >
        {FILTERS.map((f) => {
          const count = events.filter((e) => matches(e, f.id)).length;
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 text-meta font-medium",
                "cursor-pointer transition-colors duration-[130ms] ease-[var(--ease-out-quint)]",
                active
                  ? "bg-ink-900 text-text-onDark"
                  : "text-text-secondary hover:bg-ink-100 hover:text-text-primary",
              )}
            >
              {f.label}
              <span
                data-numeric
                className={cn("text-micro", active ? "text-text-onDark-muted" : "text-text-muted")}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <ol className="scrollbar-slim max-h-[30rem] overflow-y-auto">
        {visible.map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
        {visible.length === 0 ? (
          <li className="px-4 py-8 text-center text-meta text-text-muted">
            Nothing in this category today.
          </li>
        ) : null}
      </ol>
    </Panel>
  );
}

function EventRow({ event }: { event: EventRecord }) {
  const Icon = ICON[event.kind];
  const actor = ACTOR[event.actorKind];

  return (
    <li className="flex gap-2.5 border-b border-hairline px-4 py-2 last:border-b-0">
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <span
          className={cn(
            "grid size-5 shrink-0 place-items-center rounded-[var(--radius-micro)]",
            actor.chip,
          )}
        >
          <Icon className="size-3" aria-hidden="true" />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-body leading-snug text-text-primary">{event.summary}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-micro text-text-muted">
          <time dateTime={event.occurredAt} data-numeric>
            {formatTime(event.occurredAt)}
          </time>
          <span aria-hidden="true">·</span>
          <span className={actor.text}>{event.actorName}</span>
          {event.resolvedAutonomously ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-0.5 text-intel-700">
                <Sparkles className="size-2.5" aria-hidden="true" />
                no human touch
              </span>
            </>
          ) : null}
        </p>
      </div>
    </li>
  );
}

/**
 * Actor colour, not event colour.
 *
 * Scanning this list, the question is almost always "did a person have to do
 * that?" — so the strongest visual signal is who acted, and the icon is left to
 * say what happened.
 */
const ACTOR: Record<ActorKind, { chip: string; text: string }> = {
  automation: { chip: "bg-intel-100 text-intel-700", text: "text-text-muted" },
  staff: { chip: "bg-brand-50 text-brand-700", text: "text-brand-700" },
  guest: { chip: "bg-accent-100 text-accent-700", text: "text-text-secondary" },
  system: { chip: "bg-ink-100 text-ink-700", text: "text-text-muted" },
};

const ICON: Record<EventKind, LucideIcon> = {
  lead_created: UserPlus,
  lead_qualified: Sparkles,
  lead_assigned: ArrowRightLeft,
  stage_changed: ArrowRightLeft,
  message_received: MessageSquare,
  message_sent: Send,
  followup_sent: BellRing,
  quote_generated: FileText,
  returning_guest_detected: Repeat2,
  approval_requested: Gavel,
  approval_resolved: UserRoundCheck,
  booking_created: CalendarCheck,
  payment_received: BadgeIndianRupee,
  rate_changed: TrendingUp,
};
