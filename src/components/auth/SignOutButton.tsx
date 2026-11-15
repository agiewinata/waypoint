"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

interface SignOutButtonProps {
  variant?: "default" | "ghost";
}

export function SignOutButton({ variant = "ghost" }: SignOutButtonProps) {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/auth/signin");
  }

  return (
    <button
      onClick={handleSignOut}
      className={variant === "default" ? "btn btn-primary" : "btn btn-ghost"}
      style={{ padding: "6px 14px", fontSize: 10 }}
    >
      Sign out
    </button>
  );
}
