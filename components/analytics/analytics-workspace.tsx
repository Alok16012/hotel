"use client";

import * as React from "react";
import { PageHeader } from "@/components/common/page-header";
import { SegmentedControl } from "@/components/common/segmented-control";
import { Panel, PanelLink } from "@/components/common/panel";
import type { AnalyticsRange, AnalyticsView } from "@/lib/analytics";
import { formatDeltaPct, formatINRCompact, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ANALYTICS_RANGES, responseSummaryLine } from "./model";
import { AutonomyChart } from "./autonomy-chart";
import { ChannelTable } from "./channel-table";
import { FunnelChart } from "./funnel-chart";
import { ResponseChart } from "./response-chart";
import { RevenueChart } from "./revenue-chart";

/**
 * Analytics (§21).
 *
 * Five panels, five different measurement windows, and each one says which
 * window it is standing on in its own subtitle. That repetition is the point:
 * this screen puts a thirty-day cohort funnel next to a live-inbox response
 * distribution, and a reader who assumes they are the same population will
 * draw a conclusion neither of them supports.
 *
 * Both ranges are computed on the server and handed over together. There are
 * two of them, they are small, and doing it this way keeps the seed arrays out
 * of the client bundle while the switch stays instant.
 */
export function AnalyticsWorkspace({ views }: { views: Record<AnalyticsRange, AnalyticsView> }) {
  const [range, setRange] = React.useState<AnalyticsRange>(30);
  const view = views[range];
  const { revenue, funnel, response, autonomy } = view;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Analytics"
        description="Where the money came from, where the enquiries went, and how much of the work the desk still does by hand."
        actions={
          <SegmentedControl
            label="Measurement window"
            options={ANALYTICS_RANGES}
            value={range}
            onChange={setRange}
          />
        }
      />

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-6 lg:gap-4">
          <Panel
            className="lg:col-span-4 overflow-visible"
            title="Revenue booked"
            description={view.windows.revenue}
            aside={
              <div className="flex items-start gap-4">
                <Figure
                  label="Confirmed"
                  value={formatINRCompact(revenue.total)}
                  hint={
                    revenue.deltaPct === undefined
                      ? `The ledger does not reach ${range} days further back`
                      : `${formatDeltaPct(revenue.deltaPct, 0)} on the ${range} days before`
                  }
                  tone={
                    revenue.deltaPct === undefined
                      ? undefined
                      : revenue.deltaPct >= 0
                        ? "positive"
                        : "critical"
                  }
                />
                <Figure
                  label="Reservations"
                  value={String(revenue.bookings)}
                  hint={`${formatINRCompact(revenue.averageBooking)} average`}
                />
              </div>
            }
            footer={<PanelLink href="/bookings">Open the booking ledger</PanelLink>}
          >
            <RevenueChart trend={revenue} />
          </Panel>

          <Panel
            className="lg:col-span-2"
            title="Automation autonomy"
            description={view.windows.autonomy}
            aside={
              <Figure
                label="Today"
                value={formatPct(autonomy.current, 0)}
                hint={`${autonomy.deltaPoints >= 0 ? "+" : ""}${autonomy.deltaPoints.toFixed(
                  0,
                )} points in a fortnight`}
                tone={autonomy.deltaPoints >= 0 ? "positive" : "caution"}
              />
            }
            footer={<PanelLink href="/exceptions">See what is waiting on a person</PanelLink>}
          >
            <AutonomyChart autonomy={autonomy} />
          </Panel>

          <Panel
            className="lg:col-span-3"
            title="Conversion funnel"
            description={view.windows.funnel}
            aside={
              <Figure
                label="Enquiry to booking"
                value={formatPct(funnel.conversionRate, 1)}
                hint={`${funnel.booked} of ${funnel.entered}`}
              />
            }
            footer={<PanelLink href="/pipeline">Work the live pipeline</PanelLink>}
          >
            <FunnelChart funnel={funnel} />
          </Panel>

          <Panel
            className="lg:col-span-3"
            title="Time to a human reply"
            description={view.windows.response}
            aside={
              <Figure
                label="Inside target"
                value={formatPct(response.withinTargetPct, 0)}
                hint={`${response.withinTargetCount} of ${response.answered}`}
                tone={response.withinTargetPct >= 0.9 ? "positive" : "caution"}
              />
            }
            footer={
              <p className="text-meta text-text-muted">
                {responseSummaryLine(response)} Automation acknowledges inside a minute on the
                threads it reaches; this is the second clock, the reply a colleague wrote.
              </p>
            }
          >
            <ResponseChart response={response} />
          </Panel>

          <Panel
            className="lg:col-span-6"
            title="Channel performance"
            description={view.windows.channels}
            bodyClassName="pb-1"
            footer={
              <p className="text-meta text-text-muted">
                Revenue is taken from bookings rather than from converted enquiries, because an
                OTA reservation and a walk-in arrive already sold and never pass through the
                funnel.
              </p>
            }
          >
            <ChannelTable channels={view.channels} />
          </Panel>
        </div>

        <p className="px-1 py-3 text-micro text-text-muted">
          Every figure on this screen is derived from the seeded records in this build. Nothing is
          written down as a result, so editing a booking or a lead moves the charts.
        </p>
      </div>
    </div>
  );
}

function Figure({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "positive" | "caution" | "critical";
}) {
  return (
    <div className="text-right">
      <p className="text-micro font-medium uppercase tracking-[0.08em] text-text-muted">{label}</p>
      <p
        data-numeric
        className="mt-0.5 text-card font-semibold leading-none tracking-[-0.01em] text-text-primary"
      >
        {value}
      </p>
      <p
        data-numeric
        className={cn(
          "mt-1 text-micro",
          tone === "positive"
            ? "text-positive-700"
            : tone === "critical"
              ? "text-critical-700"
              : tone === "caution"
                ? "text-caution-700"
                : "text-text-muted",
        )}
      >
        {hint}
      </p>
    </div>
  );
}
