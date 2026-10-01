import type { Metadata } from "next";
import { AnalyticsWorkspace } from "@/components/analytics/analytics-workspace";
import { service } from "@/lib/service";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Conversion, revenue, channel performance and staff response quality.",
};

/**
 * Both windows are computed here and handed over together.
 *
 * Switching between seven and thirty days is a reading decision, not a fetch:
 * the two views together are a few kilobytes, and computing them on the server
 * keeps the seed arrays and the derivation out of the client bundle while the
 * switch stays instant.
 */
export default async function AnalyticsPage() {
  const api = service();
  const [week, month] = await Promise.all([api.getAnalytics(7), api.getAnalytics(30)]);

  return <AnalyticsWorkspace views={{ 7: week, 30: month }} />;
}
