import Link from "next/link";
import { Icon } from "@iconify/react";

export const dynamic = "force-dynamic";

const ROLES = [
  {
    href: "/dashboard/customer",
    icon: "ph:user",
    label: "Customer",
    desc: "View trips, bookings, and verification.",
  },
  {
    href: "/dashboard/owner",
    icon: "ph:car",
    label: "Owner",
    desc: "Manage listings, earnings, and requests.",
  },
  {
    href: "/dashboard/admin",
    icon: "ph:shield-star",
    label: "Admin",
    desc: "Verifications, approvals, and disputes.",
  },
];

export default function DashboardPage() {
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
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: "-0.025em",
          color: "var(--ink)",
          marginBottom: 48,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <rect x="1" y="1" width="20" height="20" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="11" cy="11" r="3" fill="currentColor"/>
          <line x1="11" y1="1" x2="11" y2="8" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
        Waypoint
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
        Choose your dashboard
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
        Select the view you&apos;d like to open. You can switch between roles anytime.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(200px,100%), 1fr))",
          gap: 16,
          width: "100%",
          maxWidth: 540,
          marginBottom: 24,
        }}
      >
        {ROLES.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="card-hover"
            style={{
              padding: "24px 20px",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <Icon icon={r.icon} width={24} style={{ color: "var(--ink)" }} aria-hidden="true" />
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--ink)",
                  marginBottom: 4,
                }}
              >
                {r.label}
              </div>
              <div style={{ fontSize: 12, color: "var(--slate)", lineHeight: 1.5 }}>
                {r.desc}
              </div>
            </div>
            <Icon icon="ph:arrow-right" width={14} style={{ color: "var(--slate)", marginTop: "auto" }} aria-hidden="true" />
          </Link>
        ))}
      </div>

      <Link
        href="/"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--slate)",
          letterSpacing: "0.07em",
          textDecoration: "none",
        }}
      >
        ← Back to browse
      </Link>
    </div>
  );
}
