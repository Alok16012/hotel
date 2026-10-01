"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Ban, Wrench } from "lucide-react";
import { Panel } from "@/components/common/panel";
import { formatDayMonth, formatINR, formatWeekday } from "@/lib/format";
import type { InventoryMatrix as Matrix } from "@/lib/availability";
import { cn } from "@/lib/utils";
import type { InventoryCell, ISODate } from "@/types";
import { PRESSURE_CELL, PRESSURE_LABEL, pressureOf } from "./model";

/**
 * Room type by date, fourteen nights out (§18).
 *
 * The number in the cell is what is left to sell, because that is the only
 * figure anyone reads a grid like this to find. Everything that produced it
 * lives one click away rather than crammed into a 44px square: a desk agent on
 * the phone needs "six Deluxe" in under a second, and the reservations manager
 * planning the week needs the breakdown. Trying to serve both in the cell
 * serves neither.
 *
 * Colour carries pressure, never the count on its own, and every cell also
 * states its pressure in words in the popover. Colour alone is not a state.
 */
export function InventoryMatrixPanel({
  matrix,
  today,
  onBlock,
}: {
  matrix: Matrix;
  today: ISODate;
  /** Opens the block form pre-filled with the cell the operator was looking at. */
  onBlock: (roomTypeId: string, date: ISODate) => void;
}) {
  return (
    <Panel
      title="Inventory"
      description="Rooms left to sell by category. Holds release themselves, blocks do not."
      aside={<Legend />}
      bodyClassName="overflow-x-auto scrollbar-slim"
    >
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-hairline bg-surface-sunken/60">
            <th
              scope="col"
              className={cn(
                "sticky left-0 z-[1] bg-surface-sunken/95 px-4 py-1.5 text-left",
                "text-micro font-semibold uppercase tracking-[0.08em] text-text-muted",
              )}
            >
              Category
            </th>
            {matrix.dates.map((date) => (
              <th key={date} scope="col" className="px-1 py-1.5 text-center">
                <span
                  className={cn(
                    "block text-micro font-semibold uppercase tracking-[0.06em]",
                    date === today ? "text-brand-700" : "text-text-muted",
                  )}
                >
                  {formatWeekday(date).slice(0, 3)}
                </span>
                <span
                  data-numeric
                  className={cn(
                    "block text-meta",
                    date === today ? "font-semibold text-brand-700" : "text-text-secondary",
                  )}
                >
                  {formatDayMonth(date)}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-hairline">
          {matrix.rows.map((row) => (
            <tr key={row.roomType.id}>
              <th
                scope="row"
                className="sticky left-0 z-[1] bg-surface px-4 py-2 text-left align-middle"
              >
                <span className="block whitespace-nowrap text-body font-medium text-text-primary">
                  {row.roomType.name}
                </span>
                <span data-numeric className="block text-meta text-text-muted">
                  {row.roomType.inventory} rooms
                </span>
              </th>

              {row.cells.map((cell) => (
                <td key={cell.date} className="p-0.5 align-middle">
                  <CellButton
                    cell={cell}
                    roomTypeName={row.roomType.name}
                    isToday={cell.date === today}
                    onBlock={() => onBlock(cell.roomTypeId, cell.date)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr className="border-t border-hairline-strong bg-surface-sunken/60">
            <th
              scope="row"
              className="sticky left-0 z-[1] bg-surface-sunken/95 px-4 py-2 text-left"
            >
              <span className="block whitespace-nowrap text-body font-medium text-text-primary">
                House
              </span>
              <span className="block text-meta text-text-muted">Occupancy</span>
            </th>
            {matrix.columns.map((column) => {
              const pressure = pressureOf(column.occupancy);
              return (
                <td key={column.date} className="px-1 py-2 text-center">
                  <span
                    data-numeric
                    className={cn(
                      "block text-body font-semibold",
                      pressure === "full" || pressure === "tight"
                        ? "text-caution-700"
                        : "text-text-primary",
                    )}
                  >
                    {Math.round(column.occupancy * 100)}%
                  </span>
                  <span data-numeric className="block text-micro text-text-muted">
                    {column.available} free
                  </span>
                </td>
              );
            })}
          </tr>
        </tfoot>
      </table>
    </Panel>
  );
}

function CellButton({
  cell,
  roomTypeName,
  isToday,
  onBlock,
}: {
  cell: InventoryCell;
  roomTypeName: string;
  isToday: boolean;
  onBlock: () => void;
}) {
  const sellable = cell.total - cell.maintenance - cell.blocked;
  const pressure = pressureOf(sellable > 0 ? (cell.sold + cell.held) / sellable : 1);

  return (
    <Popover.Root>
      <Popover.Trigger
        className={cn(
          "relative flex h-11 w-full min-w-11 flex-col items-center justify-center rounded-[var(--radius-sm)]",
          "border border-transparent transition-[transform,border-color,box-shadow]",
          "duration-[130ms] ease-[var(--ease-out-quint)]",
          "hover:border-hairline-strong hover:shadow-[var(--shadow-raised)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
          "active:scale-[0.97] data-[state=open]:border-brand-500",
          PRESSURE_CELL[pressure],
          isToday && "ring-1 ring-inset ring-brand-300",
        )}
      >
        <span data-numeric className="text-body font-semibold leading-none">
          {cell.available}
        </span>
        <span data-numeric className="mt-0.5 text-micro leading-none opacity-70">
          {formatINR(cell.rate)}
        </span>
        {cell.blocked > 0 ? (
          <Ban
            className="absolute right-0.5 top-0.5 size-2.5 text-critical-600"
            aria-label={`${cell.blocked} blocked`}
          />
        ) : null}
        {cell.maintenance > 0 ? (
          <Wrench
            className="absolute left-0.5 top-0.5 size-2.5 text-text-muted"
            aria-label={`${cell.maintenance} out of service`}
          />
        ) : null}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            "anim-pop z-[var(--z-dropdown)] w-60 rounded-[var(--radius-card)] p-3",
            "material-float shadow-[var(--shadow-float)]",
          )}
        >
          <p className="text-card font-semibold text-text-primary">
            {roomTypeName}
            <span className="ml-1.5 font-normal text-text-muted">
              {formatWeekday(cell.date).slice(0, 3)} {formatDayMonth(cell.date)}
            </span>
          </p>
          <p className="mt-0.5 text-meta text-text-muted">
            {PRESSURE_LABEL[pressure]} · {formatINR(cell.rate)} per night
          </p>

          <dl className="mt-2.5 space-y-1 border-t border-hairline pt-2.5">
            <Line label="Sold" value={cell.sold} />
            <Line label="Held for enquiries" value={cell.held} />
            <Line label="Blocked" value={cell.blocked} />
            <Line label="Out of service" value={cell.maintenance} />
            <Line label="Available" value={cell.available} strong />
          </dl>

          {/* Closing on the way out matters: the dialog this opens is portalled
              above the popover, so a popover left mounted would sit beside it. */}
          <Popover.Close asChild>
            <button
              type="button"
              onClick={onBlock}
              disabled={cell.available === 0}
              className={cn(
                "mt-2.5 w-full rounded-[var(--radius-control)] border border-hairline-strong",
                "bg-surface px-2 py-1.5 text-meta font-medium text-text-secondary",
                "transition-colors duration-[130ms] ease-[var(--ease-out-quint)]",
                "hover:border-ink-400 hover:text-text-primary",
                "disabled:cursor-not-allowed disabled:opacity-45",
              )}
            >
              {cell.available === 0 ? "Nothing left to block" : "Block rooms on this date"}
            </button>
          </Popover.Close>
          <Popover.Arrow className="fill-surface" width={10} height={5} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Line({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={cn("text-meta", strong ? "text-text-primary" : "text-text-secondary")}>
        {label}
      </dt>
      <dd
        data-numeric
        className={cn(
          "text-meta tabular-nums",
          strong ? "font-semibold text-text-primary" : "text-text-secondary",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Legend() {
  return (
    <div className="hidden items-center gap-2.5 md:flex">
      {(["open", "filling", "tight", "full"] as const).map((p) => (
        <span key={p} className="flex items-center gap-1 text-micro text-text-muted">
          <span
            className={cn(
              "size-2.5 rounded-[var(--radius-micro)] border border-hairline-strong",
              PRESSURE_CELL[p],
            )}
          />
          {PRESSURE_LABEL[p]}
        </span>
      ))}
    </div>
  );
}
