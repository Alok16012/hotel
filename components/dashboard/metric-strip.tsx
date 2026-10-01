import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Sparkline } from "@/components/dashboard/sparkline";
import { formatDeltaPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardMetric } from "@/types";

/**
 * The six numbers that decide whether anyone needs to change what they are
 * doing today (§9).
 *
 * Laid out as cells in one tray rather than six floating cards. A dashboard
 * that opens with six separate shadowed rectangles reads as a widget gallery;
 * a single ruled instrument panel reads as one instrument, which is what a
 * shift handover actually wants.
 */
export function MetricStrip({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    // The hairline background shows through the 1px grid gaps, which is how the
    // rules between cells survive the columns rewrapping at every breakpoint.
    <div className="overflow-hidden rounded-[var(--radius-surface)] bg-hairline shadow-[var(--shadow-raised)]">
      <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {metrics.map((metric) => (
          <MetricCell key={metric.id} metric={metric} />
        ))}
      </div>
    </div>
  );
}

function MetricCell({ metric }: { metric: DashboardMetric }) {
  const body = <MetricBody metric={metric} />;
  const base = "group relative flex flex-col gap-2 bg-surface px-4 pb-2.5 pt-3";

  if (!metric.href) return <div className={base}>{body}</div>;

  return (
    <Link
      href={metric.href}
      className={cn(
        base,
        "transition-colors duration-[130ms] ease-[var(--ease-out-quint)]",
        "hover:bg-ink-50 focus-visible:outline-offset-[-2px]",
      )}
    >
      {body}
    </Link>
  );
}

function MetricBody({ metric }: { metric: DashboardMetric }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-meta font-medium text-text-secondary">{metric.label}</p>
        <Delta metric={metric} />
      </div>

      <div>
        <p
          data-numeric
          className="text-display font-semibold leading-none tracking-[-0.022em] text-text-primary"
        >
          {metric.value}
        </p>
        <p className="mt-1.5 text-meta leading-snug text-text-muted">{metric.secondary}</p>
      </div>

      <Sparkline
        values={metric.sparkline}
        tone={metric.intent}
        className="mt-auto"
        label={`${metric.label}, last seven days`}
      />
    </>
  );
}

/**
 * The movement, coloured by whether it is good news for this particular metric.
 *
 * The arrow does the work; colour only confirms it. Response time falling is
 * green with a down arrow, occupancy falling is amber with the same arrow, and
 * neither reading depends on being able to tell the two colours apart.
 */
function Delta({ metric }: { metric: DashboardMetric }) {
  if (metric.deltaPct === undefined) {
    return <span className="text-micro text-text-muted">No prior day</span>;
  }

  const good = metric.trend === metric.positiveDirection;
  const Icon = metric.trend === "up" ? ArrowUpRight : metric.trend === "down" ? ArrowDownRight : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-[var(--radius-micro)] px-1 py-0.5 text-micro font-semibold",
        metric.trend === "flat"
          ? "bg-ink-100 text-text-secondary"
          : good
            ? "bg-positive-100 text-positive-700"
            : metric.intent === "critical"
              ? "bg-critical-100 text-critical-700"
              : "bg-caution-100 text-caution-700",
      )}
      // Read aloud as a sentence; the visual form is a glyph and two digits.
      title={`${formatDeltaPct(metric.deltaPct)} against ${metric.comparison}`}
    >
      <Icon className="size-2.5" aria-hidden="true" />
      <span data-numeric>{formatDeltaPct(metric.deltaPct, 0)}</span>
      <span className="sr-only"> against {metric.comparison}</span>
    </span>
  );
}
