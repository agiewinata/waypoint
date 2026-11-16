import { redirect } from "next/navigation";
import { requireUserPage } from "@/server/authz";
import { EnableRoleConfirm } from "@/components/profile/EnableRoleConfirm";
import { SiteHeader } from "@/components/ui/SiteHeader";

export const dynamic = "force-dynamic";

export default async function EnableRentingPage() {
  const actor = await requireUserPage();

  if (!actor.profile) redirect("/onboarding");
  if (actor.rentee) redirect("/dashboard/customer");

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <SiteHeader />
      <EnableRoleConfirm
        endpoint="/api/profile/enable-renting"
        redirectTo="/dashboard/customer"
        kicker="Customer capability"
        title="Enable vehicle renting"
        description="This will activate the Customer dashboard so you can browse and book vehicles. Your profile details will be used for all bookings."
        buttonLabel="Enable renting"
      />
    </div>
  );
}
