import type { Metadata } from "next";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";
import { service } from "@/lib/service";

export const metadata: Metadata = {
  title: "Settings",
  description: "Property profile, policies, automation behaviour and notification rules.",
};

export default async function SettingsPage() {
  return <SettingsWorkspace view={await service().getSettingsView()} />;
}
