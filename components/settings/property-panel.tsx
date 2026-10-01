"use client";

import { ColumnHead } from "@/components/common/panel";
import { SourceBadge } from "@/components/common/source-badge";
import { Badge } from "@/components/ui/badge";
import { LEAD_SOURCE, TEAM_ROLE } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { ContactChannelRow } from "@/lib/settings";
import type { Hotel } from "@/types";

/**
 * The property record, and the ways guests reach it (§37).
 *
 * The GSTIN is here rather than buried in a billing screen because it is the
 * field an owner is asked to check most often, and because every tax figure in
 * the reports is computed against the registration shown on this row.
 */
export function PropertyPanel({ property, second }: { property: Hotel; second?: Hotel }) {
  return (
    <div className="px-4 py-3">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2">
        <Row label="GSTIN" value={property.gstin} numeric />
        <Row label="Location" value={`${property.city}, ${property.state}`} />
        <Row
          label="Rooms"
          value={`${property.totalRooms}`}
          hint={`across ${property.floors} floors`}
          numeric
        />
        <Row label="Check in" value={property.checkInTime} numeric />
        <Row label="Check out" value={property.checkOutTime} numeric />
        <Row label="Classification" value={`${property.starRating} star`} />
        <Row label="Time zone" value={`${property.timezone}, billing in ${property.currency}`} />
      </dl>

      {second ? (
        <p className="mt-3 border-t border-hairline pt-2.5 text-micro text-text-muted">
          {second.name} in {second.city} is on the same account, with {second.totalRooms} rooms and
          its own registration. No operational records have been seeded against it, so most screens
          show it as empty rather than pretending otherwise.
        </p>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  hint,
  numeric,
}: {
  label: string;
  value: string;
  hint?: string;
  numeric?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline py-1.5">
      <dt className="shrink-0 text-body text-text-secondary">{label}</dt>
      <dd className="min-w-0 text-right">
        <span
          data-numeric={numeric ? "" : undefined}
          className="text-body text-text-primary"
        >
          {value}
        </span>
        {hint ? <span className="ml-1.5 text-micro text-text-muted">{hint}</span> : null}
      </dd>
    </div>
  );
}

/**
 * Where enquiries come from, and whether this build can see them.
 *
 * Two of these rows say no. Listing a channel the product cannot read is more
 * useful than hiding it, because the guest can still use it and somebody at
 * the property still has to watch it by hand.
 */
export function ContactChannelTable({ rows }: { rows: ContactChannelRow[] }) {
  return (
    <div className="scrollbar-slim overflow-x-auto px-4 py-3">
      <table className="w-full min-w-[44rem] border-collapse text-body">
        <thead>
          <tr className="border-b border-hairline">
            <ColumnHead className="w-[16rem] px-0 pr-3">Channel</ColumnHead>
            <ColumnHead className="w-[13rem] px-0 pr-3">Watched</ColumnHead>
            <ColumnHead className="w-[10rem] px-0 pr-3">Owner</ColumnHead>
            <ColumnHead align="right" className="w-[7rem] px-0 pl-3">
              Enquiries
            </ColumnHead>
            <ColumnHead align="right" className="w-[9rem] px-0 pl-3">
              In this build
            </ColumnHead>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.channel.id} className="border-b border-hairline last:border-0">
              <td className="py-2 pr-3 align-top">
                <span className="flex items-center gap-2">
                  <SourceBadge source={row.channel.source} />
                  <span className="min-w-0">
                    <span className="block text-body text-text-primary">
                      {LEAD_SOURCE[row.channel.source].label}
                    </span>
                    <span className="block truncate text-micro text-text-muted">
                      {row.channel.handle}
                    </span>
                  </span>
                </span>
              </td>
              <td className="py-2 pr-3 align-top text-meta text-text-secondary">
                {row.channel.watchedHours}
              </td>
              <td className="py-2 pr-3 align-top text-meta text-text-secondary">
                {row.owner ? row.owner.name : TEAM_ROLE[row.channel.ownerRole]}
                <span className="block text-micro text-text-muted">
                  {TEAM_ROLE[row.channel.ownerRole]}
                </span>
              </td>
              <td
                data-numeric
                className={cn(
                  "py-2 pl-3 text-right align-top",
                  row.leadCount ? "text-text-primary" : "text-text-muted",
                )}
              >
                {row.leadCount || "none"}
              </td>
              <td className="py-2 pl-3 text-right align-top">
                <Badge intent={row.channel.reachesInbox ? "positive" : "neutral"}>
                  {row.channel.reachesInbox ? "Reaches the inbox" : "Watched by hand"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
