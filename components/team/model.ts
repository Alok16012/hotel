/**
 * Ordering and thresholds for the team directory.
 *
 * Client-safe on purpose: `lib/team.ts` reads the seed, so the workspace takes
 * types from it and the arithmetic it needs at runtime from here.
 */

import type { TeamRow } from "@/lib/team";

export type TeamSortId = "workload" | "response" | "sla" | "conversion" | "name";

export const TEAM_SORTS: readonly { id: TeamSortId; label: string; hint: string }[] = [
  { id: "workload", label: "Workload", hint: "Most enquiries open right now, first" },
  { id: "response", label: "Slowest reply", hint: "Longest median first response, first" },
  { id: "sla", label: "Target missed", hint: "Lowest share answered inside target, first" },
  { id: "conversion", label: "Conversion", hint: "Highest share of enquiries booked, first" },
  { id: "name", label: "Name", hint: "Alphabetical" },
];

/**
 * People with nothing measured sort last on every performance order.
 *
 * The owner has never taken an enquiry, so their median response is zero and
 * their conversion is zero. Sorted naively they would head the "slowest reply"
 * list as the fastest person on the desk and tail the conversion list as the
 * worst, and both readings are wrong: there is nothing there to read.
 */
function measured(row: TeamRow): boolean {
  return row.handledLeadCount > 0;
}

export function sortTeam(rows: TeamRow[], sort: TeamSortId): TeamRow[] {
  const byName = (a: TeamRow, b: TeamRow) => a.member.name.localeCompare(b.member.name);

  return [...rows].sort((a, b) => {
    if (sort === "name") return byName(a, b);
    if (sort === "workload") return b.openLeads - a.openLeads || byName(a, b);

    if (measured(a) !== measured(b)) return measured(a) ? -1 : 1;
    if (!measured(a)) return byName(a, b);

    if (sort === "response") return b.medianResponseSec - a.medianResponseSec || byName(a, b);
    if (sort === "sla") return a.slaComplianceRate - b.slaComplianceRate || byName(a, b);
    return b.conversionRate - a.conversionRate || byName(a, b);
  });
}

/** The three bands the SLA figure is read in, used for colour and for wording. */
export function slaBand(rate: number): "good" | "watch" | "poor" {
  if (rate >= 0.9) return "good";
  if (rate >= 0.8) return "watch";
  return "poor";
}
