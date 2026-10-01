import type { ResponseDistribution } from "@/lib/analytics";
import { formatDuration, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * How long guests waited for a reply a person wrote.
 *
 * A median alone hides the tail, and the tail is the part that loses bookings:
 * twenty enquiries answered in four minutes and one answered in eighty does not
 * describe a desk that is quick. The buckets are cut on the thirty-minute
 * target rather than on round numbers, so the line between kept and missed
 * falls exactly on a bucket edge and no bar has to be read as partly compliant.
 */
export function ResponseChart({ response }: { response: ResponseDistribution }) {
  const max = Math.max(...response.buckets.map((b) => b.count), 1);
  const breachIndex = response.buckets.findIndex((b) => !b.withinTarget);

  return (
    <div className="px-4 py-3">
      <ol className="flex flex-col gap-1.5">
        {response.buckets.map((bucket, i) => (
          <li key={bucket.id}>
            {i === breachIndex ? (
              <div className="mb-2 flex items-center gap-2">
                <span className="text-micro font-medium uppercase tracking-[0.08em] text-critical-700">
                  Past the {formatDuration(response.targetSec)} target
                </span>
                <span aria-hidden="true" className="h-px flex-1 bg-critical-500/40" />
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <p className="w-[7.5rem] shrink-0 text-right text-meta text-text-secondary">
                {bucket.label}
              </p>

              <div className="h-6 min-w-0 flex-1">
                <div
                  className={cn(
                    "flex h-full items-center rounded-[var(--radius-sm)] px-2",
                    bucket.count === 0
                      ? "w-px bg-hairline-strong"
                      : bucket.withinTarget
                        ? "bg-positive-500/25"
                        : "bg-critical-500/25",
                  )}
                  style={
                    bucket.count === 0
                      ? undefined
                      : { width: `${Math.max((bucket.count / max) * 100, 9)}%` }
                  }
                >
                  {bucket.count > 0 ? (
                    <span data-numeric className="text-meta font-semibold text-text-primary">
                      {bucket.count}
                    </span>
                  ) : null}
                </div>
              </div>

              <p data-numeric className="w-10 shrink-0 text-right text-meta text-text-muted">
                {bucket.count === 0 ? "Nil" : formatPct(bucket.share, 0)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
