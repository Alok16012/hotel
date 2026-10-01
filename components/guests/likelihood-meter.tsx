import { cn } from "@/lib/utils";
import { likelihoodLabel, type Likelihood } from "@/lib/guests";

/**
 * Next-stay likelihood, shown as a score with its arithmetic available (§16).
 *
 * This is not a prediction and is never dressed as one. It is a handful of
 * facts the property already knows, added up the same way every time, so the
 * directory can be sorted by something more useful than alphabet. The trace
 * below is the whole point: a score you cannot argue with is a score nobody
 * acts on.
 */

const TRACK: Record<Likelihood["band"], string> = {
  high: "bg-positive-600",
  moderate: "bg-caution-600",
  low: "bg-ink-400",
};

const TEXT: Record<Likelihood["band"], string> = {
  high: "text-positive-700",
  moderate: "text-caution-700",
  low: "text-text-muted",
};

export function LikelihoodMeter({
  likelihood,
  className,
}: {
  likelihood: Likelihood;
  className?: string;
}) {
  const top = likelihood.factors
    .filter((f) => f.label !== "Base")
    .slice(0, 2)
    .map((f) => f.label)
    .join(", ");

  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      title={top ? `${likelihoodLabel(likelihood.band)}. ${top}.` : likelihoodLabel(likelihood.band)}
    >
      <span
        aria-hidden="true"
        className="h-1 w-10 shrink-0 overflow-hidden rounded-full bg-ink-200"
      >
        <span
          className={cn("block h-full rounded-full", TRACK[likelihood.band])}
          style={{ width: `${likelihood.score}%` }}
        />
      </span>
      <span className={cn("whitespace-nowrap text-meta", TEXT[likelihood.band])}>
        {likelihoodLabel(likelihood.band)}
      </span>
    </span>
  );
}

/** The working behind the score, in the order it was applied. */
export function LikelihoodTrace({ likelihood }: { likelihood: Likelihood }) {
  return (
    <ul className="divide-y divide-hairline/70">
      {likelihood.factors.map((factor) => (
        <li key={factor.label} className="flex items-start gap-3 px-4 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-meta font-medium text-text-primary">{factor.label}</p>
            <p className="mt-0.5 text-meta leading-snug text-text-muted">{factor.detail}</p>
          </div>
          <span
            data-numeric
            className={cn(
              "shrink-0 text-meta font-medium tabular-nums",
              factor.points > 0
                ? "text-positive-700"
                : factor.points < 0
                  ? "text-critical-700"
                  : "text-text-muted",
            )}
          >
            {factor.points > 0 ? `+${factor.points}` : factor.points}
          </span>
        </li>
      ))}
    </ul>
  );
}
