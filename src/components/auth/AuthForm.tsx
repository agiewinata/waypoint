"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { authClient } from "@/lib/auth-client";

interface AuthFormProps {
  mode: "signin" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const result = await authClient.signUp.email({
          name,
          email,
          password,
          callbackURL: "/dashboard",
        });
        if (result.error) {
          setError(result.error.message ?? "Sign-up failed");
        } else {
          router.push("/dashboard");
        }
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
          callbackURL: "/dashboard",
        });
        if (result.error) {
          setError(result.error.message ?? "Sign-in failed");
        } else {
          router.push("/dashboard");
        }
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
      }}
    >
      {/* Left — decorative panel */}
      <div
        className="hidden md:flex"
        style={{
          background: "var(--ink)",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 52px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid lines */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div style={{ position: "relative" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 60 }}>
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
              <rect x="6" y="2" width="8" height="8" fill="var(--accent)" />
              <polygon points="10,18 7,12 13,12" fill="var(--accent)" />
            </svg>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "#fff", letterSpacing: "-0.02em" }}>
              WAYPOINT
            </span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="kicker" style={{ color: "var(--accent)", marginBottom: 14 }}>
              Trust-first rental
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(28px, 3vw, 42px)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                color: "#fff",
                maxWidth: 360,
              }}
            >
              Every trip backed by escrow and identity checks.
            </h1>
          </motion.div>
        </div>

        {/* Bottom quote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          style={{ position: "relative" }}
        >
          <div
            style={{
              borderLeft: "3px solid var(--accent)",
              paddingLeft: 16,
              color: "rgba(255,255,255,0.65)",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            &ldquo;Rented my car out 12 times last month. Every payout arrived on time.&rdquo;
          </div>
          <div className="kicker" style={{ color: "rgba(255,255,255,0.4)", marginTop: 10 }}>
            — Dimas R., Owner · Jakarta
          </div>
        </motion.div>
      </div>

      {/* Right — form panel */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          gridColumn: "1 / -1",
        }}
        className="md:col-start-2 md:col-end-3"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: "100%", maxWidth: 420 }}
        >
          {/* Mobile logo */}
          <div className="flex md:hidden items-center gap-2 mb-8">
            <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
              <rect x="6" y="2" width="8" height="8" fill="var(--accent)" />
              <polygon points="10,18 7,12 13,12" fill="var(--accent)" />
            </svg>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--ink)", letterSpacing: "-0.02em" }}>
              WAYPOINT
            </span>
          </div>

          <div className="kicker" style={{ marginBottom: 8 }}>
            {mode === "signup" ? "Create account" : "Sign in"}
          </div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "var(--ink)",
              marginBottom: 32,
            }}
          >
            {mode === "signup" ? "Get started with Waypoint." : "Welcome back."}
          </h2>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              style={{
                background: "transparent",
                border: "1px solid var(--alert)",
                color: "var(--alert)",
                padding: "10px 14px",
                marginBottom: 20,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                letterSpacing: "0.04em",
              }}
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {mode === "signup" && (
              <div>
                <label className="field-label" htmlFor="auth-name">Full name</label>
                <input
                  id="auth-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="Budi Santoso"
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label className="field-label" htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                autoComplete={mode === "signin" ? "username" : "email"}
              />
            </div>

            <div>
              <label className="field-label" htmlFor="auth-password">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="auth-password"
                  type={showPass ? "text" : "password"}
                  required
                  minLength={10}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder={mode === "signup" ? "Min. 10 characters" : ""}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--slate)",
                    padding: 2,
                  }}
                >
                  <Icon icon={showPass ? "ph:eye-slash" : "ph:eye"} width={16} />
                </button>
              </div>
              {mode === "signin" && (
                <div style={{ marginTop: 6, textAlign: "right" }}>
                  <a
                    href="/auth/reset-password"
                    style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--slate)", letterSpacing: "0.06em" }}
                  >
                    Forgot password?
                  </a>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: "100%", marginTop: 4, height: 44 }}
            >
              {loading ? (
                <Icon icon="ph:spinner" width={16} className="animate-spin" />
              ) : mode === "signup" ? (
                "Create account"
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--slate)", letterSpacing: "0.1em" }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            className="btn btn-ghost"
            style={{ width: "100%", height: 44, gap: 10 }}
          >
            <Icon icon="logos:google-icon" width={16} />
            Continue with Google
          </button>

          {/* Switch mode */}
          <p
            style={{
              textAlign: "center",
              marginTop: 28,
              fontFamily: "var(--font-body)",
              fontSize: 13,
              color: "var(--slate)",
            }}
          >
            {mode === "signup" ? (
              <>Already have an account?{" "}
                <a href="/auth/signin" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
                  Sign in
                </a>
              </>
            ) : (
              <>Don&apos;t have an account?{" "}
                <a href="/auth/signup" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
                  Sign up
                </a>
              </>
            )}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
