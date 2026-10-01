import { ColumnHead } from "@/components/common/panel";
import { SourceBadge } from "@/components/common/source-badge";
import { formatDuration, formatINRCompact, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChannelPerformance } from "@/types";

/**
 * Volume, conversion and money per channel.
 *
 * Two of the property's channels barely produce enquiries at all: an OTA
 * reservation and a walk-in arrive already sold. Their conversion cell is
 * blank rather than zero, because a rate needs a denominator and pretending
 * otherwise would rank the two channels that actually pay the bills last.
 */
export function ChannelTable({ channels }: { channels: ChannelPerformance[] }) {
  const busiest = Math.max(...channels.map((c) => c.leads), 1);
  const richest = Math.max(...channels.map((c) => c.revenue), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[48rem] border-collapse">
        <thead className="border-b border-hairline">
          <tr>
            <ColumnHead>Channel</ColumnHead>
            <ColumnHead align="right">Enquiries</ColumnHead>
            <ColumnHead align="right">Booked</ColumnHead>
            <ColumnHead align="right">Conversion</ColumnHead>
            <ColumnHead align="right">Median reply</ColumnHead>
            <ColumnHead align="right">Revenue, 30 days</ColumnHead>
          </tr>
        </thead>
        <tbody>
          {channels.map((channel) => (
            <tr
              key={channel.source}
              className="border-b border-hairline last:border-0 hover:bg-surface-sunken/60"
            >
              <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <SourceBadge source={channel.source} showLabel className="w-32 shrink-0" />
                  {/* The bar is behind the volume column in spirit but drawn
                      here, where there is room for it to be long enough to
                      compare at a glance. */}
                  <div className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-brand-500/60"
                      style={{ width: `${(channel.leads / busiest) * 100}%` }}
                    />
                  </div>
                </div>
              </td>
              <td data-numeric className="px-4 py-2 text-right text-body text-text-primary">
                {channel.leads || <span className="text-text-muted">None</span>}
              </td>
              <td data-numeric className="px-4 py-2 text-right text-body text-text-secondary">
                {channel.converted || <span className="text-text-muted">0</span>}
              </td>
              <td
                data-numeric
                className={cn(
                  "px-4 py-2 text-right text-body",
                  channel.leads === 0
                    ? "text-text-muted"
                    : channel.conversionRate >= 0.4
                      ? "font-medium text-positive-700"
                      : "text-text-primary",
                )}
              >
                {channel.leads === 0 ? "Arrives sold" : formatPct(channel.conversionRate, 0)}
              </td>
              <td data-numeric className="px-4 py-2 text-right text-body text-text-secondary">
                {channel.medianResponseSec > 0 ? (
                  formatDuration(channel.medianResponseSec)
                ) : (
                  <span className="text-text-muted">No replies yet</span>
                )}
              </td>
              <td className="px-4 py-2">
                <div className="flex items-center justify-end gap-2">
                  <div className="h-1 w-20 shrink-0 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-positive-500/70"
                      style={{ width: `${(channel.revenue / richest) * 100}%` }}
                    />
                  </div>
                  <span
                    data-numeric
                    className="w-14 text-right text-body font-medium text-text-primary"
                  >
                    {channel.revenue > 0 ? (
                      formatINRCompact(channel.revenue)
                    ) : (
                      <span className="font-normal text-text-muted">Nil</span>
                    )}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
