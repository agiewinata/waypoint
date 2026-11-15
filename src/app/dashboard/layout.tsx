import { redirect } from "next/navigation";
import { requireSession } from "@/server/session";

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
  return <>{children}</>;
}
