import Link from "next/link";
import { Icon } from "@iconify/react";

export default function NotFound() {
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

      {/* 404 marker */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 96,
          fontWeight: 600,
          letterSpacing: "-0.04em",
          color: "var(--thumb)",
          lineHeight: 1,
          marginBottom: 24,
          userSelect: "none",
        }}
        aria-hidden="true"
      >
        404
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
        Page not found
      </h1>

      <p
        style={{
          fontSize: 15,
          color: "var(--slate)",
          lineHeight: 1.6,
          maxWidth: 380,
          marginBottom: 36,
        }}
      >
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Check the URL or head back to browse vehicles.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          href="/"
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
            textDecoration: "none",
            border: "1px solid var(--ink)",
          }}
        >
          <Icon icon="ph:house" width={14} aria-hidden="true" />
          Browse vehicles
        </Link>
        <Link
          href="/dashboard/customer"
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
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
