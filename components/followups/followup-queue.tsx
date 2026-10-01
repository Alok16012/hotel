"use client";

import * as React from "react";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { CHASE_RULE_ID, chaseLimitFor } from "@/lib/automation";
import { DEMO_NOW } from "@/lib/clock";
import type { FollowUpRow } from "@/lib/followups";
import { formatINRCompact } from "@/lib/format";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { AutomationMode, TeamMember } from "@/types";
import { FollowUpRowItem } from "./followup-row";
import {
  EMPTY_QUEUE_FILTERS,
  SNOOZE_OPTIONS,
  applyPatches,
  bucketCounts,
  buildSections,
  dueLabel,
  filterQueue,
  type QueueFilterState,
  type QueuePatch,
} from "./model";
import { QueueToolbar } from "./queue-toolbar";

/**
 * The follow-up queue (§14).
 *
 * One client component owns the screen for the same reason the deal board
 * does: marking something done moves it between two piles and changes three
 * counts in the same frame, and splitting that across islands would give one
 * number two owners.
 *
 * Every action here is undoable and none of it is written anywhere. The footer
 * says so plainly rather than letting a convincing toast imply a saved queue.
 */
export function FollowUpQueue({
  rows,
  team,
  chaseMode,
}: {
  rows: FollowUpRow[];
  team: TeamMember[];
  /** The seeded automation mode for chasing quiet quotes. */
  chaseMode: AutomationMode;
}) {
  const [patches, setPatches] = React.useState<Record<string, QueuePatch>>({});

  /**
   * The settings screen decides how many chases automation gets before the
   * work is handed to a person, and this queue is where that decision shows
   * up. Read once here rather than per row, so the whole list agrees.
   */
  const chaseOverride = useSession((s) => s.automationModes[CHASE_RULE_ID]);
  const chaseLimit = chaseLimitFor(chaseOverride ?? chaseMode);
  const [filters, setFilters] = React.useState<QueueFilterState>(EMPTY_QUEUE_FILTERS);

  const patched = React.useMemo(() => applyPatches(rows, patches), [rows, patches]);
  const visible = React.useMemo(() => filterQueue(patched, filters), [patched, filters]);
  const counts = React.useMemo(() => bucketCounts(visible), [visible]);
  const sections = React.useMemo(() => buildSections(visible, filters.scope), [visible, filters.scope]);

  function restore(id: string, snapshot: QueuePatch | undefined) {
    setPatches((current) => {
      const next = { ...current };
      if (snapshot) next[id] = snapshot;
      else delete next[id];
      return next;
    });
  }

  /** Every edit goes through here, so undo behaves identically for all three. */
  function commit(row: FollowUpRow, patch: QueuePatch, message: string, description: string) {
    const snapshot = patches[row.id];
    setPatches((current) => ({ ...current, [row.id]: { ...current[row.id], ...patch } }));
    toast.success(message, {
      description,
      action: { label: "Undo", onClick: () => restore(row.id, snapshot) },
    });
  }

  function onDone(row: FollowUpRow) {
    commit(
      row,
      { status: "done", completedAt: DEMO_NOW.toISOString() },
      `Closed the ${row.guestName} follow-up`,
      `${row.leadReference} · ${formatINRCompact(row.value)} still open on the enquiry`,
    );
  }

  function onReopen(row: FollowUpRow) {
    commit(
      row,
      { status: "pending", completedAt: undefined },
      `Reopened the ${row.guestName} follow-up`,
      `Back in the queue, due ${dueLabel(row.dueAt, DEMO_NOW).text}`,
    );
  }

  function onSnooze(row: FollowUpRow, optionId: string) {
    const option = SNOOZE_OPTIONS.find((o) => o.id === optionId);
    if (!option) return;
    const dueAt = option.resolve();
    commit(
      row,
      { status: "snoozed", dueAt },
      `Snoozed ${row.guestName} for ${option.label.toLowerCase()}`,
      `Due again ${dueLabel(dueAt, DEMO_NOW).text}`,
    );
  }

  function onReassign(row: FollowUpRow, member: TeamMember) {
    commit(
      row,
      { ownerId: member.id, ownerName: member.name, ownerInitials: member.avatarInitials },
      `Reassigned to ${member.name}`,
      `${row.guestName} · ${row.leadReference}, was with ${row.ownerName}`,
    );
  }

  const empty = sections.every((section) => section.rows.length === 0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Follow-ups"
        description="Every scheduled touchpoint on an open enquiry, with what it is chasing and how many attempts have already been made."
      >
        <QueueToolbar
          team={team}
          state={filters}
          counts={counts}
          onChange={(next) => setFilters((current) => ({ ...current, ...next }))}
          shown={visible.length}
          total={patched.length}
        />
      </PageHeader>

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6">
        {empty ? (
          <EmptyState
            icon={CheckCheck}
            title="Nothing matches this view"
            description="The filters above are narrower than the queue. Clear them to see the rest of the day."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {sections.map((section) => (
              <section key={section.bucket}>
                {/* The heading sticks because the overdue pile can be long
                    enough that a person scrolls past the only thing telling
                    them these are late. */}
                <h2
                  className={cn(
                    "sticky top-0 z-[1] -mx-1 mb-1.5 flex items-baseline gap-2 bg-canvas px-1 py-1",
                    "text-meta font-semibold",
                    section.bucket === "overdue" && section.rows.length > 0
                      ? "text-critical-700"
                      : "text-text-secondary",
                  )}
                >
                  {section.label}
                  <span data-numeric className="text-micro font-normal text-text-muted">
                    {section.rows.length}
                  </span>
                </h2>

                {section.rows.length === 0 ? (
                  <p className="px-1 py-2 text-meta text-text-muted">{section.empty}</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {section.rows.map((row) => (
                      <FollowUpRowItem
                        key={row.id}
                        row={row}
                        team={team}
                        chaseLimit={chaseLimit}
                        onDone={onDone}
                        onReopen={onReopen}
                        onSnooze={onSnooze}
                        onReassign={onReassign}
                      />
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </div>

      <p className="shrink-0 border-t border-hairline px-4 py-1.5 text-micro text-text-muted sm:px-6">
        Piles follow the due time, so snoozing something moves it out of Overdue straight away.
        Done, snooze and reassign are held for this session only.
      </p>
    </div>
  );
}
