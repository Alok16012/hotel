"use client";

import { ArrowRight, Inbox } from "lucide-react";
import { SourceBadge } from "@/components/common/source-badge";
import { DEMO_NOW } from "@/lib/clock";
import { formatAge, formatDuration, formatINRCompact } from "@/lib/format";
import type { LeadRow } from "@/lib/leads";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/kbd";

/**
 * What fills the pane before anything is selected (§10, §42).
 *
 * An empty right-hand pane is wasted screen on the one page an operator lives
 * in, so it answers the question they opened the page with: what is late, and
 * who has been waiting longest. Every line here is a shortcut into the work,
 * which makes the landing state a triage list rather than an apology.
 */
export function TriagePane({
  rows,
  onSelect,
  className,
}: {
  rows: LeadRow[];
  onSelect: (id: string) => void;
  className?: string;
}) {
  const open = rows.filter((row) => row.stage !== "booked" && row.stage !== "lost");
  const waiting = open.filter((row) => row.waitingSec > 0);
  const breaching = open.filter((row) => row.isBreaching);
  const unassigned = open.filter((row) => !row.ownerId);

  const queue = [...waiting]
    .sort((a, b) => b.unattendedSec - a.unattendedSec || b.waitingSec - a.waitingSec)
    .slice(0, 6);

  return (
    <section
      aria-label="Queue summary"
      className={cn("min-w-0 flex-1 overflow-y-auto px-6 py-8", className)}
    >
      <div className="mx-auto max-w-xl">
        <div className="mb-1 flex items-center gap-2">
          <Inbox className="size-4 text-text-muted" aria-hidden="true" />
          <h2 className="text-section font-semibold text-text-primary">
            {waiting.length === 0
              ? "Nobody is waiting on a reply"
              : `${waiting.length} ${waiting.length === 1 ? "guest is" : "guests are"} waiting on a reply`}
          </h2>
        </div>
        <p className="text-body text-text-secondary">
          {breaching.length > 0
            ? `${breaching.length} of them ${breaching.length === 1 ? "has" : "have"} had no acknowledgement at all, past the thirty minute target.`
            : "Every open thread has been acknowledged inside the target."}
          {unassigned.length > 0
            ? ` ${unassigned.length} open ${unassigned.length === 1 ? "enquiry has" : "enquiries have"} no name against ${unassigned.length === 1 ? "it" : "them"}.`
            : ""}
        </p>

        {queue.length > 0 ? (
          <ol className="mt-5 divide-y divide-hairline rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-hairline),var(--shadow-bezel)]">
            {queue.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onSelect(row.id)}
                  className={cn(
                    "group flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left",
                    "transition-colors duration-[80ms] hover:bg-ink-50",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500",
                    "first:rounded-t-[var(--radius-card)] last:rounded-b-[var(--radius-card)]",
                  )}
                >
                  <SourceBadge source={row.source} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-medium text-text-primary">
                      {row.guestName}
                    </span>
                    <span data-numeric className="block truncate text-micro text-text-muted">
                      {row.nextAction} · last activity {formatAge(row.lastActivityAt, DEMO_NOW)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span
                      data-numeric
                      className={cn(
                        "block text-meta font-medium",
                        row.isBreaching ? "text-critical-700" : "text-caution-700",
                      )}
                    >
                      {row.isBreaching
                        ? `Unanswered ${formatDuration(row.unattendedSec)}`
                        : `Waiting ${formatDuration(row.waitingSec)}`}
                    </span>
                    <span data-numeric className="block text-micro text-text-muted">
                      {formatINRCompact(row.value)}
                    </span>
                  </span>
                  <ArrowRight
                    className="size-3.5 shrink-0 text-text-muted opacity-0 transition-opacity duration-[130ms] group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ol>
        ) : null}

        <p className="mt-4 text-meta text-text-muted">
          Pick an enquiry on the left, or move through the list with <Kbd>↑</Kbd> <Kbd>↓</Kbd>.
        </p>
      </div>
    </section>
  );
}
