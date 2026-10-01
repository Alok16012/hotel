"use client";

import * as React from "react";
import {
  AlarmClock,
  Bot,
  Check,
  ChevronDown,
  Hand,
  Repeat2,
  Undo2,
  UserRoundCog,
} from "lucide-react";
import { SourceBadge } from "@/components/common/source-badge";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { chasesUnanswered } from "@/lib/automation";
import { DEMO_NOW } from "@/lib/clock";
import type { FollowUpRow as Row } from "@/lib/followups";
import { formatDayMonth, formatINRCompact, formatRelative } from "@/lib/format";
import { FOLLOW_UP_REASON, TEAM_ROLE } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { TeamMember } from "@/types";
import { SNOOZE_OPTIONS, dueLabel, needsHandover, sequenceSummary } from "./model";

/**
 * One touchpoint in the queue (§14).
 *
 * The row answers four questions in reading order: how late is it, who is it
 * about, what was agreed, and what is at stake. A person working this screen
 * decides in about two seconds whether to open it, and every line here exists
 * to serve that decision.
 *
 * The three actions are always visible rather than revealed on hover. This
 * queue is the most repetitive screen in the product, and a control that hides
 * until a mouse arrives does not exist at all on a phone.
 */
export function FollowUpRowItem({
  row,
  team,
  chaseLimit,
  onDone,
  onReopen,
  onSnooze,
  onReassign,
}: {
  row: Row;
  team: TeamMember[];
  /** How many automated chases the settings screen currently allows. */
  chaseLimit: number;
  onDone: (row: Row) => void;
  onReopen: (row: Row) => void;
  onSnooze: (row: Row, optionId: string) => void;
  onReassign: (row: Row, member: TeamMember) => void;
}) {
  const done = row.status === "done";
  const due = dueLabel(row.dueAt, DEMO_NOW);
  const handover = needsHandover(row, chaseLimit);

  return (
    <li
      className={cn(
        "group relative rounded-[var(--radius-card)] bg-surface px-3 py-2.5",
        "shadow-[var(--shadow-raised)]",
        "transition-[transform,box-shadow] duration-[130ms] ease-[var(--ease-out-quint)]",
        "hover:-translate-y-px hover:shadow-[var(--shadow-float)]",
        // Closed work stays readable but stops competing for attention. It is
        // evidence, not a task.
        done && "bg-surface-sunken/70 shadow-none hover:translate-y-0 hover:shadow-[var(--shadow-hairline)]",
      )}
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="min-w-[14rem] flex-1">
          {/* Line 1: who and why. */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge intent={done ? "neutral" : "outline"} size="sm">
              {FOLLOW_UP_REASON[row.reason]}
            </Badge>

            <span className="truncate text-body font-medium text-text-primary">
              {row.guestName}
            </span>

            {row.isReturningGuest ? (
              <Repeat2 className="size-3.5 shrink-0 text-accent-600" aria-label="Returning guest" />
            ) : null}

            {row.company ? (
              <span className="truncate text-meta text-text-muted">{row.company}</span>
            ) : null}

            <span data-numeric className="text-micro text-text-muted">
              {row.leadReference}
            </span>

            <SourceBadge source={row.channel} />

            {done ? (
              <span data-numeric className="text-micro text-text-muted">
                Closed {row.completedAt ? formatRelative(row.completedAt, DEMO_NOW) : ""}
              </span>
            ) : (
              <span
                data-numeric
                className={cn(
                  "text-meta font-medium",
                  due.overdue ? "text-critical-700" : "text-text-secondary",
                )}
              >
                {due.text}
              </span>
            )}
          </div>

          {/* Line 2: the agreement behind the chase. */}
          <p className={cn("mt-1 text-meta", done ? "text-text-muted" : "text-text-secondary")}>
            {row.note}
          </p>

          {/* Line 3: what the system thinks should happen next. Marked as a
              suggestion, because a recommendation presented as an instruction
              is how automation loses a desk's trust (§42). */}
          {!done ? (
            <p className="mt-1.5 flex items-start gap-1.5 text-meta text-text-primary">
              <Bot className="mt-0.5 size-3.5 shrink-0 text-intel-600" aria-hidden="true" />
              <span>
                <span className="text-text-muted">Suggested: </span>
                {row.suggestedAction}
              </span>
            </p>
          ) : null}

          {/* Line 4: the money and the stay, so nobody opens a second screen. */}
          <p data-numeric className="mt-1.5 text-micro text-text-muted">
            <span className="font-semibold text-text-secondary">
              {formatINRCompact(row.value)}
            </span>{" "}
            {row.valueIsQuoted ? "quoted" : "estimate"}
            {row.quotedAt ? ` ${formatRelative(row.quotedAt, DEMO_NOW)}` : ""} ·{" "}
            {formatDayMonth(row.checkIn)} - {formatDayMonth(row.checkOut)} · {row.rooms}{" "}
            {row.rooms === 1 ? "room" : "rooms"} · {row.nights}N
            {row.roomTypeName ? ` · ${row.roomTypeName}` : ""}
          </p>

          {/* Line 5: how many times this guest has already been contacted. */}
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-micro text-text-muted">
            <span className="inline-flex items-center gap-1">
              {row.isAutomated ? (
                <Bot className="size-3" aria-hidden="true" />
              ) : (
                <Hand className="size-3" aria-hidden="true" />
              )}
              {row.isAutomated ? "Scheduled by automation" : "Set by a colleague"}
            </span>
            {/* The separator rides on the sequence text rather than sitting
                between the two spans, so a narrow screen wraps it onto the
                next line with the text instead of orphaning it. */}
            <span data-numeric className="before:mr-2 before:content-['·']">
              {sequenceSummary(row)}
            </span>
            {handover ? (
              <Badge
                intent="caution"
                size="sm"
                title={`${chasesUnanswered(row.attemptsSent)}. The next attempt should be a person, not another automated one.`}
              >
                Needs a person
              </Badge>
            ) : null}
          </p>
        </div>

        {/* Owner and the three actions. */}
        <div className="flex shrink-0 items-center gap-1.5">
          <ReassignMenu row={row} team={team} onReassign={onReassign} />

          {done ? (
            <Button variant="ghost" size="sm" onClick={() => onReopen(row)}>
              <Undo2 aria-hidden="true" />
              Reopen
            </Button>
          ) : (
            <>
              <SnoozeMenu row={row} onSnooze={onSnooze} />
              <Button variant="secondary" size="sm" onClick={() => onDone(row)}>
                <Check aria-hidden="true" />
                Mark done
              </Button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * The owner chip is the reassign control.
 *
 * Reassignment always starts from looking at who has it, so the avatar and the
 * action are the same object rather than two controls a row apart.
 */
function ReassignMenu({
  row,
  team,
  onReassign,
}: {
  row: Row;
  team: TeamMember[];
  onReassign: (row: Row, member: TeamMember) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Owned by ${row.ownerName}. Reassign this follow-up.`}
          className={cn(
            "inline-flex items-center gap-1 rounded-[var(--radius-control)] px-1 py-1 text-text-muted",
            "transition-colors duration-[80ms] hover:bg-ink-100 hover:text-text-primary",
            "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500",
            "data-[state=open]:bg-ink-100 data-[state=open]:text-text-primary",
          )}
        >
          <Avatar size="xs" initials={row.ownerInitials} tone="neutral" />
          <ChevronDown className="size-3" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[13rem]">
        <DropdownMenuLabel>
          <span className="inline-flex items-center gap-1.5">
            <UserRoundCog className="size-3.5" aria-hidden="true" />
            Reassign to
          </span>
        </DropdownMenuLabel>
        {team.map((member) => (
          <DropdownMenuItem
            key={member.id}
            disabled={member.id === row.ownerId}
            onSelect={() => onReassign(row, member)}
          >
            <span className="truncate">{member.name}</span>
            {member.id === row.ownerId ? (
              <Check className="ml-auto text-brand-600" />
            ) : (
              <span className="ml-auto shrink-0 text-micro text-text-muted">
                {TEAM_ROLE[member.role]}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SnoozeMenu({
  row,
  onSnooze,
}: {
  row: Row;
  onSnooze: (row: Row, optionId: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Snooze the follow-up on ${row.guestName}`}>
          <AlarmClock aria-hidden="true" />
          Snooze
          <ChevronDown className="opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem]">
        <DropdownMenuLabel>Come back in</DropdownMenuLabel>
        {SNOOZE_OPTIONS.map((option) => (
          <DropdownMenuItem key={option.id} onSelect={() => onSnooze(row, option.id)}>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
