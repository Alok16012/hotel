import type { Metadata } from "next";
import { LeadWorkspace } from "@/components/leads/lead-workspace";
import { service } from "@/lib/service";

export const metadata: Metadata = {
  title: "Leads",
  description:
    "Every enquiry from WhatsApp, the website, OTAs, phone, email, Instagram and walk-ins in one queue.",
};

/**
 * The lead workspace (§10-§14).
 *
 * The page is a server component whose only job is to hand the client
 * workspace finished view models. Nothing below this line touches `data/`.
 */
export default async function LeadsPage() {
  const api = service();
  const [rows, details, team, currentUser, hotel] = await Promise.all([
    api.getLeadRows(),
    api.getLeadDetails(),
    api.getTeam(),
    api.getCurrentUser(),
    api.getHotel(),
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* The workspace is a two pane tool, not a document, so the page title
          lives in the breadcrumb and the screen reader heading rather than
          spending a band of vertical space above the queue. */}
      <h1 className="sr-only">Lead inbox</h1>
      <LeadWorkspace
        rows={rows}
        details={details}
        team={team}
        currentUser={currentUser}
        hotel={hotel}
      />
    </div>
  );
}
