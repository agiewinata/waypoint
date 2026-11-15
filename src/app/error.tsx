"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--font-display)",
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: "-0.025em",
          color: "var(--ink)",
          marginBottom: 48,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <rect x="1" y="1" width="20" height="20" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="11" cy="11" r="3" fill="currentColor"/>
          <line x1="11" y1="1" x2="11" y2="8" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
        Waypoint
      </div>

      {/* Error icon */}
      <div
        style={{
          width: 64,
          height: 64,
          border: "1px solid var(--alert)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
        aria-hidden="true"
      >
        <Icon icon="ph:warning" width={28} style={{ color: "var(--alert)" }} />
      </div>

      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: "-0.025em",
          color: "var(--ink)",
          marginBottom: 12,
        }}
      >
        Something went wrong
      </h1>

      <p
        style={{
          fontSize: 15,
          color: "var(--slate)",
          lineHeight: 1.6,
          maxWidth: 380,
          marginBottom: 12,
        }}
      >
        An unexpected error occurred. We&apos;ve been notified and are looking into it.
      </p>

      {error.digest && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.08em",
            color: "var(--done)",
            marginBottom: 32,
          }}
        >
          Error ID: {error.digest}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={reset}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 44,
            padding: "0 20px",
            background: "var(--ink)",
            color: "var(--paper)",
            fontFamily: "var(--font-body)",
            fontSize: 14,
            fontWeight: 500,
            border: "1px solid var(--ink)",
            cursor: "pointer",
          }}
        >
          <Icon icon="ph:arrow-clockwise" width={14} aria-hidden="true" />
          Try again
        </button>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 44,
            padding: "0 20px",
            background: "transparent",
            color: "var(--ink)",
            fontFamily: "var(--font-body)",
            fontSize: 14,
            fontWeight: 500,
            textDecoration: "none",
            border: "1px solid var(--line)",
          }}
        >
          <Icon icon="ph:house" width={14} aria-hidden="true" />
          Go home
        </Link>
      </div>
    </div>
  );
}
