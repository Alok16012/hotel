import type { Metadata } from "next";
import { GuestDirectory } from "@/components/guests/guest-directory";
import { service, summariseDirectory } from "@/lib/service";

export const metadata: Metadata = {
  title: "Guests",
  description: "Guest profiles, stay history, preferences and lifetime value.",
};

/**
 * The join and the arithmetic run on the server; the directory receives plain
 * objects and owns only the filter state.
 */
export default async function GuestsPage() {
  const rows = await service().getGuestRows();
  return <GuestDirectory rows={rows} summary={summariseDirectory(rows)} />;
}
