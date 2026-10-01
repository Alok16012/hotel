import type { Metadata } from "next";
import { IntegrationsWorkspace } from "@/components/integrations/integrations-workspace";
import { service } from "@/lib/service";

export const metadata: Metadata = {
  title: "Integrations",
  description:
    "Channel and platform connections. Everything in this build is demo data; nothing here is connected to a live service.",
};

export default async function IntegrationsPage() {
  return <IntegrationsWorkspace view={await service().getIntegrationsView()} />;
}
