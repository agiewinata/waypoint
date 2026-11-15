import { Header } from "@/components/ui/Header";
import { SideNav } from "@/components/ui/SideNav";
import { StatusTag } from "@/components/ui/StatusTag";
import { FadeIn } from "@/components/ui/AnimatedText";
import { Icon } from "@iconify/react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const NAV_ITEMS = [
  { label: "My Trips",     href: "/dashboard/customer",          icon: "ph:car" },
  { label: "Verification", href: "/dashboard/customer/verify",   icon: "ph:identification-card", badge: 1 },
  { label: "Messages",     href: "/messages",                     icon: "ph:chat-dots" },
  { label: "Notifications",href: "/notifications",                icon: "ph:bell" },
  { label: "Account",      href: "/account",                      icon: "ph:user" },
];

const TRIPS = [
  { id: "BK-1182", vehicle: "2022 Toyota Avanza", city: "Jakarta", start: "2026-11-10", end: "2026-11-13", days: 3, total: 960000, status: "Active"    },
  { id: "BK-1051", vehicle: "2021 Mitsubishi Xpander", city: "Surabaya", start: "2026-10-20", end: "2026-10-23", days: 3, total: 1140000, status: "Completed" },
  { id: "BK-0988", vehicle: "2023 Honda Brio", city: "Bandung", start: "2026-09-14", end: "2026-09-16", days: 2, total: 500000, status: "Completed" },
  { id: "BK-0901", vehicle: "2022 Daihatsu Rocky", city: "Jakarta", start: "2026-08-05", end: "2026-08-07", days: 2, total: 840000, status: "Cancelled"  },
];

function formatIDR(n: number) {
  return `RP ${n.toLocaleString("id-ID")}`;
}

export default function CustomerDashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const verificationStatus = ("Pending" as any) as "Pending" | "Verified" | "Rejected";

  return (
    <>
      <Header userName="Andi Pratama" userInitials="AP" notifCount={2} />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container">
          <div className="dashboard-layout">
            {/* Sidebar */}
            <div className="dashboard-sidebar">
              <SideNav
                items={NAV_ITEMS}
                userName="Andi Pratama"
                userRole="Customer"
                userInitials="AP"
                keyFigure={formatIDR(2600000)}
                keyFigureLabel="Total spent"
                switchRoleHref="/dashboard/owner"
              />
            </div>

            {/* Content */}
            <div className="dashboard-content">
              {/* Page header */}
              <div
                style={{
                  borderBottom: "1px solid var(--ink)",
                  paddingBottom: 16,
                  marginBottom: 28,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <span className="kicker" style={{ marginBottom: 6, display: "block" }}>Customer dashboard</span>
                  <h1
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 28,
                      fontWeight: 700,
                      letterSpacing: "-0.025em",
                      color: "var(--ink)",
                    }}
                  >
                    My trips
                  </h1>
                </div>
                <Link href="/" className="btn btn-primary" style={{ fontSize: 11 }}>
                  <Icon icon="ph:plus" width={14} aria-hidden="true" />
                  Book a car
                </Link>
              </div>

              {/* Verification banner */}
              {verificationStatus !== "Verified" && (
                <FadeIn>
                  <div
                    style={{
                      border: "1px solid var(--wait)",
                      padding: "14px 18px",
                      marginBottom: 24,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Icon icon="ph:warning" width={18} style={{ color: "var(--wait)", flexShrink: 0 }} aria-hidden="true" />
                      <div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--wait)" }}>
                          Identity unverified
                        </div>
                        <div style={{ fontSize: 13, color: "var(--slate)", marginTop: 3 }}>
                          Upload your KTP + SIM to unlock payment and confirm bookings.
                        </div>
                      </div>
                    </div>
                    <Link href="/dashboard/customer/verify" className="btn btn-ghost" style={{ fontSize: 11, flexShrink: 0 }}>
                      Verify now
                    </Link>
                  </div>
                </FadeIn>
              )}

              {/* Summary KPI row */}
              <FadeIn delay={0.1}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(140px,100%), 1fr))",
                    border: "1px solid var(--line)",
                    marginBottom: 28,
                  }}
                >
                  {[
                    { label: "Total trips",   value: "4",              mono: false },
                    { label: "Active now",    value: "1",              mono: false },
                    { label: "Total spent",   value: "RP 2.600.000",   mono: true  },
                    { label: "Verification",  value: verificationStatus, mono: true },
                  ].map((kpi, i) => (
                    <div
                      key={kpi.label}
                      style={{
                        padding: "16px 18px",
                        borderRight: i < 3 ? "1px solid var(--line)" : "none",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: kpi.mono ? "var(--font-mono)" : "var(--font-display)",
                          fontSize: kpi.mono ? 14 : 22,
                          fontWeight: 600,
                          color: "var(--ink)",
                        }}
                      >
                        {kpi.value}
                      </div>
                      <div className="kicker" style={{ marginTop: 4 }}>{kpi.label}</div>
                    </div>
                  ))}
                </div>
              </FadeIn>

              {/* Trip list */}
              <div style={{ border: "1px solid var(--line)" }}>
                {/* Table header */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 2fr 100px 120px 100px",
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--ink)",
                    background: "var(--ink)",
                  }}
                >
                  {["Booking ID", "Vehicle", "Dates", "Total", "Status"].map((h) => (
                    <span
                      key={h}
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.7)",
                      }}
                    >
                      {h}
                    </span>
                  ))}
                </div>

                {TRIPS.map((trip, i) => (
                  <Link
                    key={trip.id}
                    href={`/trips/${trip.id}`}
                    className="row-hover"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 2fr 100px 120px 100px",
                      padding: "14px 16px",
                      borderBottom: i < TRIPS.length - 1 ? "1px solid var(--line)" : "none",
                      textDecoration: "none",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        color: "var(--accent)",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {trip.id}
                    </span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{trip.vehicle}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                        <Icon icon="ph:map-pin" width={11} style={{ color: "var(--slate)" }} aria-hidden="true" />
                        <span className="kicker">{trip.city}</span>
                      </div>
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--slate)" }}>
                      {trip.start}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink)", fontWeight: 600 }}>
                      {formatIDR(trip.total)}
                    </span>
                    <StatusTag status={trip.status} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
