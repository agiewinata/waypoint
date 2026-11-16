import { redirect } from "next/navigation";
import { requireUserPage } from "@/server/authz";
import { getAccountOverview } from "@/server/profiles";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { AccountSettings } from "@/components/account/AccountSettings";

export default async function AccountPage() {
  const actor = await requireUserPage();
  if (!actor.profile && !actor.admin) redirect("/onboarding");

  const overview = await getAccountOverview(actor.user.id);
  if (!overview) redirect("/auth/signin");

  return (
    <>
      <SiteHeader />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container">
          <AccountSettings overview={overview} />
        </div>
      </main>
    </>
  );
}
