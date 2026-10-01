"use client";

import * as React from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { LEAD_STAGE, LOST_REASON } from "@/lib/labels";
import type { LeadRow } from "@/lib/leads";
import { cn } from "@/lib/utils";
import type { LeadStage, LostReason, TeamMember } from "@/types";
import { ConversionStrip } from "./conversion-strip";
import { LostReasonDialog } from "./lost-reason-dialog";
import {
  EMPTY_BOARD_FILTERS,
  applyPatches,
  buildColumns,
  buildLostSummary,
  buildStageReach,
  filterBoard,
  type BoardFilterState,
  type BoardPatch,
} from "./model";
import { PipelineColumn } from "./pipeline-column";
import { PipelineToolbar } from "./pipeline-toolbar";

/**
 * The deal board (§15).
 *
 * One client component owns the whole screen because every part of it moves
 * together: dragging a card changes a column total, the stage reach strip and
 * the lost figure in the same frame. Splitting that across islands would mean
 * three sources of truth for one number.
 *
 * Stage changes live in session state and are announced with an undo, matching
 * the lead workspace. Nothing is written anywhere, and the page says as much
 * rather than implying a saved board.
 */
export function PipelineBoard({
  rows,
  team,
}: {
  rows: LeadRow[];
  team: TeamMember[];
}) {
  const [patches, setPatches] = React.useState<Record<string, BoardPatch>>({});
  const [filters, setFilters] = React.useState<BoardFilterState>(EMPTY_BOARD_FILTERS);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dropTarget, setDropTarget] = React.useState<LeadStage | null>(null);
  /** The lead waiting on a reason before it is allowed into Lost. */
  const [pendingLoss, setPendingLoss] = React.useState<LeadRow | null>(null);

  const patched = React.useMemo(() => applyPatches(rows, patches), [rows, patches]);
  const visible = React.useMemo(() => filterBoard(patched, filters), [patched, filters]);
  const columns = React.useMemo(() => buildColumns(visible), [visible]);
  const steps = React.useMemo(() => buildStageReach(visible), [visible]);
  const lost = React.useMemo(() => buildLostSummary(visible), [visible]);

  function restore(leadId: string, snapshot: BoardPatch | undefined) {
    setPatches((current) => {
      const next = { ...current };
      if (snapshot) next[leadId] = snapshot;
      else delete next[leadId];
      return next;
    });
  }

  /** Applies the move and raises the undoable confirmation. */
  function commit(row: LeadRow, stage: LeadStage, reason?: LostReason) {
    const snapshot = patches[row.id];
    setPatches((current) => ({ ...current, [row.id]: { stage, lostReason: reason } }));

    const trail =
      stage === "lost" && reason
        ? `${row.guestName} · ${LOST_REASON[reason].toLowerCase()}`
        : `${row.guestName} · ${LEAD_STAGE[row.stage].label} before this`;

    toast.success(`${row.reference} moved to ${LEAD_STAGE[stage].label.toLowerCase()}`, {
      description: trail,
      action: { label: "Undo", onClick: () => restore(row.id, snapshot) },
    });
  }

  /**
   * The single entry point for every stage change, from a drop or from a card
   * menu. Lost is the one destination that stops here and asks a question.
   */
  function move(row: LeadRow, stage: LeadStage) {
    if (stage === row.stage) return;
    if (stage === "lost") {
      setPendingLoss(row);
      return;
    }
    commit(row, stage);
  }

  function onDrop(stage: LeadStage, leadId: string) {
    setDraggingId(null);
    setDropTarget(null);
    const row = visible.find((r) => r.id === leadId);
    if (row) move(row, stage);
  }

  const filtered = visible.length !== patched.length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Pipeline"
        description="Every open enquiry by stage, with what each column is worth and how long it has been sitting there."
      >
        <PipelineToolbar
          team={team}
          state={filters}
          onChange={(next) => setFilters((current) => ({ ...current, ...next }))}
          shown={visible.length}
          total={patched.length}
        />
      </PageHeader>

      <div className="shrink-0 px-4 pt-3 sm:px-6">
        <ConversionStrip steps={steps} lost={lost} />
      </div>

      <div
        className="scrollbar-slim min-h-0 flex-1 overflow-x-auto px-4 py-3 sm:px-6"
        onDragEnd={() => {
          setDraggingId(null);
          setDropTarget(null);
        }}
      >
        <div className="flex h-full min-h-[22rem] gap-2">
          {columns.map((column) => (
            <PipelineColumn
              key={column.stage}
              column={column}
              draggingId={draggingId}
              isDropTarget={dropTarget === column.stage && draggingId !== null}
              onDragStart={setDraggingId}
              onDragEnd={() => {
                setDraggingId(null);
                setDropTarget(null);
              }}
              onDragOverColumn={(stage) =>
                setDropTarget((current) => (current === stage ? current : stage))
              }
              onDrop={onDrop}
              onMove={move}
            />
          ))}
        </div>
      </div>

      <p
        className={cn(
          "shrink-0 border-t border-hairline px-4 py-1.5 text-micro text-text-muted sm:px-6",
          filtered && "text-text-secondary",
        )}
      >
        {filtered ? (
          "Stage reach and column totals follow the filters above, so they describe the board you are looking at rather than the whole book."
        ) : (
          <>
            {/* Dragging is a pointer affordance. On touch the move control on
                each card is the only way through, so the hint says that
                instead of asking for a gesture the browser will not deliver. */}
            <span className="hidden sm:inline">
              Drag a card between columns, or use the move control on a card to do the same from
              the keyboard.{" "}
            </span>
            <span className="sm:hidden">
              Use the move control on a card to change its stage.{" "}
            </span>
            Stage changes are held for this session only.
          </>
        )}
      </p>

      <LostReasonDialog
        row={pendingLoss}
        onCancel={() => setPendingLoss(null)}
        onConfirm={(reason) => {
          if (pendingLoss) commit(pendingLoss, "lost", reason);
          setPendingLoss(null);
        }}
      />
    </div>
  );
}
