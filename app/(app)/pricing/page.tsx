import type { Metadata } from "next";
import { PricingWorkspace } from "@/components/pricing/pricing-workspace";
import { service } from "@/lib/service";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Rate cards, seasonal rules, discount limits and the floor below which a human must approve.",
};

/**
 * Rates and discount policy (§19).
 *
 * The rate card is derived on the server from the same occupancy figures the
 * availability matrix uses, so a soft Tuesday prices as a soft Tuesday on both
 * screens. The rules arrive as data and are edited client side as a draft.
 */
export default async function PricingPage() {
  const api = service();
  const [calendar, roomTypes, rules, authority, team, currentUser] = await Promise.all([
    api.getRateCalendar(),
    api.getRoomTypes(),
    api.getPricingRules(),
    api.getDiscountAuthority(),
    api.getTeam(),
    api.getCurrentUser(),
  ]);

  return (
    <PricingWorkspace
      dates={calendar.dates}
      rows={calendar.rows}
      occupancy={calendar.occupancy}
      roomTypes={roomTypes}
      rules={rules}
      authority={authority}
      team={team}
      currentUser={currentUser}
    />
  );
}
