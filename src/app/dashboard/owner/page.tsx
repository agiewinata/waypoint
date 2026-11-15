import { Header } from "@/components/ui/Header";
import { SideNav } from "@/components/ui/SideNav";
import { StatusTag } from "@/components/ui/StatusTag";
import { FadeIn } from "@/components/ui/AnimatedText";
import { Icon } from "@iconify/react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const NAV_ITEMS = [
  { label: "Overview",   href: "/dashboard/owner",           icon: "ph:squares-four" },
  { label: "My Cars",    href: "/dashboard/owner/cars",       icon: "ph:car" },
  { label: "Requests",   href: "/dashboard/owner/bookings",   icon: "ph:clipboard-text", badge: 2 },
  { label: "Tracking",   href: "/dashboard/owner/tracking",   icon: "ph:map-pin" },
  { label: "Earnings",   href: "/dashboard/owner/earnings",   icon: "ph:currency-circle-dollar" },
  { label: "Messages",   href: "/messages",                   icon: "ph:chat-dots" },
  { label: "Account",    href: "/account",                    icon: "ph:user" },
];

const BOOKINGS = [
  { id: "BK-1200", vehicle: "WP-7731 Avanza", customer: "Andi P.", dates: "15–18 Nov", total: 960000,  status: "Pending"  },
  { id: "BK-1182", vehicle: "WP-7731 Avanza", customer: "Rudi S.", dates: "10–13 Nov", total: 960000,  status: "Active"   },
  { id: "BK-1051", vehicle: "WP-7735 HR-V",   customer: "Maya L.", dates: "20–23 Oct", total: 1350000, status: "Completed"},
];

const CARS = [
  { code: "WP-7731", name: "2022 Toyota Avanza", status: "Approved", trips: 12, price: 320000 },
  { code: "WP-7735", name: "2023 Honda HR-V",    status: "Approved", trips: 8,  price: 450000 },
  { code: "WP-7740", name: "2021 Daihatsu Terios", status: "Pending", trips: 0, price: 350000 },
];

function formatIDR(n: number) {
  return `RP ${n.toLocaleString("id-ID")}`;
}

