"use client";

import { ColumnHead } from "@/components/common/panel";
import type { CancellationPolicy, StayPolicy } from "@/types";

/**
 * The written policy, in the form the desk quotes it (§37).
 *
 * The cancellation ladder is a table rather than a paragraph because that is
 * how it gets used: somebody has a date in front of them and needs the rung it
 * falls on. The same seed drives the standing shown on a booking, so a refund
 * quoted from this table and a refund calculated on the folio cannot disagree.
 */
export function CancellationPanel({ policy }: { policy: CancellationPolicy }) {
  return (
    <div className="px-4 py-3">
      <p className="text-meta text-text-secondary">
        Counted back from {policy.anchor}.
      </p>

      <div className="scrollbar-slim mt-2 overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-body">
          <thead>
            <tr className="border-b border-hairline">
              <ColumnHead className="w-[14rem] px-0 pr-3">Cancelled</ColumnHead>
              <ColumnHead className="w-[9rem] px-0 pr-3">Retained</ColumnHead>
              <ColumnHead className="px-0">Terms</ColumnHead>
            </tr>
          </thead>
          <tbody>
            {policy.bands.map((band) => (
              <tr key={band.id} className="border-b border-hairline last:border-0">
                <td className="py-2 pr-3 align-top text-text-primary">{band.label}</td>
                <td data-numeric className="py-2 pr-3 align-top text-text-primary">
                  {retained(band)}
                </td>
                <td className="py-2 align-top text-meta text-text-secondary">{band.terms}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 border-t border-hairline pt-2.5 text-micro text-text-muted">
        {policy.channelNote}
      </p>
    </div>
  );
}

function retained(band: CancellationPolicy["bands"][number]): string {
  if (band.chargeNights === 0) return "Nothing";
  if (band.chargeNights) {
    return band.chargeNights === 1 ? "1 night" : `${band.chargeNights} nights`;
  }
  if (band.chargeShare === 1) return "The full stay";
  if (band.chargeShare) return `${Math.round(band.chargeShare * 100)}% of the stay`;
  return "Nothing";
}

/**
 * Arrival, departure and children.
 *
 * Four sentences an owner changes once a year and a receptionist repeats four
 * times a day, so they are kept as sentences rather than reduced to fields
 * that somebody would then have to translate back into a reply.
 */
export function StayPolicyPanel({ policy }: { policy: StayPolicy }) {
  const items: { label: string; value: string }[] = [
    { label: "Check in", value: `From ${policy.checkInTime}. ${policy.earlyCheckIn}` },
    { label: "Check out", value: `By ${policy.checkOutTime}. ${policy.lateCheckOut}` },
    { label: "Children", value: policy.childPolicy },
    { label: "Extra beds", value: policy.extraBed },
    { label: "Identification", value: policy.idRequirement },
  ];

  return (
    <dl className="px-4 py-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="grid grid-cols-1 gap-x-4 border-b border-hairline py-2 last:border-0 sm:grid-cols-[8rem_1fr]"
        >
          <dt className="text-body text-text-secondary">{item.label}</dt>
          <dd className="text-body text-text-primary">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
