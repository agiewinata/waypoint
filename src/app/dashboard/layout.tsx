import { redirect } from "next/navigation";
import { requireSession } from "@/server/session";
import { getProfilesForUser } from "@/server/profiles";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  if (!session) {
    redirect("/auth/signin");
  }

  // Send new users to onboarding before they can use the dashboard
  const { profile, admin } = await getProfilesForUser(session.user.id);
  if (!profile && !admin) {
    redirect("/onboarding");
  }

  return <>{children}</>;
}
