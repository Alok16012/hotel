import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

/**
 * Page-level loading shapes.
 *
 * Each one mirrors the layout it stands in for — same header height, same row
 * rhythm, same column count. A skeleton that does not match what arrives is
 * worse than a spinner, because the page visibly rearranges itself on load.
 */
export function PageLoadingSkeleton({
  rows = 10,
  columns = 6,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>

      <div className="border-b border-hairline px-4 pb-4 pt-4 sm:px-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>

      <div className="px-4 py-4 sm:px-6">
        <div className="mb-4 flex gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface">
          <TableSkeleton rows={rows} columns={columns} />
        </div>
      </div>
    </div>
  );
}

/** Metric strip placeholder, for dashboards that load their KPIs separately. */
export function MetricStripSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="rounded-[var(--radius-card)] border border-hairline bg-surface p-3"
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-32" />
          <Skeleton className="mt-2 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
