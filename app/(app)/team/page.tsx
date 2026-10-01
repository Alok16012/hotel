import type { Metadata } from "next";
import { TeamWorkspace } from "@/components/team/team-workspace";
import { service } from "@/lib/service";

export const metadata: Metadata = {
  title: "Team",
  description: "Roles, shifts, assignment load and response performance.",
};

export default async function TeamPage() {
  return <TeamWorkspace view={await service().getTeamView()} />;
}
