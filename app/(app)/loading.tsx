import { PageLoadingSkeleton } from "@/components/common/loading-skeleton";

/**
 * Shared route-level loading state. The shell stays mounted through the
 * transition, so only the work surface swaps — navigation never blinks.
 */
export default function Loading() {
  return <PageLoadingSkeleton />;
}
