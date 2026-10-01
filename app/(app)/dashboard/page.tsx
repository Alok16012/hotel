import type { Metadata } from "next";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { ChannelMix } from "@/components/dashboard/channel-mix";
import { ExceptionQueue } from "@/components/dashboard/exception-queue";
import { MetricStrip } from "@/components/dashboard/metric-strip";
import { ResponseLeaderboard } from "@/components/dashboard/response-leaderboard";
import { RevenueAtRisk } from "@/components/dashboard/revenue-at-risk";
import { TodayPanel } from "@/components/dashboard/today-panel";
import { PageBody, PageHeader } from "@/components/common/page-header";
import { DEMO_NOW_ISO, DEMO_TODAY } from "@/lib/clock";
import { formatFullDate, formatTime } from "@/lib/format";
import { SLA_TARGET_SEC } from "@/lib/metrics";
import { service } from "@/lib/service";
import type { Guest } from "@/types";

export const metadata: Metadata = {
  title: "Command Center",
  description:
    "What the property is doing right now: demand, response health, revenue at risk and the decisions waiting on a person.",
};

/**
 * Command Center (§9).
 *
 * The reading order is deliberate and it is the product's argument. The six
 * numbers say whether today is normal. The decisions and the exposed money say
 * what to do about it if it is not. Today's arrivals and the live feed are
 * context for both. The two performance panels at the bottom are for the
 * manager reviewing the shift, not the person working it, so they sit last.
 *
 * Everything on this page is derived in `lib/metrics.ts` and read through the
 * service. No component here holds domain data of its own, so when these
 * methods answer from a database the markup does not change.
 *
 * The ten reads are issued together rather than in sequence. They do not
 * depend on each other, and a screen that exists to say what is happening now
 * should not take ten round trips to say it.
 */
export default async function CommandCenterPage() {
  const api = service();
  const [
    metrics,
    opportunity,
    exceptions,
    response,
    channels,
    events,
    arrivals,
    departures,
    inHouse,
    guests,
  ] = await Promise.all([
    api.getDashboardMetrics(),
    api.getRevenueOpportunity(),
    api.getOpenExceptions(),
    api.getResponsePerformance(),
    api.getChannelPerformance(),
    api.getEventsToday(),
    api.getArrivalsToday(),
    api.getDeparturesToday(),
    api.getInHouse(),
    api.getGuests(),
  ]);

  const guestById: Record<string, Guest | undefined> = Object.fromEntries(
    guests.map((g) => [g.id, g]),
  );

  return (
    <>
      <PageHeader
        title="Command Center"
        description="Everything the property has done today, and the few things it could not decide on its own."
        eyebrow={
          /* The page is a snapshot, so it says when it was taken. The autonomy
             figure deliberately is not repeated here: the topbar carries it on
             every screen, and stating it twice on one screen weakens it. */
          <>
            <span data-numeric>{formatFullDate(DEMO_TODAY)}</span>
            <span aria-hidden="true">·</span>
            <span>
              as of <time dateTime={DEMO_NOW_ISO}>{formatTime(DEMO_NOW_ISO)}</time>
            </span>
          </>
        }
      />

      <PageBody className="space-y-4 pb-10">
        <MetricStrip metrics={metrics} />

        {/* Decisions and exposed money on the left, the state of the day on the
            right. On narrow screens the right column moves below, which keeps
            the two queues that need acting on above the fold. */}
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <ExceptionQueue exceptions={exceptions} />
            <RevenueAtRisk data={opportunity} />
          </div>

          <div className="space-y-4">
            <TodayPanel
              arrivals={arrivals}
              departures={departures}
              inHouse={inHouse}
              guestById={guestById}
            />
            <ActivityFeed events={events} />
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <ChannelMix channels={channels} slaTargetSec={SLA_TARGET_SEC} />
          <ResponseLeaderboard data={response} slaTargetSec={SLA_TARGET_SEC} />
        </div>
      </PageBody>
    </>
  );
}
