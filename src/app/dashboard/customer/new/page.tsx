import { redirect } from "next/navigation";
import { requireSession } from "@/server/session";
import { getProfilesForUser, enableRenting } from "@/server/profiles";

export const dynamic = "force-dynamic";

export default async function EnableRentingPage() {
  const session = await requireSession();
  if (!session) redirect("/auth/signin");

  const { profile, rentee } = await getProfilesForUser(session.user.id);

  if (!profile) redirect("/onboarding");
  if (rentee) redirect("/dashboard/customer");

  await enableRenting(session.user.id);
  redirect("/dashboard/customer");
}
