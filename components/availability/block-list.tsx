"use client";

import { Ban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { ColumnHead, Panel } from "@/components/common/panel";
import { formatDayMonth, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BlockRow } from "./model";

/**
 * What the hotel is holding back, and what that costs (§18).
 *
 * Every block is a decision someone made, so every row carries the reason and
 * the name. A block with neither is how a property ends up with four rooms off
 * sale in October that nobody can account for.
 */
export function BlockList({
  rows,
  onRelease,
  onAdd,
}: {
  rows: BlockRow[];
  onRelease: (row: BlockRow) => void;
  onAdd: () => void;
}) {
  const roomNights = rows.reduce((sum, r) => sum + r.roomNights, 0);

  return (
    <Panel
      title="Blocked inventory"
      description={
        rows.length === 0
          ? "Nothing withheld in the next fortnight."
          : `${roomNights} room nights off sale in the next fortnight.`
      }
      aside={
        <Button variant="secondary" size="xs" onClick={onAdd}>
          <Plus className="size-3.5" aria-hidden="true" />
          Block rooms
        </Button>
      }
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={Ban}
          size="sm"
          title="No blocks"
          description="Rooms held for an audit, an owner stay or a group deciding numbers will appear here."
        />
      ) : (
        <table className="w-full border-collapse">
          <thead className="border-b border-hairline bg-surface-sunken/60">
            <tr>
              <ColumnHead className="w-full max-w-0">Reason</ColumnHead>
              <ColumnHead>Nights</ColumnHead>
              <ColumnHead align="right">Rooms</ColumnHead>
              <ColumnHead align="right" className="hidden sm:table-cell">
                Held back
              </ColumnHead>
              <ColumnHead align="right">
                <span className="sr-only">Release</span>
              </ColumnHead>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {rows.map((row) => (
              <tr key={row.id} className="group">
                <td className="w-full max-w-0 px-4 py-2 align-top">
                  <p className="text-body leading-tight text-text-primary">{row.reason}</p>
                  <p className="mt-0.5 text-meta text-text-muted">
                    {row.roomTypeName}
                    {row.createdByName ? ` · ${row.createdByName}` : null}
                  </p>
                </td>

                <td className="whitespace-nowrap px-4 py-2 align-top">
                  <p data-numeric className="text-body text-text-primary">
                    {formatDayMonth(row.from)}
                    {row.from === row.to ? null : ` to ${formatDayMonth(row.to)}`}
                  </p>
                  <p data-numeric className="text-meta text-text-muted">
                    {row.nights} night{row.nights === 1 ? "" : "s"}
                  </p>
                </td>

                <td
                  data-numeric
                  className="whitespace-nowrap px-4 py-2 text-right align-top text-body font-medium text-text-primary"
                >
                  {row.rooms}
                </td>

                <td className="hidden whitespace-nowrap px-4 py-2 text-right align-top sm:table-cell">
                  <p data-numeric className="text-body text-text-primary">
                    {formatINR(row.valueAtRisk)}
                  </p>
                  <p data-numeric className="text-meta text-text-muted">
                    {row.roomNights} room nights
                  </p>
                </td>

                <td className="whitespace-nowrap px-4 py-2 text-right align-top">
                  <button
                    type="button"
                    onClick={() => onRelease(row)}
                    className={cn(
                      "rounded-[var(--radius-control)] border border-hairline-strong bg-surface",
                      "px-2 py-1 text-meta font-medium text-text-secondary",
                      "transition-colors duration-[130ms] ease-[var(--ease-out-quint)]",
                      "hover:border-ink-400 hover:text-text-primary active:scale-[0.97]",
                    )}
                  >
                    Release
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
