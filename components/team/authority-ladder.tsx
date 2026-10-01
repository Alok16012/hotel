import { ArrowUpRight } from "lucide-react";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DiscountAuthority, TeamRole } from "@/types";

/**
 * The discount ladder (§16, §40).
 *
 * The same figures the quote simulator enforces and the exception queue raises
 * requests against, shown once as a ladder so the escalation path is legible:
 * a receptionist asked for eight per cent is not refused, they are routed. Two
 * roles sit at zero and that is intentional, not missing data, so the row says
 * "no discount alone" rather than showing a bar of no width.
 */
export function AuthorityLadder({
  authority,
  roleLabels,
}: {
  authority: DiscountAuthority[];
  roleLabels: Record<TeamRole, string>;
}) {
  const ceiling = Math.max(...authority.map((a) => a.ceiling), 0.01);
  const ordered = [...authority].sort((a, b) => a.ceiling - b.ceiling);

  return (
    <div className="px-4 py-3">
      {/* Capped rather than stretched: past a point a wider bar stops carrying
          more meaning and the percentage has to be hunted for. */}
      <ol className="flex max-w-[44rem] flex-col gap-2">
        {ordered.map((step) => (
          <li key={step.role} className="flex items-center gap-3">
            <p className="w-[7.5rem] shrink-0 text-right text-meta text-text-secondary">
              {roleLabels[step.role]}
            </p>

            <div className="h-6 min-w-0 flex-1">
              <div
                className={cn(
                  "flex h-full items-center rounded-[var(--radius-sm)] px-2",
                  step.ceiling === 0 ? "w-fit bg-ink-100" : "bg-brand-500/20",
                )}
                style={
                  step.ceiling === 0
                    ? undefined
                    : { width: `${Math.max((step.ceiling / ceiling) * 100, 12)}%` }
                }
              >
                <span
                  data-numeric
                  className={cn(
                    "whitespace-nowrap text-meta",
                    step.ceiling === 0
                      ? "text-text-muted"
                      : "font-semibold text-text-primary",
                  )}
                >
                  {step.ceiling === 0 ? "No discount alone" : formatPct(step.ceiling, 0)}
                </span>
              </div>
            </div>

            <p className="flex w-[9.5rem] shrink-0 items-center justify-end gap-1 text-micro text-text-muted">
              {step.escalatesTo ? (
                <>
                  <ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{roleLabels[step.escalatesTo]}</span>
                </>
              ) : (
                <span>The last word</span>
              )}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
