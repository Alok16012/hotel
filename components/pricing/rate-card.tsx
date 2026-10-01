"use client";

import * as React from "react";
import { Panel } from "@/components/common/panel";
import { formatDayMonth, formatDeltaPct, formatINR, formatWeekday } from "@/lib/format";
import type { RateCardRow } from "@/lib/availability";
import { cn } from "@/lib/utils";
import type { ISODate } from "@/types";

/**
 * What every category costs on every night of the fortnight (§19).
 *
 * The rate is derived from occupancy rather than stored, which is why the
 * occupancy figure sits in the column head: a Premium at ₹9,200 on the 26th is
 * not a number somebody typed, it is what a night that is 82 percent sold is
 * worth. Showing the cause beside the effect is what stops the desk from
 * reading a high rate as a mistake.
 *
 * Rack and floor stay pinned to the left of every row because the effective
 * rate means nothing on its own. ₹6,100 is aggressive against a ₹6,500 rack and
 * impossible against a ₹8,050 floor, and the operator should never have to
 * remember which.
 */
export function RateCard({
  dates,
  rows,
  occupancy,
  today,
}: {
  dates: ISODate[];
  rows: RateCardRow[];
  /** House occupancy per date, as a fraction. */
  occupancy: number[];
  today: ISODate;
}) {
  const all = rows.flatMap((row) => row.rates.map((r) => r.currentRate));
  const atFloor = rows.reduce(
    (count, row) => count + row.rates.filter((r) => r.currentRate <= r.floorRate).length,
    0,
  );
  const aboveRack = rows.reduce(
    (count, row) => count + row.rates.filter((r) => r.currentRate > r.rackRate).length,
    0,
  );

  return (
    <Panel
      title="Rate card"
      description={`${aboveRack} of ${all.length} rates are priced above rack, ${all.length - aboveRack} at or below.`}
      aside={<Legend atFloor={atFloor} />}
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
            {dates.map((date, i) => (
              <th key={date} scope="col" className="px-1 py-1.5 text-center">
                <span
                  className={cn(
                    "block text-micro font-semibold uppercase tracking-[0.06em]",
                    date === today ? "text-brand-700" : "text-text-muted",
                  )}
                >
                  {formatWeekday(date).slice(0, 3)} {formatDayMonth(date).replace(/ \w+$/, "")}
                </span>
                <span data-numeric className="block text-micro text-text-muted">
                  {Math.round(occupancy[i] * 100)}% sold
                </span>
              </th>
            ))}
            <th
              scope="col"
              className="px-3 py-1.5 text-right text-micro font-semibold uppercase tracking-[0.08em] text-text-muted"
            >
              Fortnight
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-hairline">
          {rows.map((row) => {
            const average = Math.round(
              row.rates.reduce((sum, r) => sum + r.currentRate, 0) / row.rates.length,
            );
            return (
              <tr key={row.roomType.id}>
                <th
                  scope="row"
                  className="sticky left-0 z-[1] bg-surface px-4 py-2 text-left align-middle"
                >
                  <span className="block whitespace-nowrap text-body font-medium text-text-primary">
                    {row.roomType.name}
                  </span>
                  <span data-numeric className="block whitespace-nowrap text-micro text-text-muted">
                    Rack {formatINR(row.roomType.rackRate)} · Floor{" "}
                    {formatINR(row.roomType.floorRate)}
                  </span>
                </th>

                {row.rates.map((rate) => (
                  <td key={rate.date} className="px-1 py-1.5 text-center">
                    <RateCell
                      current={rate.currentRate}
                      rack={rate.rackRate}
                      floor={rate.floorRate}
                      isToday={rate.date === today}
                    />
                  </td>
                ))}

                <td className="px-3 py-2 text-right">
                  <span data-numeric className="block text-body font-semibold text-text-primary">
                    {formatINR(average)}
                  </span>
                  <span data-numeric className="block whitespace-nowrap text-micro text-text-muted">
                    average, {formatDeltaPct(
                      ((average - row.roomType.floorRate) / row.roomType.floorRate) * 100,
                      0,
                    )}{" "}
                    over floor
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}

function RateCell({
  current,
  rack,
  floor,
  isToday,
}: {
  current: number;
  rack: number;
  floor: number;
  isToday: boolean;
}) {
  const delta = rack > 0 ? ((current - rack) / rack) * 100 : 0;
  const onFloor = current <= floor;

  return (
    <span
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--radius-sm)] px-1 py-1",
        onFloor && "bg-critical-100",
        isToday && "ring-1 ring-inset ring-brand-300",
      )}
    >
      <span
        data-numeric
        className={cn(
          "text-meta font-semibold leading-none",
          onFloor ? "text-critical-700" : "text-text-primary",
        )}
      >
        {formatINR(current)}
      </span>
      <span
        data-numeric
        className={cn(
          "mt-0.5 text-micro leading-none",
          onFloor
            ? "text-critical-700"
            : delta > 0
              ? "text-positive-700"
              : delta < 0
                ? "text-text-muted"
                : "text-text-muted",
        )}
      >
        {onFloor ? "at floor" : Math.round(delta) === 0 ? "rack" : formatDeltaPct(delta, 0)}
      </span>
    </span>
  );
}

/**
 * The floor swatch only appears when something has actually reached the floor.
 * A legend entry for a state that never occurs teaches the eye to ignore the
 * legend, which is exactly when the state finally occurs.
 */
function Legend({ atFloor }: { atFloor: number }) {
  return (
    <div className="hidden items-center gap-3 text-micro text-text-muted md:flex">
      <span className="flex items-center gap-1">
        <span className="text-positive-700">+%</span> above rack
      </span>
      {atFloor > 0 ? (
        <span className="flex items-center gap-1">
          <span
            className="size-2.5 rounded-[var(--radius-micro)] border border-hairline-strong bg-critical-100"
            aria-hidden="true"
          />
          {atFloor} at floor
        </span>
      ) : null}
    </div>
  );
}
