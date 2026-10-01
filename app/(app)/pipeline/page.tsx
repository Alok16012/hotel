import type { Metadata } from "next";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { service } from "@/lib/service";

export const metadata: Metadata = {
  title: "Pipeline",
  description:
    "Every enquiry by stage, with column value, average age and how far the book has travelled.",
};

/**
 * The deal board (§15).
 *
 * A server component that does nothing but hand the board finished view
 * models, the same contract the lead workspace uses.
 */
export default async function PipelinePage() {
  const api = service();
  const [rows, team] = await Promise.all([api.getLeadRows(), api.getTeam()]);

  return <PipelineBoard rows={rows} team={team} />;
}
