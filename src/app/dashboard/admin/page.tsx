import { Header } from "@/components/ui/Header";
import { SideNav } from "@/components/ui/SideNav";
import { StatusTag } from "@/components/ui/StatusTag";
import { FadeIn } from "@/components/ui/AnimatedText";
import { Icon } from "@iconify/react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const NAV_ITEMS = [
  { label: "Overview",      href: "/dashboard/admin",                    icon: "ph:squares-four" },
  { label: "Verifications", href: "/dashboard/admin/verifications",      icon: "ph:identification-card", badge: 3 },
  { label: "Vehicles",      href: "/dashboard/admin/vehicles",           icon: "ph:car", badge: 2 },
  { label: "Disputes",      href: "/dashboard/admin/disputes",           icon: "ph:scales", badge: 1 },
  { label: "Bookings",      href: "/dashboard/admin/bookings",           icon: "ph:clipboard-text" },
  { label: "Users",         href: "/dashboard/admin/users",              icon: "ph:users" },
];

const PENDING_VERIFICATIONS = [
  { id: "DOC-301", user: "Andi Pratama",  type: "KTP + SIM", submitted: "2026-11-13 · 10:20" },
  { id: "DOC-302", user: "Maya Lestari",  type: "KTP",       submitted: "2026-11-13 · 11:05" },
  { id: "DOC-303", user: "Rudi Santoso",  type: "SIM",       submitted: "2026-11-12 · 16:48" },
];

const PENDING_VEHICLES = [
  { code: "WP-7740", vehicle: "2021 Daihatsu Terios", owner: "Dimas Raharjo", submitted: "2026-11-11" },
  { code: "WP-7745", vehicle: "2022 Suzuki Jimny",    owner: "Hendra Putra",  submitted: "2026-11-12" },
];

const OPEN_DISPUTES = [
  { id: "DS-021", booking: "BK-0988", parties: "Rudi S. vs Honda Brio owner", status: "Open", created: "2026-11-10" },
];

const QUEUE_STATS = [
  { label: "Pending verifications", value: 3, color: "var(--wait)",   icon: "ph:identification-card" },
  { label: "Pending vehicles",      value: 2, color: "var(--wait)",   icon: "ph:car" },
  { label: "Open disputes",         value: 1, color: "var(--alert)",  icon: "ph:scales" },
  { label: "Active bookings",       value: 8, color: "var(--active)", icon: "ph:calendar-check" },
];

