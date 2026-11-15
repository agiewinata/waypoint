"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 800));
    setSent(true);
    setLoading(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: "100%", maxWidth: 420 }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 48, textDecoration: "none" }}>
          <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
            <rect x="6" y="2" width="8" height="8" fill="var(--accent)" />
            <polygon points="10,18 7,12 13,12" fill="var(--accent)" />
          </svg>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--ink)", letterSpacing: "-0.02em" }}>
            WAYPOINT
          </span>
        </Link>

        {!sent ? (
          <>
            <div className="kicker" style={{ marginBottom: 8 }}>Password reset</div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: "var(--ink)",
                marginBottom: 12,
              }}
            >
              Reset your password.
            </h1>
            <p style={{ color: "var(--slate)", fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
              Enter your email and we&apos;ll send a reset link. Check your inbox in a few minutes.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="field-label" htmlFor="reset-email">Email address</label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: "100%", height: 44 }}
              >
                {loading ? <Icon icon="ph:spinner" width={16} className="animate-spin" /> : "Send reset link"}
              </button>
            </form>

            <p style={{ textAlign: "center", marginTop: 24, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--slate)" }}>
              <Link href="/auth/signin" style={{ color: "var(--accent)", textDecoration: "none" }}>
                ← Back to sign in
              </Link>
            </p>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
            <div
              style={{
                border: "1px solid var(--ok)",
                padding: "32px 28px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  border: "1px solid var(--ok)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon icon="ph:envelope-open" width={24} style={{ color: "var(--ok)" }} />
              </div>
              <div>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "var(--ink)",
                    marginBottom: 8,
                  }}
                >
                  Check your inbox
                </h2>
                <p style={{ color: "var(--slate)", fontSize: 14, lineHeight: 1.6 }}>
                  We sent a reset link to <strong style={{ color: "var(--ink)" }}>{email}</strong>. Valid for 30 minutes.
                </p>
              </div>
              <Link href="/auth/signin" className="btn btn-ghost" style={{ marginTop: 8 }}>
                Back to sign in
              </Link>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
