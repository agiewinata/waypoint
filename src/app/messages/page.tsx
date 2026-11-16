import Link from "next/link";
import { Icon } from "@iconify/react";
import { SiteHeader } from "@/components/ui/SiteHeader";

const LINKS = [
  { href: "/dashboard/customer", label: "Your trips", icon: "ph:car" },
  { href: "/dashboard/owner", label: "Your bookings", icon: "ph:calendar" },
  { href: "/notifications", label: "Notifications", icon: "ph:bell" },
];

export default function MessagesPage() {
  return (
    <>
      <SiteHeader />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container" style={{ maxWidth: 680 }}>
          <div className="card" style={{ padding: 28 }}>
            <span className="kicker" style={{ marginBottom: 8, display: "block" }}>Messages</span>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--ink)",
                marginBottom: 8,
              }}
            >
              Messaging isn&apos;t available yet
            </h1>
            <p style={{ fontSize: 14, color: "var(--slate)", lineHeight: 1.6, marginBottom: 24 }}>
              Follow up on your bookings and updates from these pages in the meantime.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="btn btn-ghost"
                  style={{ justifyContent: "space-between", height: 44 }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon icon={l.icon} width={16} aria-hidden="true" />
                    {l.label}
                  </span>
                  <Icon icon="ph:arrow-right" width={14} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
