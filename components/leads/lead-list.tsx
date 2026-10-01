"use client";

import * as React from "react";
import { Inbox, Paperclip, Repeat2 } from "lucide-react";
import { SourceBadge } from "@/components/common/source-badge";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { DEMO_NOW } from "@/lib/clock";
import { formatAge, formatDayMonth, formatDuration, formatINRCompact } from "@/lib/format";
import { LEAD_PRIORITY } from "@/lib/labels";
import type { LeadRow } from "@/lib/leads";
import { cn } from "@/lib/utils";

/**
 * The inbox (§10).
 *
 * A row has to answer four questions in one glance: who is asking, what it is
 * worth, how late the desk is, and what state the enquiry is in. Everything
 * else belongs in the detail pane. The rows are deliberately dense; an operator
 * working a Saturday morning wants twenty enquiries on screen, not six.
 *
 * Selection is a listbox rather than a list of links. The pane beside it swaps
 * instantly on arrow keys, which is the behaviour every mail client has trained
 * this exact user to expect.
 */
export function LeadList({
  rows,
  selectedId,
  onSelect,
  emptyDescription,
  className,
}: {
  rows: LeadRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  emptyDescription: string;
  className?: string;
}) {
  const listRef = React.useRef<HTMLUListElement>(null);

  function onKeyDown(event: React.KeyboardEvent<HTMLUListElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();

    const index = rows.findIndex((r) => r.id === selectedId);
    const next =
      event.key === "ArrowDown"
        ? Math.min(index + 1, rows.length - 1)
        : Math.max(index - 1, 0);
    const target = rows[index === -1 ? 0 : next];
    if (!target) return;

    onSelect(target.id);
    listRef.current
      ?.querySelector<HTMLLIElement>(`[data-lead-id="${target.id}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }

  /**
   * Clicking a row hands focus back to the listbox rather than leaving it on
   * the row. Otherwise the first arrow key after a click would be swallowed by
   * a focused row button and the list would feel dead to the keyboard.
   */
  function focusList() {
    listRef.current?.focus();
  }

  if (rows.length === 0) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <EmptyState
          icon={Inbox}
          title="Nothing in this view"
          description={emptyDescription}
          size="sm"
        />
      </div>
    );
  }

  return (
    <ul
      ref={listRef}
      role="listbox"
      aria-label="Enquiries"
      tabIndex={0}
      // One tab stop for the whole inbox, with the selected row named through
      // activedescendant. Twenty-six tab stops down a queue is not navigation.
      aria-activedescendant={selectedId ? optionId(selectedId) : undefined}
      onKeyDown={onKeyDown}
      className={cn(
        "scrollbar-slim divide-y divide-hairline overflow-y-auto outline-none",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500",
        className,
      )}
    >
      {rows.map((row) => (
        <LeadListRow
          key={row.id}
          row={row}
          selected={row.id === selectedId}
          onSelect={onSelect}
          onAfterSelect={focusList}
        />
      ))}
    </ul>
  );
}

/** Stable id per row so the listbox can point at one with activedescendant. */
function optionId(leadId: string): string {
  return `lead-option-${leadId}`;
}

function LeadListRow({
  row,
  selected,
  onSelect,
  onAfterSelect,
}: {
  row: LeadRow;
  selected: boolean;
  onSelect: (id: string) => void;
  onAfterSelect: () => void;
}) {
  const unread = row.unreadCount > 0;
  const priorityTone =
    row.priority === "urgent"
      ? "bg-critical-500"
      : row.priority === "high"
        ? "bg-caution-500"
        : null;

  return (
    <li id={optionId(row.id)} data-lead-id={row.id} role="option" aria-selected={selected}>
      <button
        type="button"
        // Out of the tab order on purpose: the listbox above is the tab stop
        // and the arrow keys do the walking.
        tabIndex={-1}
        onClick={() => {
          onSelect(row.id);
          onAfterSelect();
        }}
        className={cn(
          "relative w-full cursor-pointer px-3 py-2.5 text-left",
          "transition-colors duration-[80ms]",
          selected ? "bg-brand-50" : "hover:bg-ink-50",
          "focus-visible:outline-none",
        )}
      >
        {/* Selection is a bar, not just a tint. On a dense list a background
            change alone is easy to lose when the eye is scanning numbers. */}
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-0 left-0 w-0.5 bg-brand-600 transition-opacity duration-[130ms]",
            selected ? "opacity-100" : "opacity-0",
          )}
        />

        <div className="flex items-center gap-1.5">
          <SourceBadge source={row.source} />

          {priorityTone ? (
            <span className="flex items-center" title={`${LEAD_PRIORITY[row.priority].label} priority`}>
              <span aria-hidden="true" className={cn("size-1.5 rounded-full", priorityTone)} />
              <span className="sr-only">{LEAD_PRIORITY[row.priority].label} priority</span>
            </span>
          ) : null}

          <p
            className={cn(
              "min-w-0 flex-1 truncate text-body text-text-primary",
              unread ? "font-semibold" : "font-medium",
            )}
          >
            {row.guestName}
          </p>

          {row.isReturningGuest ? (
            <Repeat2 className="size-3 shrink-0 text-accent-600" aria-label="Returning guest" />
          ) : null}

          <span data-numeric className="shrink-0 text-meta font-medium text-text-primary">
            {formatINRCompact(row.value)}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-1.5">
          <StatusBadge kind="leadStage" value={row.stage} />
          <span data-numeric className="truncate text-micro text-text-muted">
            {formatDayMonth(row.checkIn)} · {row.rooms} {row.rooms === 1 ? "room" : "rooms"} ·{" "}
            {row.nights}N
          </span>
          <span data-numeric className="ml-auto shrink-0 text-micro text-text-muted">
            {formatAge(row.lastActivityAt, DEMO_NOW)}
          </span>
        </div>

        <div className="mt-1 flex items-start gap-2">
          <p
            className={cn(
              "line-clamp-2 min-w-0 flex-1 text-meta leading-snug",
              unread ? "text-text-secondary" : "text-text-muted",
            )}
          >
            {!row.hasThread ? (
              <span className="inline-flex items-center gap-1 text-text-muted">
                <Paperclip className="size-3" aria-hidden="true" />
                Logged at the desk, no thread on this channel
              </span>
            ) : (
              row.lastMessagePreview
            )}
          </p>

          {unread ? (
            <span
              data-numeric
              className="mt-0.5 grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-brand-600 px-1 text-micro font-semibold text-white"
            >
              {row.unreadCount}
              <span className="sr-only">unread messages</span>
            </span>
          ) : null}
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          {row.ownerInitials ? (
            <span className="flex items-center gap-1.5">
              <Avatar size="xs" initials={row.ownerInitials} tone="neutral" />
              <span className="truncate text-micro text-text-muted">{row.ownerName}</span>
            </span>
          ) : (
            <span className="text-micro text-caution-700">Unassigned</span>
          )}

          {/* Only the desk's own delay is called out. A guest who is waiting on
              a colleague who has already picked the thread up is waiting, but
              nobody needs to be told about it in red. */}
          {row.isBreaching ? (
            <span data-numeric className="ml-auto text-micro font-medium text-critical-700">
              Unanswered {formatDuration(row.unattendedSec)}
            </span>
          ) : row.waitingSec > 0 ? (
            <span data-numeric className="ml-auto text-micro text-caution-700">
              Waiting {formatDuration(row.waitingSec)}
            </span>
          ) : null}
        </div>
      </button>
    </li>
  );
}
