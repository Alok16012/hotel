import type { Metadata } from "next";
import { FollowUpQueue } from "@/components/followups/followup-queue";
import { CHASE_RULE_ID } from "@/lib/automation";
import { service } from "@/lib/service";

export const metadata: Metadata = {
  title: "Follow-ups",
  description: "Scheduled touchpoints on open quotes, plus the ones automation already handled.",
};

/**
 * The join runs on the server and the result is handed over as plain objects,
 * so the queue never imports from `data/`.
 */
export default async function FollowupsPage() {
  const api = service();
  const [rows, team, chaseMode] = await Promise.all([
    api.getFollowUpRows(),
    api.getTeam(),
    api.getAutomationMode(CHASE_RULE_ID),
  ]);

  return <FollowUpQueue rows={rows} team={team} chaseMode={chaseMode} />;
}
