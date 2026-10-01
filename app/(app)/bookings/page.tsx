import type { Metadata } from "next";
import { BookingsWorkspace } from "@/components/bookings/bookings-workspace";
import { dayBookRange, service } from "@/lib/service";

export const metadata: Metadata = {
  title: "Bookings",
  description: "Confirmed reservations, arrivals, departures and payment state.",
};

/**
 * The join runs on the server; the workspace owns the filter state, the day the
 * day book is pointed at, and which reservation is open. The policy is handed
 * down rather than imported by the client, so the drawer and a future settings
 * screen are reading the same document.
 */
export default async function BookingsPage() {
  const api = service();
  const [rows, policy] = await Promise.all([api.getBookingRows(), api.getCancellationPolicy()]);

  return <BookingsWorkspace rows={rows} policy={policy} range={dayBookRange(rows)} />;
}
