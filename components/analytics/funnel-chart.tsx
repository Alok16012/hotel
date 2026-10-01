import { TrendingDown } from "lucide-react";
import type { Funnel } from "@/lib/analytics";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Stage-to-stage drop-off on a fixed cohort.
 *
 * The bars are the survivors; the interesting number is the gap between them,
 * so the loss is printed in the gap rather than in a column at the edge. The
 * widest loss is called out once, because "where does this desk lose people"
 * is the only question this panel exists to answer.
 */
export function FunnelChart({ funnel }: { funnel: Funnel }) {
  return (
    <div className="px-4 py-3">
      <ol className="flex flex-col">
        {funnel.steps.map((step, i) => (
          <li key={step.stage}>
            {i > 0 ? (
              <div className="flex items-center gap-2 py-1 pl-[9.5rem]">
                <span
                  aria-hidden="true"
                  className="h-3 w-px shrink-0 bg-hairline-strong"
                />
                <p
                  data-numeric
                  className={cn(
                    "text-micro",
                    step.stage === funnel.worst?.stage
                      ? "font-medium text-critical-700"
                      : "text-text-muted",
                  )}
                >
                  {step.lost} lost here, {formatPct(step.lostPct, 0)} of those still in
                  {step.stage === funnel.worst?.stage ? " · the widest gap" : ""}
                </p>
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <p className="w-[8.5rem] shrink-0 text-right text-meta text-text-secondary">
                {step.label}
              </p>

              <div className="relative h-7 min-w-0 flex-1">
                <div
                  className={cn(
                    "flex h-full items-center rounded-[var(--radius-sm)] px-2",
                    "transition-[width] duration-[240ms] ease-[var(--ease-out-expo)]",
                    i === funnel.steps.length - 1
                      ? "bg-positive-500/25 shadow-[inset_0_0_0_1px_var(--color-positive-500)]"
                      : "bg-brand-500/20",
                  )}
                  style={{ width: `${Math.max(step.shareOfTop * 100, 8)}%` }}
                >
                  <span data-numeric className="text-meta font-semibold text-text-primary">
                    {step.reached}
                  </span>
                </div>
              </div>

              <p data-numeric className="w-12 shrink-0 text-right text-meta text-text-muted">
                {formatPct(step.shareOfTop, 0)}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {funnel.worst ? (
        <p className="mt-3 flex items-start gap-1.5 rounded-[var(--radius-card)] bg-intel-100/45 px-2.5 py-2 text-meta text-text-secondary shadow-[var(--shadow-hairline)]">
          <TrendingDown className="mt-0.5 size-3.5 shrink-0 text-intel-600" aria-hidden="true" />
          <span>
            The widest gap is at {funnel.worst.label.toLowerCase()}, where{" "}
            {formatPct(funnel.worst.lostPct, 0)} of the enquiries still in play go quiet. That is
            the stage to work on before the one at the top.
          </span>
        </p>
      ) : null}
    </div>
  );
}
