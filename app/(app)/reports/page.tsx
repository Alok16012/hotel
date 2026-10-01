import type { Metadata } from "next";
import { ReportsWorkspace } from "@/components/reports/reports-workspace";
import { service } from "@/lib/service";

export const metadata: Metadata = {
  title: "Reports",
  description: "Standing operational and commercial reports, and scheduled delivery.",
};

export default async function ReportsPage() {
  return <ReportsWorkspace view={await service().getReportsView()} />;
}
