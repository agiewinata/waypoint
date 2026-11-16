import { redirect } from "next/navigation";
import { requireUserPage } from "@/server/authz";
import { EnableRoleConfirm } from "@/components/profile/EnableRoleConfirm";
import { SiteHeader } from "@/components/ui/SiteHeader";

export const dynamic = "force-dynamic";

export default async function EnableListingPage() {
  const actor = await requireUserPage();

  if (!actor.profile) redirect("/onboarding");
  if (actor.renter) redirect("/dashboard/owner");

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <SiteHeader />
      <EnableRoleConfirm
        endpoint="/api/profile/enable-listing"
        redirectTo="/dashboard/owner"
        kicker="Owner capability"
        title="Enable vehicle listing"
        description="This will activate the Owner dashboard so you can list your vehicles for rent. Your profile details will be used for all listings."
        buttonLabel="Enable listing"
      />
    </div>
  );
}
