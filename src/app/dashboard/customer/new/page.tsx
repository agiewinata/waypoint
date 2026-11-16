import { redirect } from "next/navigation";
import { requireSession } from "@/server/session";
import { getProfilesForUser } from "@/server/profiles";
import { EnableRentingConfirm } from "./EnableRentingConfirm";
import { SiteHeader } from "@/components/ui/SiteHeader";

export const dynamic = "force-dynamic";

export default async function EnableRentingPage() {
  const session = await requireSession();
  if (!session) redirect("/auth/signin");

  const { profile, rentee } = await getProfilesForUser(session.user.id);

  if (!profile) redirect("/onboarding");
  if (rentee) redirect("/dashboard/customer");

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <SiteHeader />
      <EnableRentingConfirm />
    </div>
  );
}
