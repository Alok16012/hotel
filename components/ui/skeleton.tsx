import { cn } from "@/lib/utils";

/**
 * Loading placeholder. The sweep is a single translating gradient rather than
 * an opacity pulse: a pulse reads as an attention-seeking indicator, a sweep
 * reads as "content is arriving".
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-sm)] bg-ink-100",
        "motion-safe:after:absolute motion-safe:after:inset-0",
        "motion-safe:after:bg-gradient-to-r motion-safe:after:from-transparent motion-safe:after:via-white/55 motion-safe:after:to-transparent",
        "motion-safe:after:animate-[shimmer_1.6s_infinite]",
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

/** Table-shaped skeleton, sized to the 38px row rhythm used across the product. */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div role="status" aria-label="Loading" className="w-full">
      <div className="flex h-9 items-center gap-4 border-b border-hairline px-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-2.5" style={{ width: i === 0 ? "18%" : "12%" }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex h-[38px] items-center gap-4 border-b border-hairline px-3">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton
              key={c}
              className="h-3"
              style={{ width: c === 0 ? "18%" : `${8 + ((r + c) % 3) * 3}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
