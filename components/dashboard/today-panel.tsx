import { Panel, PanelLink } from "@/components/common/panel";
import { SourceBadge } from "@/components/common/source-badge";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Booking, Guest } from "@/types";

/**
 * The front desk's version of today: who is coming, who is leaving, who is
 * already here (§9).
 *
 * Counts first, then the arrivals themselves, because an arrival is the one
 * item on this list with something still to prepare. Departures and in-house
 * are numbers the desk needs but rarely acts on before noon.
 */
export function TodayPanel({
  arrivals,
  departures,
  inHouse,
  guestById,
}: {
  arrivals: Booking[];
  departures: Booking[];
  inHouse: Booking[];
  guestById: Record<string, Guest | undefined>;
}) {
  const unpaidArrivals = arrivals.filter((b) => b.total > b.amountPaid);

  return (
    <Panel
      title="Today at the property"
      /* Not the occupancy line: the KPI strip already carries it, and a number
         printed twice on one screen is read as two numbers. */
      description="Who is expected at the desk, and what is still to collect from them."
      footer={<PanelLink href="/bookings">See every reservation</PanelLink>}
    >
      <div className="grid grid-cols-3 divide-x divide-hairline border-b border-hairline">
        <Count label="Arriving" value={arrivals.length} tone="accent" />
        <Count label="Departing" value={departures.length} />
        <Count label="In house" value={inHouse.length} />
      </div>

      <ul className="divide-y divide-hairline">
        {arrivals.map((booking) => {
          const guest = guestById[booking.guestId];
          const balance = booking.total - booking.amountPaid;
          const isVip = guest?.segments.includes("vip");

          return (
            <li key={booking.id} className="flex items-start gap-2.5 px-4 py-2.5">
              <SourceBadge source={booking.source} className="mt-0.5" />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-body font-medium text-text-primary">
                    {guest?.name ?? "Guest"}
                  </p>
                  {isVip ? <StatusBadge kind="segment" value="vip" /> : null}
                  {guest?.segments.includes("returning") && !isVip ? (
                    <Badge intent="accent">Returning</Badge>
                  ) : null}
                </div>
                <p data-numeric className="mt-0.5 text-meta text-text-muted">
                  {booking.roomNumbers.join(", ")} · {booking.nights}{" "}
                  {booking.nights === 1 ? "night" : "nights"} · {booking.adults}{" "}
                  {booking.adults === 1 ? "adult" : "adults"}
                  {booking.children ? ` + ${booking.children}` : ""}
                </p>
                {booking.specialRequests.length > 0 ? (
                  <p className="mt-0.5 truncate text-meta text-text-secondary">
                    {booking.specialRequests.join(" · ")}
                  </p>
                ) : null}
              </div>

              <div className="shrink-0 text-right">
                <p data-numeric className="text-meta font-medium text-text-primary">
                  {formatINR(booking.total)}
                </p>
                {balance > 0 ? (
                  <p data-numeric className="text-micro font-medium text-caution-700">
                    {formatINR(balance)} due
                  </p>
                ) : (
                  <p className="text-micro text-positive-700">Settled</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {unpaidArrivals.length > 0 ? (
        <p className="border-t border-hairline bg-caution-100/40 px-4 py-2 text-meta text-caution-700">
          {unpaidArrivals.length} of today&rsquo;s arrivals still owe a balance at check-in.
        </p>
      ) : null}
    </Panel>
  );
}

function Count({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "accent";
}) {
  return (
    <div className="px-4 py-2.5">
      <p
        data-numeric
        className={cn(
          "text-page font-semibold leading-none",
          tone === "accent" ? "text-accent-700" : "text-text-primary",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-meta text-text-muted">{label}</p>
    </div>
  );
}
