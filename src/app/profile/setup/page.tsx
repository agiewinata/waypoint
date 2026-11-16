import { redirect } from "next/navigation";
import { requireUserPage } from "@/server/authz";

export default async function ProfileSetupPage() {
  const actor = await requireUserPage();
  if (actor.profile) redirect("/account");
  redirect("/onboarding");
}
