"use client";

import * as React from "react";
import { Check, CornerUpRight, GripVertical, Repeat2 } from "lucide-react";
import { SourceBadge } from "@/components/common/source-badge";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DEMO_NOW } from "@/lib/clock";
import { formatAge, formatDayMonth, formatINRCompact } from "@/lib/format";
import { LEAD_PRIORITY, LEAD_STAGE, LEAD_STAGE_ORDER, LOST_REASON } from "@/lib/labels";
import type { LeadRow } from "@/lib/leads";
import { cn } from "@/lib/utils";
import type { LeadStage } from "@/types";

/**
 * One enquiry on the board (§15).
 *
 * The card carries only what decides whether to pick this one up next: the
 * money, the arrival, who owns it and whether anyone is waiting. Everything
 * else is a click away in the inbox, and putting it here would turn eight
 * columns into eight walls of text.
 *
 * Dragging is the fast path, not the only path. The move menu beside the name
 * does the same job for a keyboard, and it is a real button rather than a
 * hover-revealed affordance because a control that appears on hover does not
 * exist on a touchscreen.
 */
export function PipelineCard({
  row,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  row: LeadRow;
  dragging: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onMove: (row: LeadRow, stage: LeadStage) => void;
}) {
  const priorityTone =
    row.priority === "urgent"
      ? "bg-critical-500"
      : row.priority === "high"
        ? "bg-caution-500"
        : null;

  return (
    <li
      draggable
      aria-roledescription="Draggable enquiry card"
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", row.id);
        onDragStart(row.id);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative cursor-grab rounded-[var(--radius-card)] bg-surface px-2.5 py-2 active:cursor-grabbing",
        "shadow-[var(--shadow-raised)]",
        // Transform and opacity only: a card lifting under the cursor must not
        // make the column below it reflow.
        "transition-[transform,opacity,box-shadow] duration-[130ms] ease-[var(--ease-out-quint)]",
        "hover:-translate-y-px hover:shadow-[var(--shadow-float)]",
        dragging && "opacity-40",
      )}
    >
      <div className="flex items-center gap-1.5">
        <GripVertical
          className="-ml-1 size-3.5 shrink-0 text-ink-300 transition-colors duration-[80ms] group-hover:text-text-muted"
          aria-hidden="true"
        />
        <SourceBadge source={row.source} />
        {priorityTone ? (
          <span className="flex items-center" title={`${LEAD_PRIORITY[row.priority].label} priority`}>
            <span aria-hidden="true" className={cn("size-1.5 rounded-full", priorityTone)} />
            <span className="sr-only">{LEAD_PRIORITY[row.priority].label} priority</span>
          </span>
        ) : null}

        <p className="min-w-0 flex-1 truncate text-meta font-medium text-text-primary">
          {row.guestName}
        </p>

        {row.isReturningGuest ? (
          <Repeat2 className="size-3 shrink-0 text-accent-600" aria-label="Returning guest" />
        ) : null}

        <MoveMenu row={row} onMove={onMove} />
      </div>

      <div className="mt-1.5 flex items-baseline gap-2">
        <span data-numeric className="text-card font-semibold tracking-tight text-text-primary">
          {formatINRCompact(row.value)}
        </span>
        {/* An estimate and a quoted figure are different promises. The board
            totals them together, so each card has to say which it is. */}
        <span className="text-micro text-text-muted">
          {row.valueIsQuoted ? "quoted" : "estimate"}
        </span>
        <span data-numeric className="ml-auto text-micro text-text-muted">
          {formatAge(row.createdAt, DEMO_NOW)} old
        </span>
      </div>

      <p data-numeric className="mt-1 truncate text-micro text-text-secondary">
        {formatDayMonth(row.checkIn)} · {row.rooms} {row.rooms === 1 ? "room" : "rooms"} ·{" "}
        {row.nights}N
        {row.roomTypeName ? ` · ${row.roomTypeName}` : ""}
      </p>

      <div className="mt-1.5 flex items-center gap-1.5">
        {row.ownerInitials ? (
          <>
            <Avatar size="xs" initials={row.ownerInitials} tone="neutral" />
            <span className="min-w-0 truncate text-micro text-text-muted">{row.ownerName}</span>
          </>
        ) : (
          <span className="text-micro text-caution-700">Unassigned</span>
        )}

        {row.stage === "lost" && row.lostReason ? (
          <span className="ml-auto shrink-0 text-micro text-text-muted">
            {LOST_REASON[row.lostReason]}
          </span>
        ) : row.isBreaching ? (
          <span className="ml-auto shrink-0 text-micro font-medium text-critical-700">
            Unanswered
          </span>
        ) : row.nextActionDueAt ? (
          <span data-numeric className="ml-auto shrink-0 truncate text-micro text-text-muted">
            Due {formatDayMonth(row.nextActionDueAt)}
          </span>
        ) : null}
      </div>
    </li>
  );
}

function MoveMenu({
  row,
  onMove,
}: {
  row: LeadRow;
  onMove: (row: LeadRow, stage: LeadStage) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Move ${row.reference} to another stage`}
          className={cn(
            "grid size-5 shrink-0 place-items-center rounded-[var(--radius-micro)] text-text-muted",
            "transition-colors duration-[80ms] hover:bg-ink-100 hover:text-text-primary",
            "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500",
            "data-[state=open]:bg-ink-100 data-[state=open]:text-text-primary",
          )}
        >
          <CornerUpRight className="size-3.5" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem]">
        <DropdownMenuLabel>Move to</DropdownMenuLabel>
        {LEAD_STAGE_ORDER.map((stage) => (
          <DropdownMenuItem
            key={stage}
            disabled={stage === row.stage}
            onSelect={() => onMove(row, stage)}
          >
            {LEAD_STAGE[stage].label}
            {stage === row.stage ? <Check className="ml-auto text-brand-600" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
