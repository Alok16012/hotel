"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { DEMO_NOW } from "@/lib/clock";
import type { ExceptionCommentRow, ExceptionRow } from "@/lib/exceptions";
import { formatDuration, formatINRCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TeamMember } from "@/types";
import { ExceptionDecision } from "./exception-decision";
import { ExceptionQueueItem } from "./exception-queue-item";
import { ExceptionToolbar } from "./exception-toolbar";
import {
  DECISION_STATUS,
  DECISION_VERB,
  EMPTY_EXCEPTION_FILTERS,
  applyPatches,
  filterExceptions,
  scopeCounts,
  sortExceptions,
  summariseQueue,
  type Decision,
  type ExceptionFilterState,
  type ExceptionPatch,
  type PatchMap,
} from "./model";

/**
 * The exception queue (§20, §42).
 *
 * Master and detail, not a list with a drawer over it. On the other data
 * screens the list is the work and the record is a look-up; here the decision
 * is the work, so it holds the larger half of the screen permanently and the
 * queue is what feeds it.
 *
 * Selection deliberately survives the filters. Approving something in the
 * "Awaiting a decision" scope removes it from that list, and snapping to the
 * next item at that moment would hide the outcome of the thing just decided.
 * The panel keeps showing it until a person chooses to move on.
 */