export default function AdminConsolePage() {
  return (
    <>
      {/* Admin gets ink header */}
      <Header variant="ink" userName="Admin" userInitials="WA" notifCount={6} />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container">
          <div className="dashboard-layout">
            <div className="dashboard-sidebar">
              <SideNav
                items={NAV_ITEMS}
                userName="Waypoint Admin"
                userRole="Administrator"
                userInitials="WA"
              />
            </div>

            <div className="dashboard-content">
              {/* Header */}
              <div
                style={{
                  borderBottom: "1px solid var(--ink)",
                  paddingBottom: 16,
                  marginBottom: 28,
                }}
              >
                <span className="kicker" style={{ marginBottom: 6, display: "block" }}>Admin console</span>
                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 28,
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    color: "var(--ink)",
                  }}
                >
                  Queue overview
                </h1>
              </div>

              {/* KPI tiles */}
              <FadeIn>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(160px,100%), 1fr))",
                    border: "1px solid var(--line)",
                    marginBottom: 36,
                  }}
                >
                  {QUEUE_STATS.map((s, i) => (
                    <div
                      key={s.label}
                      style={{
                        padding: "18px 16px",
                        borderRight: i < QUEUE_STATS.length - 1 ? "1px solid var(--line)" : "none",
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                      }}
                    >
                      <Icon icon={s.icon} width={18} style={{ color: s.color, marginTop: 2, flexShrink: 0 }} aria-hidden="true" />
                      <div>
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 28,
                            fontWeight: 700,
                            color: s.color,
                            lineHeight: 1,
                          }}
                        >
                          {s.value}
                        </div>
                        <div className="kicker" style={{ marginTop: 6 }}>{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </FadeIn>

              {/* Pending verifications */}
              <FadeIn delay={0.1}>
                <section style={{ marginBottom: 36 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 10,
                    }}
                  >
                    <h2
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 17,
                        fontWeight: 700,
                        letterSpacing: "-0.02em",
                        color: "var(--ink)",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Icon icon="ph:identification-card" width={18} style={{ color: "var(--wait)" }} aria-hidden="true" />
                      Pending verifications
                    </h2>
                    <Link href="/dashboard/admin/verifications" className="kicker" style={{ color: "var(--accent)", textDecoration: "none" }}>
                      View all →
                    </Link>
                  </div>
                  <div style={{ border: "1px solid var(--line)" }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "80px 1fr 100px 1fr",
                        padding: "10px 16px",
                        borderBottom: "1px solid var(--ink)",
                        background: "var(--ink)",
                      }}
                    >
                      {["Doc ID", "User", "Type", "Submitted"].map((h) => (
                        <span key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>
                          {h}
                        </span>
                      ))}
                    </div>
                    {PENDING_VERIFICATIONS.map((v, i) => (
                      <Link
                        key={v.id}
                        href={`/dashboard/admin/verifications/${v.id}`}
                        className="row-hover"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "80px 1fr 100px 1fr",
                          padding: "12px 16px",
                          borderBottom: i < PENDING_VERIFICATIONS.length - 1 ? "1px solid var(--line)" : "none",
                          alignItems: "center",
                          textDecoration: "none",
                        }}
                      >
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)" }}>{v.id}</span>
                        <span style={{ fontSize: 13, color: "var(--ink)" }}>{v.user}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--slate)" }}>{v.type}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--slate)" }}>{v.submitted}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              </FadeIn>

              {/* Pending vehicles */}
              <FadeIn delay={0.15}>
                <section style={{ marginBottom: 36 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 10,
                    }}
                  >
                    <h2
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 17,
                        fontWeight: 700,
                        letterSpacing: "-0.02em",
                        color: "var(--ink)",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Icon icon="ph:car" width={18} style={{ color: "var(--wait)" }} aria-hidden="true" />
                      Pending vehicle approvals
                    </h2>
                    <Link href="/dashboard/admin/vehicles" className="kicker" style={{ color: "var(--accent)", textDecoration: "none" }}>
                      View all →
                    </Link>
                  </div>
                  <div style={{ border: "1px solid var(--line)" }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "80px 2fr 1fr 1fr",
                        padding: "10px 16px",
                        borderBottom: "1px solid var(--ink)",
                        background: "var(--ink)",
                      }}
                    >
                      {["Code", "Vehicle", "Owner", "Submitted"].map((h) => (
                        <span key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>
                          {h}
                        </span>
                      ))}
                    </div>
                    {PENDING_VEHICLES.map((v, i) => (
                      <Link
                        key={v.code}
                        href={`/dashboard/admin/vehicles/${v.code}`}
                        className="row-hover"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "80px 2fr 1fr 1fr",
                          padding: "12px 16px",
                          borderBottom: i < PENDING_VEHICLES.length - 1 ? "1px solid var(--line)" : "none",
                          alignItems: "center",
                          textDecoration: "none",
                        }}
                      >
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)" }}>{v.code}</span>
                        <span style={{ fontSize: 13, color: "var(--ink)" }}>{v.vehicle}</span>
                        <span style={{ fontSize: 13, color: "var(--slate)" }}>{v.owner}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--slate)" }}>{v.submitted}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              </FadeIn>

              {/* Disputes */}
              <FadeIn delay={0.2}>
                <section>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 10,
                    }}
                  >
                    <h2
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 17,
                        fontWeight: 700,
                        letterSpacing: "-0.02em",
                        color: "var(--ink)",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Icon icon="ph:scales" width={18} style={{ color: "var(--alert)" }} aria-hidden="true" />
                      Open disputes
                    </h2>
                    <Link href="/dashboard/admin/disputes" className="kicker" style={{ color: "var(--accent)", textDecoration: "none" }}>
                      View all →
                    </Link>
                  </div>
                  <div style={{ border: "1px solid var(--line)" }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "80px 90px 2fr 100px 1fr",
                        padding: "10px 16px",
                        borderBottom: "1px solid var(--ink)",
                        background: "var(--ink)",
                      }}
                    >
                      {["Dispute ID", "Booking", "Parties", "Status", "Created"].map((h) => (
                        <span key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>
                          {h}
                        </span>
                      ))}
                    </div>
                    {OPEN_DISPUTES.map((d, i) => (
                      <Link
                        key={d.id}
                        href={`/dashboard/admin/disputes/${d.id}`}
                        className="row-hover"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "80px 90px 2fr 100px 1fr",
                          padding: "12px 16px",
                          borderBottom: i < OPEN_DISPUTES.length - 1 ? "1px solid var(--line)" : "none",
                          alignItems: "center",
                          textDecoration: "none",
                        }}
                      >
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)" }}>{d.id}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--slate)" }}>{d.booking}</span>
                        <span style={{ fontSize: 13, color: "var(--ink)" }}>{d.parties}</span>
                        <StatusTag status={d.status} />
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--slate)" }}>{d.created}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              </FadeIn>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
