import { redirect } from "next/navigation";
import { requireSession } from "@/server/session";
import { getProfilesForUser, enableListing } from "@/server/profiles";

export const dynamic = "force-dynamic";

export default async function EnableListingPage() {
  const session = await requireSession();
  if (!session) redirect("/auth/signin");

  const { profile, renter } = await getProfilesForUser(session.user.id);

  if (!profile) redirect("/onboarding");
  if (renter) redirect("/dashboard/owner");

  await enableListing(session.user.id);
  redirect("/dashboard/owner");
}