export function ExceptionWorkspace({
  rows,
  team,
  currentUser,
}: {
  rows: ExceptionRow[];
  team: TeamMember[];
  currentUser: TeamMember;
}) {
  const [patches, setPatches] = React.useState<PatchMap>({});
  const [filters, setFilters] = React.useState<ExceptionFilterState>(EMPTY_EXCEPTION_FILTERS);
  const [selectedId, setSelectedId] = React.useState<string | undefined>(undefined);

  const patched = React.useMemo(() => applyPatches(rows, patches), [rows, patches]);
  const visible = React.useMemo(
    () => sortExceptions(filterExceptions(patched, filters, currentUser.id), filters.sort),
    [patched, filters, currentUser.id],
  );
  const counts = React.useMemo(() => scopeCounts(patched, currentUser.id), [patched, currentUser.id]);
  const summary = React.useMemo(() => summariseQueue(patched), [patched]);

  const selected =
    (selectedId ? patched.find((row) => row.id === selectedId) : undefined) ?? visible[0];

  // Only a decision made here can be taken back here. Seeded history stays as
  // it is, because there is nothing local to unwind and pretending otherwise
  // would imply this screen writes somewhere.
  const reopenable = Boolean(
    selected &&
      patches[selected.id]?.status &&
      rows.find((row) => row.id === selected.id)?.isOpen,
  );

  function restore(id: string, snapshot: ExceptionPatch | undefined) {
    setPatches((current) => {
      const next = { ...current };
      if (snapshot) next[id] = snapshot;
      else delete next[id];
      return next;
    });
  }

  /** Every edit goes through here, so undo behaves identically for all of them. */
  function commit(row: ExceptionRow, patch: ExceptionPatch, message: string, description: string) {
    const snapshot = patches[row.id];
    setPatches((current) => ({ ...current, [row.id]: { ...current[row.id], ...patch } }));
    toast.success(message, {
      description,
      action: { label: "Undo", onClick: () => restore(row.id, snapshot) },
    });
  }

  function onDecide(
    row: ExceptionRow,
    decision: Decision,
    detail: { note?: string; modifiedValue?: number },
  ) {
    const giveaway = Math.max(0, -row.businessImpact);

    commit(
      row,
      {
        status: DECISION_STATUS[decision],
        resolvedAt: DEMO_NOW.toISOString(),
        resolvedById: currentUser.id,
        resolvedByName: currentUser.name,
        decisionNote: detail.note,
        modifiedValue: detail.modifiedValue,
      },
      `${DECISION_VERB[decision]} ${row.reference}`,
      decision === "reject"
        ? `${row.guestName} · the rule holds and ${giveaway > 0 ? formatINRCompact(giveaway) : "nothing"} stays with the property`
        : `${row.guestName} · decided in ${formatDuration(row.elapsedSec)}`,
    );

    setSelectedId(row.id);
  }

  function onAssign(row: ExceptionRow, member: TeamMember) {
    commit(
      row,
      {
        status: "assigned",
        assigneeId: member.id,
        assigneeName: member.name,
        assigneeInitials: member.avatarInitials,
        assigneeRole: member.role,
      },
      `${row.reference} is with ${member.name}`,
      row.assigneeName ? `Was with ${row.assigneeName}` : "It was sitting unassigned",
    );
  }

  /**
   * Take a session decision back without losing the rest of the session.
   *
   * Assignment and anything typed into the thread survive, because they were
   * not part of the decision and a person undoing a hasty approval did not
   * mean to undo the note explaining why it was hasty.
   */
  function onReopen(row: ExceptionRow) {
    setPatches((current) => {
      const existing = current[row.id];
      if (!existing) return current;

      const kept: ExceptionPatch = {
        assigneeId: existing.assigneeId,
        assigneeName: existing.assigneeName,
        assigneeInitials: existing.assigneeInitials,
        assigneeRole: existing.assigneeRole,
        addedComments: existing.addedComments,
        status: row.assigneeId ? "assigned" : "open",
      };

      return { ...current, [row.id]: kept };
    });

    toast(`${row.reference} is back in the queue`, {
      description: "The decision was dropped. Nothing about it was kept.",
    });
  }

  function onComment(row: ExceptionRow, body: string) {
    const comment: ExceptionCommentRow = {
      id: `cmt_local_${row.id}_${row.comments.length + 1}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorInitials: currentUser.avatarInitials,
      authorRole: currentUser.role,
      body,
      createdAt: DEMO_NOW.toISOString(),
    };

    // Comments accumulate rather than replace, which the generic commit path
    // cannot do: a shallow merge would drop every earlier note on the second.
    setPatches((current) => ({
      ...current,
      [row.id]: {
        ...current[row.id],
        addedComments: [...(current[row.id]?.addedComments ?? []), comment],
      },
    }));
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Exceptions"
        description="The decisions automation deliberately refused to make. Everything the rules could settle has already been settled elsewhere."
        actions={<QueueSummary summary={summary} />}
      >
        <ExceptionToolbar
          state={filters}
          counts={counts}
          onChange={(next) => setFilters((current) => ({ ...current, ...next }))}
          shown={visible.length}
          total={patched.length}
        />
      </PageHeader>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 px-4 py-3 lg:grid-cols-[21rem_minmax(0,1fr)] lg:gap-4 sm:px-6">
        <div className="scrollbar-slim min-h-0 lg:overflow-y-auto">
          {visible.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              size="sm"
              title="Nothing in this view"
              description="Either the filters are narrower than the queue, or there is genuinely nothing here waiting on a person."
            />
          ) : (
            <ul className="flex flex-col gap-1">
              {visible.map((row) => (
                <ExceptionQueueItem
                  key={row.id}
                  row={row}
                  selected={selected?.id === row.id}
                  onSelect={setSelectedId}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="min-h-0">
          {selected ? (
            <ExceptionDecision
              key={selected.id}
              row={selected}
              team={team}
              currentUser={currentUser}
              onDecide={onDecide}
              onAssign={onAssign}
              onComment={onComment}
              onReopen={reopenable ? onReopen : undefined}
            />
          ) : (
            <div className="grid h-full place-items-center rounded-[var(--radius-surface)] bg-surface shadow-[var(--shadow-raised)]">
              <EmptyState
                icon={ShieldCheck}
                title="Nothing is waiting on you"
                description="When the automation refuses a discount, a refund or a policy override, it lands here with the guest and the money already attached."
              />
            </div>
          )}
        </div>
      </div>

      <p className="shrink-0 border-t border-hairline px-4 py-1.5 text-micro text-text-muted sm:px-6">
        Approve, modify and reject are held for this session only, and nothing here notifies the
        guest. Time to decision is measured from the moment the exception was raised.
      </p>
    </div>
  );
}

/**
 * Four figures in the header, not a row of KPI cards.
 *
 * The queue is short by design. Giving six items a dashboard would say the
 * opposite of what this screen is for, which is that the pile a human has to
 * touch should stay small enough to read in one go.
 */
function QueueSummary({ summary }: { summary: ReturnType<typeof summariseQueue> }) {
  const cells = [
    {
      label: "Waiting",
      value: String(summary.open),
      hint: summary.critical > 0 ? `${summary.critical} critical` : "None critical",
      tone: summary.critical > 0 ? ("critical" as const) : undefined,
    },
    {
      label: "At stake",
      value: summary.moneyAtStake > 0 ? formatINRCompact(summary.moneyAtStake) : "Nil",
      hint: "If all approved",
    },
    {
      label: "Longest wait",
      value: summary.longestWaitSec > 0 ? formatDuration(summary.longestWaitSec) : "None",
      hint: "Oldest undecided",
      tone: summary.longestWaitSec > 4 * 3600 ? ("critical" as const) : undefined,
    },
    {
      label: "Typical decision",
      value: summary.medianDecisionSec > 0 ? formatDuration(summary.medianDecisionSec) : "No history",
      hint: `${summary.decidedToday} decided today`,
    },
  ];

  return (
    <div className="flex items-start gap-5">
      {cells.map((cell) => (
        <div key={cell.label}>
          <p className="text-micro font-medium uppercase tracking-[0.08em] text-text-muted">
            {cell.label}
          </p>
          <p
            data-numeric
            className={cn(
              "mt-0.5 text-card font-semibold leading-none tracking-[-0.01em]",
              cell.tone === "critical" ? "text-critical-700" : "text-text-primary",
            )}
          >
            {cell.value}
          </p>
          <p className="mt-1 text-micro text-text-muted">{cell.hint}</p>
        </div>
      ))}
    </div>
  );
}
