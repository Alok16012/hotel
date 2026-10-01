"use client";

import * as React from "react";
import { Panel } from "@/components/common/panel";
import { formatDayMonth, formatINR, formatINRCompact, formatWeekday } from "@/lib/format";
import type { DayColumn } from "@/lib/availability";
import { cn } from "@/lib/utils";
import { PRESSURE_BAR, PRESSURE_LABEL, pressureOf } from "./model";

/** Height of the plotting band, shared by the bars and the rate line. */
const TRACK = 104;

/** The percent-sold row above the band. Fixed so the line can clear it. */
const LABEL_ROW = 16;

/**
 * Fourteen nights, as a shape rather than a table (§18).
 *
 * Bars are occupancy and the line over them is the rate actually achieved,
 * because the question this chart exists to answer is never "how full is the
 * 29th" on its own. It is "the 29th is a quarter sold and still holding a
 * Saturday rate", which needs both quantities in one glance.
 *
 * The line is scaled to its own range rather than to zero. A rate axis that
 * starts at zero would flatten a swing from ₹6,900 to ₹8,400 into a straight
 * line, which is the opposite of what the operator came here to see, so the
 * ends of that range are printed next to it instead of being left implied.
 *
 * Built from divs and one small SVG rather than a chart library: fourteen bars
 * with a known domain do not need a charting runtime, and every bar stays a
 * real button a keyboard can reach.
 */
export function OccupancyForecast({
  columns,
  today,
}: {
  columns: DayColumn[];
  today: string;
}) {
  const [active, setActive] = React.useState<string | null>(null);
  const selected = columns.find((c) => c.date === active) ?? columns[0];

  const roomNights = columns.reduce((sum, c) => sum + c.sold + c.held, 0);
  const capacity = columns.reduce((sum, c) => sum + c.sellable, 0);

  // Nights with nothing sold have no achieved rate, so the line breaks rather
  // than dropping to zero and inventing a collapse that did not happen.
  const priced = columns.map((c, i) => ({ i, adr: c.adr })).filter((p) => p.adr > 0);
  const lo = priced.length ? Math.min(...priced.map((p) => p.adr)) : 0;
  const hi = priced.length ? Math.max(...priced.map((p) => p.adr)) : 0;
  const span = hi - lo || 1;

  const points = priced.map((p) => ({
    x: p.i + 0.5,
    // 12% and 88% keep the line clear of the panel edge at both extremes.
    y: TRACK - (0.12 + ((p.adr - lo) / span) * 0.76) * TRACK,
  }));

  return (
    <Panel
      title="Forecast"
      description={`${Math.round((roomNights / capacity) * 100)}% of the next fortnight is committed. Pickup fills the far end.`}
      aside={
        <div className="text-right">
          <p data-numeric className="text-card font-semibold text-text-primary">
            {formatINRCompact(columns.reduce((sum, c) => sum + c.revenue, 0))}
          </p>
          <p className="text-micro text-text-muted">On the books</p>
        </div>
      }
    >
      <div className="px-4 pb-3 pt-4">
        <div className="relative">
          <div className="flex items-end gap-1">
            {columns.map((column) => {
              const pressure = pressureOf(column.occupancy);
              const isActive = selected?.date === column.date;
              return (
                <button
                  key={column.date}
                  type="button"
                  onMouseEnter={() => setActive(column.date)}
                  onFocus={() => setActive(column.date)}
                  onClick={() => setActive(column.date)}
                  aria-label={`${formatWeekday(column.date)} ${formatDayMonth(column.date)}: ${Math.round(column.occupancy * 100)} percent sold, ${PRESSURE_LABEL[pressure].toLowerCase()}, average rate ${formatINR(column.adr)}`}
                  className={cn(
                    "group relative flex flex-1 flex-col items-center gap-1 rounded-[var(--radius-sm)] pb-1",
                    "transition-colors duration-[130ms] ease-[var(--ease-out-quint)]",
                    "hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
                    isActive && "bg-surface-sunken",
                  )}
                >
                  <span
                    data-numeric
                    className={cn(
                      "flex w-full items-center justify-center text-micro font-medium leading-none",
                      isActive ? "text-text-primary" : "text-text-muted",
                    )}
                    style={{ height: LABEL_ROW }}
                  >
                    {Math.round(column.occupancy * 100)}
                  </span>

                  <span
                    className="relative flex w-full items-end justify-center"
                    style={{ height: TRACK }}
                  >
                    <span
                      className={cn(
                        "w-full rounded-t-[var(--radius-micro)] transition-[height] duration-[240ms]",
                        "ease-[var(--ease-out-quint)]",
                        PRESSURE_BAR[pressure],
                        isActive && "brightness-95",
                      )}
                      style={{ height: `${Math.max(3, column.occupancy * 100)}%` }}
                    />
                  </span>

                  <span
                    className={cn(
                      "text-micro uppercase tracking-[0.06em]",
                      column.date === today ? "font-semibold text-brand-700" : "text-text-muted",
                    )}
                  >
                    {formatWeekday(column.date).slice(0, 3)}
                  </span>
                  <span data-numeric className="text-micro text-text-muted">
                    {formatDayMonth(column.date).replace(/ \w+$/, "")}
                  </span>
                </button>
              );
            })}
          </div>

          {/* The rate line sits over the bars, not inside them, so a soft night
              carrying a high rate reads as the gap it actually is. */}
          <svg
            className="pointer-events-none absolute left-0 w-full overflow-visible"
            // The band sits below the percent row, which is why that row has a
            // fixed height: the line and the bars must share one origin.
            style={{ top: LABEL_ROW + 4, height: TRACK, width: "100%" }}
            viewBox={`0 0 ${columns.length} ${TRACK}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              points={points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="var(--color-ink-800)"
              strokeWidth={1.5}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      </div>

      {selected ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-hairline bg-surface-sunken/50 px-4 py-2">
          <p className="text-meta font-medium text-text-primary">
            {formatWeekday(selected.date)} {formatDayMonth(selected.date)}
          </p>
          <Stat label="Sold" value={String(selected.sold)} />
          <Stat label="Held" value={String(selected.held)} />
          <Stat label="Free" value={String(selected.available)} />
          <Stat label="Room revenue" value={formatINRCompact(selected.revenue)} />
          <Stat label="Average rate" value={formatINR(selected.adr)} />
          <span className="text-meta text-text-muted">
            The line is the rate achieved each night, between {formatINR(lo)} and {formatINR(hi)}.
          </span>
        </div>
      ) : null}
    </Panel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-meta text-text-muted">
      {label}{" "}
      <span data-numeric className="font-medium text-text-primary">
        {value}
      </span>
    </p>
  );
}
