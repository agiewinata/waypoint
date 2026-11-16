import { redirect } from "next/navigation";
import { requireSession } from "@/server/session";
import { getProfilesForUser } from "@/server/profiles";
import { EnableListingConfirm } from "./EnableListingConfirm";
import { SiteHeader } from "@/components/ui/SiteHeader";

export const dynamic = "force-dynamic";

export default async function EnableListingPage() {
  const session = await requireSession();
  if (!session) redirect("/auth/signin");

  const { profile, renter } = await getProfilesForUser(session.user.id);

  if (!profile) redirect("/onboarding");
  if (renter) redirect("/dashboard/owner");

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <SiteHeader />
      <EnableListingConfirm />
    </div>
  );
}
