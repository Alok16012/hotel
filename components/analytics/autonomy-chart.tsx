import { UserRoundCog } from "lucide-react";
import type { AutonomyTrend } from "@/lib/analytics";
import { formatDayMonth, formatPct } from "@/lib/format";

/**
 * The share of the desk's work that finished without a person (§21, §42).
 *
 * This is the product's central claim, so the panel carries the denominator
 * next to the line and lists what the humans were actually pulled in for
 * today. A rate on its own is a boast; a rate with the exceptions named under
 * it is a work list.
 *
 * The axis runs from 40 to 100 rather than 0 to 100. A figure that has never
 * been below half spends most of a full axis as empty space, and the movement
 * that matters, five or six points over a month, becomes invisible. The floor
 * is labelled, so the scale is stated rather than hidden.
 */
const FLOOR = 0.4;

export function AutonomyChart({ autonomy }: { autonomy: AutonomyTrend }) {
  const points = autonomy.points;
  const step = 100 / Math.max(points.length - 1, 1);

  const coords = points.map((point, i) => {
    const x = i * step;
    const y = 100 - ((point.rate - FLOOR) / (1 - FLOOR)) * 100;
    return [x, Math.max(0, Math.min(100, y))] as const;
  });

  const line = coords.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const [lastX, lastY] = coords[coords.length - 1];

  return (
    <div className="px-4 py-3">
      <div className="flex gap-3">
        <div className="flex w-9 shrink-0 flex-col justify-between py-px text-right">
          {[1, 0.8, 0.6, 0.4].map((mark) => (
            <span key={mark} data-numeric className="text-micro leading-none text-text-muted">
              {formatPct(mark, 0)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-28">
            {[0, 33.33, 66.67, 100].map((top) => (
              <div
                key={top}
                aria-hidden="true"
                className="absolute inset-x-0 border-t border-hairline"
                style={{ top: `${top}%` }}
              />
            ))}

            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full text-intel-600"
              role="img"
              aria-label={`Automation handled ${formatPct(
                points[0].rate,
                0,
              )} of desk actions on ${formatDayMonth(points[0].date)}, and ${formatPct(
                autonomy.current,
                0,
              )} today.`}
            >
              <polygon
                points={`0,100 ${line} 100,100`}
                fill="currentColor"
                fillOpacity={0.1}
              />
              <polyline
                points={line}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={lastX}
                cy={lastY}
                r={2.5}
                fill="currentColor"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>

          <div className="mt-1.5 flex justify-between text-micro text-text-muted">
            <span>{formatDayMonth(points[0].date)}</span>
            <span>Today</span>
          </div>
        </div>
      </div>

      <div className="mt-3 border-t border-hairline pt-3">
        <p className="flex items-center gap-1.5 text-meta font-medium text-text-primary">
          <UserRoundCog className="size-3.5 text-intel-600" aria-hidden="true" />
          {autonomy.humanTouchedToday} of {autonomy.deskActionsToday} actions today needed a person
        </p>

        <ul className="mt-1.5 flex flex-col gap-1">
          {autonomy.humanReasons.map((reason) => (
            <li key={reason.summary} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-meta text-text-secondary">{reason.summary}</span>
              <span data-numeric className="shrink-0 text-meta text-text-muted">
                {reason.count}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-2 text-micro text-text-muted">
          Messages guests sent in are not counted. An enquiry arriving is a stimulus, not work the
          desk performed.
        </p>
      </div>
    </div>
  );
}
