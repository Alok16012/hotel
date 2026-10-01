"use client";

import * as React from "react";
import { formatINRCompact } from "@/lib/format";
import type { LeadRow } from "@/lib/leads";
import { cn } from "@/lib/utils";
import type { LeadStage } from "@/types";
import type { BoardColumn } from "./model";
import { PipelineCard } from "./pipeline-card";

/**
 * A stage column (§15).
 *
 * The header is the reason this screen exists rather than being a second lead
 * table: count, money and average age, per stage, without anyone exporting
 * anything. Age is the number that catches problems, so it is the one allowed
 * to change colour.
 */
export function PipelineColumn({
  column,
  draggingId,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDragOverColumn,
  onDrop,
  onMove,
}: {
  column: BoardColumn;
  draggingId: string | null;
  isDropTarget: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOverColumn: (stage: LeadStage) => void;
  onDrop: (stage: LeadStage, leadId: string) => void;
  onMove: (row: LeadRow, stage: LeadStage) => void;
}) {
  const stale = column.avgAgeDays >= 7;
  const accent = STAGE_ACCENT[column.stage];

  return (
    <section
      aria-label={`${column.label}, ${column.rows.length} ${
        column.rows.length === 1 ? "enquiry" : "enquiries"
      }`}
      onDragOver={(event) => {
        if (!draggingId) return;
        // Without preventDefault the browser refuses the drop outright.
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onDragOverColumn(column.stage);
      }}
      onDrop={(event) => {
        event.preventDefault();
        const id = event.dataTransfer.getData("text/plain") || draggingId;
        if (id) onDrop(column.stage, id);
      }}
      className={cn(
        "flex w-[16.5rem] shrink-0 flex-col rounded-[var(--radius-surface)] bg-surface-sunken/70",
        "shadow-[var(--shadow-hairline)] transition-colors duration-[130ms]",
        isDropTarget && "bg-brand-50 shadow-[0_0_0_1px_var(--color-brand-300)]",
      )}
    >
      <header className="shrink-0 px-3 pb-2 pt-2.5">
        <div className="flex items-center gap-1.5">
          {/* The stripe is the only place stage colour appears on the board.
              Tinting eight whole columns would leave nothing for the data. */}
          <span aria-hidden="true" className={cn("h-3 w-0.5 rounded-full", accent)} />
          <h2 className="min-w-0 flex-1 truncate text-meta font-semibold text-text-primary">
            {column.label}
          </h2>
          <span
            data-numeric
            className="rounded-[var(--radius-micro)] bg-ink-200/70 px-1.5 text-micro font-medium text-text-secondary"
          >
            {column.rows.length}
          </span>
        </div>

        <div className="mt-1 flex items-baseline gap-2">
          <span data-numeric className="text-meta font-medium text-text-primary">
            {formatINRCompact(column.value)}
          </span>
          {column.rows.length > 0 ? (
            <span
              data-numeric
              className={cn(
                "ml-auto text-micro",
                stale ? "font-medium text-caution-700" : "text-text-muted",
              )}
              title="Average time since the enquiry arrived"
            >
              {formatAvgAge(column.avgAgeDays)} avg age
            </span>
          ) : null}
        </div>
      </header>

      <ul className="scrollbar-slim min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2 pb-2">
        {column.rows.map((row) => (
          <PipelineCard
            key={row.id}
            row={row}
            dragging={row.id === draggingId}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onMove={onMove}
          />
        ))}

        {column.rows.length === 0 ? (
          <li
            className={cn(
              "grid h-20 place-items-center rounded-[var(--radius-card)] px-3 text-center",
              "text-micro text-text-muted shadow-[inset_0_0_0_1px_var(--color-hairline)]",
            )}
          >
            {isDropTarget ? "Drop to move here" : EMPTY_COPY[column.stage]}
          </li>
        ) : null}
      </ul>
    </section>
  );
}

/** Under a day the mean is noise, so it is not dressed up as precision. */
function formatAvgAge(days: number): string {
  if (days < 1) return "under 1d";
  if (days < 10) return `${days.toFixed(1)}d`;
  return `${Math.round(days)}d`;
}

const STAGE_ACCENT: Record<LeadStage, string> = {
  new: "bg-accent-500",
  contacted: "bg-ink-400",
  qualified: "bg-ink-400",
  quote_sent: "bg-brand-500",
  negotiating: "bg-caution-500",
  payment_pending: "bg-caution-500",
  booked: "bg-positive-500",
  lost: "bg-critical-500",
};

/**
 * Empty columns say what an empty column means here rather than "no items".
 * On a pipeline, nothing in Payment pending is good news and nothing in New is
 * either a quiet morning or a broken channel.
 */
const EMPTY_COPY: Record<LeadStage, string> = {
  new: "No unopened enquiries",
  contacted: "Nobody is mid-conversation",
  qualified: "Nothing qualified and waiting to be priced",
  quote_sent: "No quotes outstanding",
  negotiating: "Nothing under negotiation",
  payment_pending: "No payment links waiting",
  booked: "Nothing converted in this view",
  lost: "Nothing lost in this view",
};
