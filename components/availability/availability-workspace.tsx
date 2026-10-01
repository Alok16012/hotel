"use client";

import * as React from "react";
import { CalendarRange, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageBody, PageHeader } from "@/components/common/page-header";
import { DEMO_NOW } from "@/lib/clock";
import { formatDayMonth, formatINR, formatPct } from "@/lib/format";
import type { FloorMap, InventoryMatrix } from "@/lib/availability";
import type { InventoryBlock, ISODate, TeamMember } from "@/types";
import { BlockDialog } from "./block-dialog";
import { BlockList } from "./block-list";
import { FloorMapPanel } from "./floor-map";
import { InventoryMatrixPanel } from "./inventory-matrix";
import {
  buildBlockRows,
  overlayBlocks,
  type BlockForm,
  type BlockRow,
} from "./model";
import { OccupancyForecast } from "./occupancy-forecast";

/**
 * The availability screen (§18).
 *
 * One client component owns the whole surface because blocking four rooms over
 * a weekend moves the matrix, the forecast bars, the house occupancy figure and
 * the block list in the same frame. Split across islands, those four numbers
 * would have four owners and could disagree about the same night.
 *
 * The floor map is the one panel that does not react: it shows tonight's
 * physical rooms, and a block on a future date does not change which room the
 * housekeeper is standing in.
 */
export function AvailabilityWorkspace({
  matrix: base,
  map,
  blocks: seeded,
  team,
  currentUserId,
}: {
  matrix: InventoryMatrix;
  map: FloorMap;
  blocks: InventoryBlock[];
  team: TeamMember[];
  currentUserId: string;
}) {
  const [blocks, setBlocks] = React.useState<InventoryBlock[]>(seeded);
  const [dialog, setDialog] = React.useState<{
    open: boolean;
    initial: { roomTypeId: string; date: ISODate } | null;
  }>({ open: false, initial: null });

  const today = base.dates[0];

  const matrix = React.useMemo(() => overlayBlocks(base, blocks), [base, blocks]);

  const nameOf = React.useCallback(
    (id?: string) => (id ? team.find((m) => m.id === id)?.name : undefined),
    [team],
  );

  const rows = React.useMemo(
    () => buildBlockRows(blocks, matrix, nameOf),
    [blocks, matrix, nameOf],
  );

  const tonight = matrix.columns[0];

  function openBlock(roomTypeId?: string, date?: ISODate) {
    setDialog({
      open: true,
      initial: roomTypeId && date ? { roomTypeId, date } : null,
    });
  }

  function onConfirm(form: BlockForm) {
    const block: InventoryBlock = {
      id: `blk_${Date.now()}`,
      roomTypeId: form.roomTypeId,
      from: form.from,
      to: form.to,
      rooms: form.rooms,
      reason: form.reason,
      createdById: currentUserId,
      createdAt: DEMO_NOW.toISOString(),
    };

    setBlocks((current) => [...current, block]);
    setDialog({ open: false, initial: null });

    const name = matrix.rows.find((r) => r.roomType.id === form.roomTypeId)?.roomType.name ?? "";
    toast.success(`Blocked ${form.rooms} ${name.toLowerCase()}`, {
      description:
        form.from === form.to
          ? `${formatDayMonth(form.from)} only. Off sale until someone releases it.`
          : `${formatDayMonth(form.from)} to ${formatDayMonth(form.to)}. Off sale until someone releases it.`,
      action: {
        label: "Undo",
        onClick: () => setBlocks((current) => current.filter((b) => b.id !== block.id)),
      },
    });
  }

  function onRelease(row: BlockRow) {
    setBlocks((current) => current.filter((b) => b.id !== row.id));
    toast.success(`Released ${row.rooms} ${row.roomTypeName.toLowerCase()}`, {
      description: `${row.roomNights} room nights back on sale, worth ${formatINR(row.valueAtRisk)} at the published rate.`,
      action: {
        label: "Undo",
        onClick: () =>
          setBlocks((current) =>
            current.some((b) => b.id === row.id) ? current : [...current, stripRow(row)],
          ),
      },
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Availability"
        description={`${tonight.sold + tonight.held} of ${tonight.sellable} sellable rooms spoken for tonight, ${formatPct(tonight.occupancy, 0)} occupancy.`}
        actions={
          <Button variant="primary" size="sm" onClick={() => openBlock()}>
            <Plus className="size-4" aria-hidden="true" />
            Block rooms
          </Button>
        }
      />

      <PageBody className="space-y-4">
        <InventoryMatrixPanel matrix={matrix} today={today} onBlock={openBlock} />

        <OccupancyForecast columns={matrix.columns} today={today} />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <FloorMapPanel map={map} />
          <BlockList rows={rows} onRelease={onRelease} onAdd={() => openBlock()} />
        </div>

        <p className="flex items-center gap-1.5 pb-2 text-meta text-text-muted">
          <CalendarRange className="size-3.5" aria-hidden="true" />
          Blocks made here live in this session only. Nothing is written to the property system yet.
        </p>
      </PageBody>

      <BlockDialog
        open={dialog.open}
        matrix={matrix}
        initial={dialog.initial}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        onConfirm={onConfirm}
      />
    </>
  );
}

/** A block row carries derived fields the block itself should not keep. */
function stripRow(row: BlockRow): InventoryBlock {
  return {
    id: row.id,
    roomTypeId: row.roomTypeId,
    from: row.from,
    to: row.to,
    rooms: row.rooms,
    reason: row.reason,
    createdById: row.createdById,
    createdAt: row.createdAt,
  };
}