export default function OwnerDashboardPage() {
  return (
    <>
      <Header userName="Dimas Raharjo" userInitials="DR" notifCount={2} />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container">
          <div className="dashboard-layout">
            <div className="dashboard-sidebar">
              <SideNav
                items={NAV_ITEMS}
                userName="Dimas Raharjo"
                userRole="Owner"
                userInitials="DR"
                keyFigure={formatIDR(2736000)}
                keyFigureLabel="Total earned"
                switchRoleHref="/dashboard/customer"
              />
            </div>

            <div className="dashboard-content">
              {/* Header */}
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
                  <span className="kicker" style={{ marginBottom: 6, display: "block" }}>Owner dashboard</span>
                  <h1
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 28,
                      fontWeight: 700,
                      letterSpacing: "-0.025em",
                      color: "var(--ink)",
                    }}
                  >
                    Overview
                  </h1>
                </div>
                <Link href="/dashboard/owner/list" className="btn btn-primary" style={{ fontSize: 11 }}>
                  <Icon icon="ph:plus" width={14} aria-hidden="true" />
                  List a car
                </Link>
              </div>

              {/* KPI row */}
              <FadeIn>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(130px,100%), 1fr))",
                    border: "1px solid var(--line)",
                    marginBottom: 32,
                  }}
                >
                  {[
                    { label: "Active listings", value: "3",           mono: false },
                    { label: "Pending requests", value: "2",          mono: false },
                    { label: "Active trips",     value: "1",          mono: false },
                    { label: "Total earned",     value: "RP 2.736.000", mono: true },
                    { label: "Escrow held",      value: "RP 960.000",   mono: true },
                  ].map((kpi, i) => (
                    <div
                      key={kpi.label}
                      style={{
                        padding: "16px 16px",
                        borderRight: i < 4 ? "1px solid var(--line)" : "none",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: kpi.mono ? "var(--font-mono)" : "var(--font-display)",
                          fontSize: kpi.mono ? 13 : 24,
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

              {/* Recent booking requests */}
              <FadeIn delay={0.1}>
                <div style={{ marginBottom: 36 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 12,
                    }}
                  >
                    <h2
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 18,
                        fontWeight: 700,
                        letterSpacing: "-0.02em",
                        color: "var(--ink)",
                      }}
                    >
                      Booking requests
                    </h2>
                    <Link href="/dashboard/owner/bookings" className="kicker" style={{ color: "var(--accent)", textDecoration: "none" }}>
                      View all →
                    </Link>
                  </div>

                  <div style={{ border: "1px solid var(--line)" }}>
                    {/* Header */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr 100px 100px",
                        padding: "10px 16px",
                        borderBottom: "1px solid var(--ink)",
                        background: "var(--ink)",
                      }}
                    >
                      {["ID", "Vehicle", "Customer", "Total", "Status"].map((h) => (
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
                    {BOOKINGS.map((b, i) => (
                      <Link
                        key={b.id}
                        href={`/dashboard/owner/bookings/${b.id}`}
                        className="row-hover"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr 100px 100px",
                          padding: "14px 16px",
                          borderBottom: i < BOOKINGS.length - 1 ? "1px solid var(--line)" : "none",
                          textDecoration: "none",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)", letterSpacing: "0.06em" }}>{b.id}</span>
                        <span style={{ fontSize: 13, color: "var(--slate)" }}>{b.vehicle}</span>
                        <span style={{ fontSize: 13, color: "var(--ink)" }}>{b.customer}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{formatIDR(b.total)}</span>
                        <StatusTag status={b.status} />
                      </Link>
                    ))}
                  </div>
                </div>
              </FadeIn>

              {/* My cars */}
              <FadeIn delay={0.15}>
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 12,
                    }}
                  >
                    <h2
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 18,
                        fontWeight: 700,
                        letterSpacing: "-0.02em",
                        color: "var(--ink)",
                      }}
                    >
                      My listings
                    </h2>
                    <Link href="/dashboard/owner/cars" className="kicker" style={{ color: "var(--accent)", textDecoration: "none" }}>
                      Manage →
                    </Link>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(min(200px,100%), 1fr))",
                      gap: 1,
                      background: "var(--line)",
                      border: "1px solid var(--line)",
                    }}
                  >
                    {CARS.map((car) => (
                      <Link
                        key={car.code}
                        href={`/dashboard/owner/cars`}
                        className="row-hover"
                        style={{
                          background: "var(--surface)",
                          padding: "16px",
                          textDecoration: "none",
                          display: "block",
                        }}
                      >
                        {/* Mini photo */}
                        <div
                          className="photo-placeholder"
                          style={{ height: 90, marginBottom: 12, border: "1px solid var(--line)" }}
                        >
                          <Icon icon="ph:car" width={28} style={{ color: "var(--slate)", opacity: 0.4 }} aria-hidden="true" />
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", marginBottom: 4, letterSpacing: "0.08em" }}>
                          {car.code}
                        </div>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
                          {car.name}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <StatusTag status={car.status} />
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--slate)" }}>
                            {car.trips} trips
                          </span>
                        </div>
                      </Link>
                    ))}
                    {/* Add car tile */}
                    <Link
                      href="/dashboard/owner/list"
                      style={{
                        background: "var(--hover)",
                        padding: "16px",
                        textDecoration: "none",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        minHeight: 160,
                        border: "2px dashed var(--line)",
                      }}
                    >
                      <Icon icon="ph:plus-circle" width={28} style={{ color: "var(--slate)" }} aria-hidden="true" />
                      <span className="kicker" style={{ textAlign: "center" }}>List another car</span>
                    </Link>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
