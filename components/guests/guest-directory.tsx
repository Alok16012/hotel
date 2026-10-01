"use client";

import * as React from "react";
import Link from "next/link";
import { BedDouble, Info, UserRound } from "lucide-react";
import { PageBody, PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { ColumnHead, Panel } from "@/components/common/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDayMonth, formatINR, formatINRCompact } from "@/lib/format";
import type { DirectorySummary, GuestRow } from "@/lib/guests";
import { cn } from "@/lib/utils";
import { DirectoryToolbar } from "./directory-toolbar";
import { LikelihoodMeter } from "./likelihood-meter";
import {
  EMPTY_FILTERS,
  filterGuests,
  lastStayLabel,
  scopeCounts,
  sortGuests,
  type DirectoryFilterState,
} from "./model";

/**
 * The guest directory (§16).
 *
 * Two families of number sit side by side here and are labelled apart on
 * purpose. "Stays" is the property's own lifetime record, carried over from
 * whatever was kept before this system. "On file" is what this system can
 * actually show you the paperwork for. Most guests have more of the first than
 * the second, and a directory that hid that difference would be inventing
 * history every time someone opened it.
 */
export function GuestDirectory({
  rows,
  summary,
}: {
  rows: GuestRow[];
  summary: DirectorySummary;
}) {
  const [state, setState] = React.useState<DirectoryFilterState>(EMPTY_FILTERS);

  const counts = React.useMemo(() => scopeCounts(rows), [rows]);
  const visible = React.useMemo(
    () => sortGuests(filterGuests(rows, state), state.sort),
    [rows, state],
  );

  function update(next: Partial<DirectoryFilterState>) {
    setState((current) => ({ ...current, ...next }));
  }

  return (
    <>
      <PageHeader
        eyebrow="Relationships"
        title="Guests"
        description={`${summary.guests} people on the directory, worth ${formatINRCompact(summary.lifetimeValue)} in lifetime spend. ${summary.inHouse} are in the building right now.`}
      >
        <DirectoryToolbar
          state={state}
          counts={counts}
          onChange={update}
          shown={visible.length}
          total={rows.length}
        />
      </PageHeader>

      <PageBody className="space-y-4">
        <StatBand summary={summary} />

        <Panel
          title="Directory"
          description="Sorted by lifetime value unless you say otherwise. Open a guest for stay history, preferences and complaints."
          bodyClassName="overflow-x-auto"
        >
          {visible.length === 0 ? (
            <EmptyState
              icon={UserRound}
              title="Nobody matches that"
              description="Try a shorter search, or clear the segment filter to see the whole directory again."
              action={
                <Button variant="secondary" size="sm" onClick={() => setState(EMPTY_FILTERS)}>
                  Reset filters
                </Button>
              }
            />
          ) : (
            <table className="w-full min-w-[56rem] border-collapse">
              <thead className="border-b border-hairline bg-surface-sunken/50">
                <tr>
                  <ColumnHead>Guest</ColumnHead>
                  <ColumnHead>Segments</ColumnHead>
                  <ColumnHead align="right">Stays</ColumnHead>
                  <ColumnHead align="right">Nights on file</ColumnHead>
                  <ColumnHead align="right">Average rate</ColumnHead>
                  <ColumnHead align="right">Lifetime value</ColumnHead>
                  <ColumnHead>Last stay</ColumnHead>
                  <ColumnHead>Next stay</ColumnHead>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <GuestTableRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <p className="flex items-start gap-1.5 pb-2 text-meta text-text-muted">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          Stay count and lifetime value are the property&apos;s own record and include stays made
          before this system. Nights and average rate are counted from the bookings held here, which
          is why they read lower.
        </p>
      </PageBody>
    </>
  );
}

function GuestTableRow({ row }: { row: GuestRow }) {
  const shown = row.segments.slice(0, 2);
  const extra = row.segments.length - shown.length;
  const stay = lastStayLabel(row);

  return (
    <tr className="border-b border-hairline/70 transition-colors duration-[80ms] last:border-0 hover:bg-ink-50/70">
      <td className="px-4 py-2.5">
        <Link
          href={`/guests/${row.id}`}
          className="text-body font-medium text-text-primary underline-offset-2 hover:text-brand-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          {row.name}
        </Link>
        <p className="mt-0.5 truncate text-meta text-text-muted">
          {[row.company, row.city].filter(Boolean).join(" · ") || row.phone}
        </p>
      </td>

      <td className="px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-1">
          {shown.map((segment) => (
            <StatusBadge key={segment} kind="segment" value={segment} />
          ))}
          {extra > 0 ? <Badge intent="outline">+{extra}</Badge> : null}
          {row.openComplaints > 0 ? (
            <Badge intent="critical">
              {row.openComplaints} open {row.openComplaints === 1 ? "issue" : "issues"}
            </Badge>
          ) : null}
        </div>
      </td>

      <td data-numeric className="px-4 py-2.5 text-right text-body text-text-primary">
        {row.totalStays}
        <span className="block text-micro text-text-muted">{row.staysOnFile} on file</span>
      </td>

      <td data-numeric className="px-4 py-2.5 text-right text-body text-text-secondary">
        {row.nightsOnFile > 0 ? row.nightsOnFile : <span className="text-text-muted">0</span>}
      </td>

      <td data-numeric className="px-4 py-2.5 text-right text-body text-text-secondary">
        {row.averageRate > 0 ? (
          formatINR(row.averageRate)
        ) : (
          <span className="text-text-muted">Not on file</span>
        )}
      </td>

      <td
        data-numeric
        className="px-4 py-2.5 text-right text-body font-medium text-text-primary"
      >
        {row.lifetimeValue > 0 ? (
          formatINR(row.lifetimeValue)
        ) : (
          <span className="font-normal text-text-muted">First stay pending</span>
        )}
      </td>

      <td className="px-4 py-2.5 text-meta text-text-secondary">
        {stay.value}
        <span className="block text-micro text-text-muted">{stay.hint}</span>
      </td>

      <td className="px-4 py-2.5">
        {row.inHouse ? (
          <span className="inline-flex items-center gap-1.5 text-meta font-medium text-brand-700">
            <BedDouble className="size-3.5" aria-hidden="true" />
            In house
          </span>
        ) : row.nextArrival ? (
          <span className="text-meta text-text-secondary">
            Arrives {formatDayMonth(row.nextArrival)}
          </span>
        ) : (
          <LikelihoodMeter likelihood={row.likelihood} />
        )}
      </td>
    </tr>
  );
}

/**
 * The five counts that frame the list below.
 *
 * One tray with hairline gaps rather than five cards, for the same reason the
 * Command Center uses one: five shadowed rectangles read as a widget gallery.
 */
function StatBand({ summary }: { summary: DirectorySummary }) {
  const cells: { label: string; value: string; hint: string; tone?: "critical" }[] = [
    {
      label: "On the directory",
      value: String(summary.guests),
      hint: `${summary.returning} have stayed more than once`,
    },
    {
      label: "Lifetime value",
      value: formatINRCompact(summary.lifetimeValue),
      hint: `${formatINRCompact(summary.averageValue)} average per staying guest`,
    },
    {
      label: "In house",
      value: String(summary.inHouse),
      hint: "Checked in tonight",
    },
    {
      label: "Booked ahead",
      value: String(summary.arrivingSoon),
      hint: "Hold a future reservation",
    },
    {
      label: "Needs attention",
      value: String(summary.atRisk),
      hint: "Flagged at risk by the team",
      tone: summary.atRisk > 0 ? "critical" : undefined,
    },
  ];

  return (
    <div className="overflow-hidden rounded-[var(--radius-surface)] bg-hairline shadow-[var(--shadow-raised)]">
      <div className="grid grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-5">
        {cells.map((cell) => (
          <div key={cell.label} className="bg-surface px-4 pb-2.5 pt-3">
            <p className="text-meta font-medium text-text-secondary">{cell.label}</p>
            <p
              data-numeric
              className={cn(
                "mt-1 text-section font-semibold leading-none tracking-[-0.02em]",
                cell.tone === "critical" ? "text-critical-700" : "text-text-primary",
              )}
            >
              {cell.value}
            </p>
            <p className="mt-1.5 text-meta leading-snug text-text-muted">{cell.hint}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
