"use client";

import { SourceBadge } from "@/components/common/source-badge";
import { ColumnHead } from "@/components/common/panel";
import { Select } from "@/components/ui/select";
import { formatDuration, formatPct } from "@/lib/format";
import { LEAD_SOURCE } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { ResponseTargetRow } from "@/lib/settings";
import { TARGET_CHOICES } from "./model";

/**
 * What the property promises, next to what it does (§21, §37).
 *
 * A target column on its own is a wish. The median beside it is measured from
 * the same enquiries the SLA report reads, so changing the target here moves
 * the line a channel is judged against and the screen shows immediately which
 * side of it the desk is standing on.
 *
 * Unanswered enquiries are counted separately rather than folded into the
 * median. A channel with four enquiries and three still waiting has a median
 * of one reply, and calling that a median without saying so would flatter it.
 */
export function TargetsPanel({
  rows,
  onSetTarget,
}: {
  rows: ResponseTargetRow[];
  onSetTarget: (row: ResponseTargetRow, targetSec: number) => void;
}) {
  return (
    <div className="scrollbar-slim overflow-x-auto px-4 py-3">
      <table className="w-full min-w-[48rem] border-collapse text-body">
        <thead>
          {/* Headings carry the same padding as the cells under them. The
              shared `ColumnHead` pads itself for panels whose rows are inset,
              and these rows are not. */}
          <tr className="border-b border-hairline">
            <ColumnHead className="w-[10rem] px-0 pr-3">Channel</ColumnHead>
            <ColumnHead className="w-[8rem] px-0 pr-3">First reply within</ColumnHead>
            <ColumnHead align="right" className="w-[7.5rem] px-0 pl-3">
              Median so far
            </ColumnHead>
            <ColumnHead align="right" className="w-[5.5rem] px-0 pl-3">
              Inside target
            </ColumnHead>
            <ColumnHead className="w-[9rem] px-0 pl-3 pr-3">Applies</ColumnHead>
            <ColumnHead className="px-0">Outside those hours</ColumnHead>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.target.id} className="border-b border-hairline last:border-0">
              <td className="py-2 pr-3 align-middle">
                <span className="flex items-center gap-2">
                  <SourceBadge source={row.target.source} />
                  <span className="truncate text-body text-text-primary">
                    {LEAD_SOURCE[row.target.source].label}
                  </span>
                </span>
              </td>

              <td className="py-2 pr-3 align-middle">
                <Select
                  aria-label={`${LEAD_SOURCE[row.target.source].label} first reply target`}
                  value={String(row.target.targetSec)}
                  onChange={(event) => onSetTarget(row, Number(event.target.value))}
                >
                  {TARGET_CHOICES.map((choice) => (
                    <option key={choice.value} value={choice.value}>
                      {choice.label}
                    </option>
                  ))}
                </Select>
              </td>

              <td data-numeric className="py-2 pl-3 text-right align-middle">
                {row.medianSec === undefined ? (
                  <span className="text-text-muted">not measured</span>
                ) : (
                  <span
                    className={cn(
                      row.meetingTarget ? "text-text-primary" : "font-medium text-critical-700",
                    )}
                  >
                    {formatDuration(row.medianSec)}
                  </span>
                )}
                <span className="block text-micro font-normal text-text-muted">
                  {row.answered ? `${row.answered} answered` : "nothing answered yet"}
                  {row.waiting ? `, ${row.waiting} waiting` : ""}
                </span>
              </td>

              <td data-numeric className="py-2 pl-3 text-right align-middle">
                {row.compliance === undefined ? (
                  <span className="text-text-muted">&mdash;</span>
                ) : (
                  <span className="text-text-primary">{formatPct(row.compliance, 0)}</span>
                )}
              </td>

              <td className="py-2 pl-3 pr-3 align-middle text-meta text-text-secondary">
                {row.target.appliesDuring}
              </td>
              <td className="py-2 align-middle text-meta text-text-secondary">
                {row.target.afterHours}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 text-micro text-text-muted">
        Medians are taken from the seeded enquiries on each channel and count the first reply a
        person wrote, not the automatic acknowledgement that went before it. Channels with nothing
        answered yet are shown as unmeasured rather than as meeting the target.
      </p>
    </div>
  );
}
