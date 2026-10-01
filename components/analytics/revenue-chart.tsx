import { formatDayMonth, formatFullDate, formatINR, formatINRCompact } from "@/lib/format";
import type { RevenuePoint, RevenueTrend } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * Daily confirmed revenue, drawn as bars rather than a line.
 *
 * Bookings are discrete events, not a continuous quantity: a line between
 * Tuesday and Thursday implies a value on Wednesday that nobody measured. Bars
 * say what actually happened, and an empty Wednesday reads as the zero it is.
 *
 * No chart library and no client component. Every bar is a div with a
 * percentage height, and the read-out on hover is a CSS-positioned panel, so
 * the whole thing renders on the server with no measure-and-reflow pass.
 */
export function RevenueChart({ trend }: { trend: RevenueTrend }) {
  const max = Math.max(...trend.points.map((p) => p.value), 1);

  // Round the top of the scale up so the gridline labels are readable figures
  // rather than the exact height of the tallest bar.
  const ceiling = niceCeiling(max);
  const lines = [1, 0.75, 0.5, 0.25, 0];

  const dense = trend.points.length > 14;

  return (
    <div className="px-4 pb-3 pt-4">
      <div className="flex gap-3">
        <div className="flex w-14 shrink-0 flex-col justify-between py-px text-right">
          {lines.map((fraction) => (
            <span key={fraction} data-numeric className="text-micro leading-none text-text-muted">
              {fraction === 0 ? "0" : formatINRCompact(ceiling * fraction)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-40">
            {lines.map((fraction) => (
              <div
                key={fraction}
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-0 border-t",
                  fraction === 0 ? "border-hairline-strong" : "border-hairline",
                )}
                style={{ top: `${(1 - fraction) * 100}%` }}
              />
            ))}

            <ol className="absolute inset-0 flex items-end gap-px">
              {trend.points.map((point) => (
                <Bar
                  key={point.date}
                  point={point}
                  ceiling={ceiling}
                  best={point.date === trend.best?.date && point.value > 0}
                />
              ))}
            </ol>
          </div>

          <div className="mt-1.5 flex justify-between text-micro text-text-muted">
            <span>{formatDayMonth(trend.points[0].date)}</span>
            {dense ? <span>{formatDayMonth(trend.points[Math.floor(trend.points.length / 2)].date)}</span> : null}
            <span>{formatDayMonth(trend.points[trend.points.length - 1].date)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bar({
  point,
  ceiling,
  best,
}: {
  point: RevenuePoint;
  ceiling: number;
  best: boolean;
}) {
  const height = (point.value / ceiling) * 100;
  const label =
    point.bookings === 0
      ? `${formatFullDate(point.date)}: nothing confirmed`
      : `${formatFullDate(point.date)}: ${formatINR(point.value)} across ${point.bookings} ${
          point.bookings === 1 ? "reservation" : "reservations"
        }`;

  return (
    <li className="group relative flex h-full min-w-0 flex-1 items-end">
      {/* A zero day still gets a hairline so the axis reads as a day that
          happened and earned nothing, not a day missing from the data. */}
      <div
        tabIndex={0}
        role="img"
        aria-label={label}
        className={cn(
          "w-full rounded-t-[var(--radius-micro)] outline-none",
          "transition-colors duration-[130ms] ease-[var(--ease-out-quint)]",
          point.value === 0
            ? "h-px bg-hairline-strong"
            : best
              ? "bg-brand-600 group-hover:bg-brand-700 group-focus-within:bg-brand-700"
              : "bg-brand-500/45 group-hover:bg-brand-600 group-focus-within:bg-brand-600",
        )}
        style={point.value === 0 ? undefined : { height: `${Math.max(height, 1.5)}%` }}
      />

      <div
        role="presentation"
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 z-[var(--z-tooltip)] mb-1.5 w-40 -translate-x-1/2",
          "rounded-[var(--radius-card)] bg-surface-inverse px-2.5 py-1.5 shadow-[var(--shadow-overlay)]",
          "opacity-0 transition-opacity duration-[130ms] ease-[var(--ease-out-quint)]",
          "group-hover:opacity-100 group-focus-within:opacity-100",
        )}
      >
        <p className="text-micro text-text-onDark-muted">{formatFullDate(point.date)}</p>
        <p data-numeric className="text-meta font-semibold text-text-onDark">
          {point.value === 0 ? "Nothing confirmed" : formatINR(point.value)}
        </p>
        {point.bookings > 0 ? (
          <p className="text-micro text-text-onDark-muted">
            {point.bookings} {point.bookings === 1 ? "reservation" : "reservations"}
          </p>
        ) : null}
      </div>
    </li>
  );
}

/** 1, 2 or 5 times a power of ten, so gridlines land on figures people read. */
function niceCeiling(max: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (max <= magnitude * step) return magnitude * step;
  }
  return magnitude * 10;
}
