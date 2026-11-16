"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

interface SignOutButtonProps {
  variant?: "default" | "ghost";
}

export function SignOutButton({ variant = "ghost" }: SignOutButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setPending(true);
    setError(null);
    const { error } = await authClient.signOut();
    if (error) {
      setError(error.message ?? "Could not sign out. Please try again.");
      setPending(false);
      return;
    }
    router.replace("/auth/signin");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={handleSignOut}
        disabled={pending}
        className={variant === "default" ? "btn btn-primary" : "btn btn-ghost"}
        style={{ padding: "6px 14px", fontSize: 10 }}
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {error && (
        <span role="alert" style={{ fontSize: 11, color: "var(--alert)", marginLeft: 8 }}>
          {error}
        </span>
      )}
    </>
  );
}
