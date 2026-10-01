import { cn } from "@/lib/utils";

/**
 * Seven days of a single series, drawn small.
 *
 * Deliberately unlabelled and unreadable in absolute terms: its job is shape,
 * not value. The headline above it already carries the number, and the last
 * point of the line is that number, so the two can never disagree.
 *
 * No chart library. Recharts renders on the client, measures the container and
 * reflows, which is a lot of machinery and a layout shift for forty pixels of
 * polyline that never needs a tooltip.
 */
export function Sparkline({
  values,
  tone = "neutral",
  className,
  label,
}: {
  values: number[];
  tone?: "neutral" | "positive" | "caution" | "critical" | "intel";
  className?: string;
  /** Described to assistive technology; the drawing itself is decorative. */
  label?: string;
}) {
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  // A flat series would divide by zero and collapse onto the baseline, so give
  // it a nominal range and let it draw down the middle of the box.
  const range = max - min || 1;
  const step = 100 / (values.length - 1);

  // 2 units of headroom top and bottom keeps the stroke and the end dot inside
  // the box instead of clipping against it.
  const points = values.map((v, i) => {
    const x = i * step;
    const y = 30 - 2 - ((v - min) / range) * 26;
    return [x, y] as const;
  });

  const line = points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `0,30 ${line} 100,30`;
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      className={cn("h-8 w-full", TONE[tone], className)}
      role={label ? "img" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <polygon points={area} fill="currentColor" fillOpacity={0.08} />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        // The viewBox is stretched horizontally to fill the card, which would
        // otherwise squash the stroke into a hairline at one end and a slab at
        // the other.
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r={2.2} fill="currentColor" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const TONE = {
  neutral: "text-ink-400",
  positive: "text-positive-600",
  caution: "text-caution-600",
  critical: "text-critical-600",
  intel: "text-intel-600",
} as const;
