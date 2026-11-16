"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EnableRentingConfirm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnable() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/enable-renting", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: window.location.origin },
      });
      if (res.ok) {
        router.push("/dashboard/customer");
      } else {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? "Failed to enable renting");
        setLoading(false);
      }
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: 480, width: "100%" }}>
        <div className="kicker" style={{ marginBottom: 8 }}>
          Customer capability
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "var(--ink)",
            marginBottom: 16,
          }}
        >
          Enable vehicle renting
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 15,
            color: "var(--slate)",
            lineHeight: 1.6,
            marginBottom: 32,
          }}
        >
          This will activate the Customer dashboard so you can browse and book
          vehicles. Your profile details will be used for all bookings.
        </p>

        {error && (
          <div
            style={{
              border: "1px solid var(--alert)",
              color: "var(--alert)",
              padding: "10px 14px",
              marginBottom: 24,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.04em",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handleEnable}
            disabled={loading}
            className="btn btn-primary"
            style={{ flex: 1, height: 44 }}
          >
            {loading ? "Enabling…" : "Enable renting"}
          </button>
          <a
            href="/dashboard"
            className="btn btn-ghost"
            style={{ flex: 1, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            Cancel
          </a>
        </div>
      </div>
    </div>
  );
}
