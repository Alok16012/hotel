import { ColumnHead, Panel, PanelLink } from "@/components/common/panel";
import { SourceBadge } from "@/components/common/source-badge";
import { formatDuration, formatINRCompact } from "@/lib/format";
import { LEAD_SOURCE } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { ChannelPerformance } from "@/types";

/**
 * Where the enquiries come from and what each channel is worth (§30).
 *
 * The bar encodes lead volume and the row carries everything volume cannot
 * say: an OTA sends a third of WhatsApp's enquiries and more money, because it
 * sends reservations rather than questions. A pie chart of these eight slices
 * would look tidier and answer none of that.
 */
export function ChannelMix({
  channels,
  slaTargetSec,
}: {
  channels: ChannelPerformance[];
  slaTargetSec: number;
}) {
  const maxLeads = Math.max(...channels.map((c) => c.leads), 1);
  const totalLeads = channels.reduce((sum, c) => sum + c.leads, 0);

  return (
    <Panel
      title="Channel mix"
      /* Deliberately not "in the last 30 days". The enquiry counts are the live
         working book, while the revenue column is the last 30 days of
         confirmed bookings; the month's full enquiry cohort is larger and only
         the conversion KPI reports it. Saying so is cheaper than a footnote
         explaining why two numbers on one screen disagree. */
      description={`${totalLeads} enquiries in the working book, against 30 days of booked revenue.`}
      footer={<PanelLink href="/analytics">Channel analytics</PanelLink>}
    >
      <table className="w-full border-collapse">
        <thead className="border-b border-hairline bg-surface-sunken/60">
          <tr>
            {/* The channel column absorbs whatever the numbers leave behind.
                Without it the table's minimum width is the sum of four
                max-content columns, which is wider than a phone. */}
            <ColumnHead className="w-full max-w-0">Channel</ColumnHead>
            <ColumnHead align="right">Enquiries</ColumnHead>
            <ColumnHead align="right" className="hidden sm:table-cell">
              First reply
            </ColumnHead>
            <ColumnHead align="right">Revenue 30d</ColumnHead>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {channels.map((channel) => {
            const slow = channel.medianResponseSec > slaTargetSec;
            return (
              <tr key={channel.source}>
                <td className="w-full max-w-0 px-4 py-2">
                  <div className="flex items-center gap-2">
                    <SourceBadge source={channel.source} />
                    {/* Wraps rather than truncates: on a phone there is room
                        for "Google Business" over two lines, and half a
                        channel name is not a channel name. */}
                    <span className="text-body leading-tight text-text-primary">
                      {LEAD_SOURCE[channel.source].label}
                    </span>
                  </div>
                  {/* The bar sits under the label rather than in its own column
                      so the channel's colour and its size are one object. */}
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(channel.leads / maxLeads) * 100}%`,
                        backgroundColor: `var(--color-channel-${channel.source.replace(/_/g, "-")})`,
                      }}
                    />
                  </div>
                </td>

                <td className="whitespace-nowrap px-4 py-2 text-right align-top">
                  <p data-numeric className="text-body font-medium text-text-primary">
                    {channel.leads}
                  </p>
                  <p data-numeric className="text-micro text-text-muted">
                    {channel.converted} booked
                  </p>
                </td>

                <td className="hidden whitespace-nowrap px-4 py-2 text-right align-top sm:table-cell">
                  <span
                    data-numeric
                    className={cn(
                      "text-meta",
                      channel.leads === 0
                        ? "text-text-muted"
                        : slow
                          ? "font-medium text-caution-700"
                          : "text-text-secondary",
                    )}
                  >
                    {/* A walk-in is answered at the desk, so its zero is a fact
                        about the channel rather than a fast desk. Printing
                        "0 sec" beside four minutes of WhatsApp would read as a
                        broken clock. */}
                    {channel.leads === 0
                      ? "n/a"
                      : channel.source === "walk_in"
                        ? "in person"
                        : formatDuration(channel.medianResponseSec)}
                  </span>
                </td>

                <td
                  data-numeric
                  className="whitespace-nowrap px-4 py-2 text-right align-top text-body font-medium text-text-primary"
                >
                  {formatINRCompact(channel.revenue)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}
