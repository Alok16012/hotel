import type { Metadata } from "next";
import { AvailabilityWorkspace } from "@/components/availability/availability-workspace";
import { service } from "@/lib/service";

export const metadata: Metadata = {
  title: "Availability",
  description: "Room inventory across dates and categories, and the live state of the floor.",
};

/**
 * Inventory (§18).
 *
 * The matrix and the floor map are derived on the server from the same ledger,
 * so the house occupancy on this screen and the occupancy KPI on the Command
 * Center are one calculation, not two that happen to agree.
 */
export default async function AvailabilityPage() {
  const api = service();
  const [matrix, map, blocks, team, currentUser] = await Promise.all([
    api.getInventoryMatrix(),
    api.getFloorMap(),
    api.getInventoryBlocks(),
    api.getTeam(),
    api.getCurrentUser(),
  ]);

  return (
    <AvailabilityWorkspace
      matrix={matrix}
      map={map}
      blocks={blocks}
      team={team}
      currentUserId={currentUser.id}
    />
  );
}
