import type { Metadata } from "next";
import { ExceptionWorkspace } from "@/components/exceptions/exception-workspace";
import { service } from "@/lib/service";

export const metadata: Metadata = {
  title: "Exceptions",
  description:
    "The decisions automation deliberately refused to make: below-floor discounts, VIP requests, complaints, refunds and policy overrides.",
};

export default async function ExceptionsPage() {
  const api = service();
  const [rows, team, currentUser] = await Promise.all([
    api.getExceptionRows(),
    api.getTeam(),
    api.getCurrentUser(),
  ]);

  return <ExceptionWorkspace rows={rows} team={team} currentUser={currentUser} />;
}
