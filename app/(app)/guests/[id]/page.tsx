import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuestProfileView } from "@/components/guests/guest-profile";
import { service } from "@/lib/service";

/**
 * `params` is a Promise in this version of Next, so both the page and the
 * metadata await it. The profile is assembled on the server and handed down as
 * plain objects, which is what keeps the guest screen free of any import from
 * `data/`.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await service().getGuestProfile(id);

  if (!profile) {
    return { title: "Guest not found" };
  }

  return {
    title: profile.guest.name,
    description: `Stay history, preferences, complaints and lifetime value for ${profile.guest.name}.`,
  };
}

export default async function GuestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await service().getGuestProfile(id);

  if (!profile) notFound();

  return <GuestProfileView profile={profile} />;
}
