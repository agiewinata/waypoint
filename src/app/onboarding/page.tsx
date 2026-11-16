import { redirect } from "next/navigation";
import { requireSession } from "@/server/session";
import { getProfilesForUser } from "@/server/profiles";
import { OnboardingForm } from "@/components/profile/OnboardingForm";
import { SiteHeader } from "@/components/ui/SiteHeader";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await requireSession();
  if (!session) redirect("/auth/signin");

  const { profile } = await getProfilesForUser(session.user.id);
  if (profile) redirect("/dashboard");

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <SiteHeader />
      <OnboardingForm defaultName={session.user.name} />
    </div>
  );
}
