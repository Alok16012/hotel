/**
 * The parts of /analytics a client component is allowed to call.
 *
 * `lib/analytics.ts` reads the seed, so the workspace imports types from it and
 * nothing else. Anything the range switch or a panel footer needs at runtime
 * lives here, where the only dependencies are pure formatters.
 */

import { formatDuration } from "@/lib/format";
import type { AnalyticsRange, ResponseDistribution } from "@/lib/analytics";

export const ANALYTICS_RANGES: readonly { id: AnalyticsRange; label: string; hint: string }[] = [
  { id: 7, label: "7 days", hint: "This week against the one before it" },
  { id: 30, label: "30 days", hint: "The month against the month before it" },
];

/** Median, tail and target in one sentence, used under the response chart. */
export function responseSummaryLine(response: ResponseDistribution): string {
  return `Median ${formatDuration(response.medianSec)}, slowest ${formatDuration(
    response.slowestSec,
  )}, against a ${formatDuration(response.targetSec)} target.`;
}
