"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FieldErrors {
  name?: string[];
  phone?: string[];
  address?: string[];
}

export function OnboardingForm({ defaultName }: { defaultName?: string }) {
  const router = useRouter();
  const [name, setName] = useState(defaultName ?? "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setGlobalError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, address }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/dashboard");
        return;
      }

      if (res.status === 400 && data.fields) {
        setFieldErrors(data.fields);
        return;
      }

      setGlobalError(data.error ?? "Something went wrong");
    } catch {
      setGlobalError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--paper)",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "36px 32px",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            marginBottom: 6,
          }}
        >
          Set up your account
        </h1>
        <p style={{ fontSize: 13, color: "var(--slate)", marginBottom: 28 }}>
          Just a few details — you&apos;ll be able to list cars or rent them from your dashboard.
        </p>

        {globalError && (
          <div
            style={{
              background: "var(--alert-bg, #fef2f2)",
              border: "1px solid var(--alert, #ef4444)",
              color: "var(--alert, #dc2626)",
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 20,
            }}
          >
            {globalError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {(
            [
              { label: "Full name", value: name, setter: setName, type: "text", key: "name" as const },
              { label: "Phone number", value: phone, setter: setPhone, type: "tel", key: "phone" as const },
              { label: "Address", value: address, setter: setAddress, type: "text", key: "address" as const },
            ] as const
          ).map(({ label, value, setter, type: inputType, key }) => (
            <div key={key}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--ink)",
                  marginBottom: 6,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </label>
              <input
                type={inputType}
                value={value}
                onChange={(e) => setter(e.target.value)}
                style={{
                  width: "100%",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "9px 12px",
                  fontSize: 14,
                  color: "var(--ink)",
                  background: "var(--paper)",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
              {fieldErrors[key]?.map((msg) => (
                <p key={msg} style={{ color: "var(--alert, #dc2626)", fontSize: 12, marginTop: 4 }}>
                  {msg}
                </p>
              ))}
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 0",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              width: "100%",
            }}
          >
            {loading ? "Saving…" : "Continue to dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
