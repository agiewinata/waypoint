import { SiteHeader } from "@/components/ui/SiteHeader";
import { SideNav } from "@/components/ui/SideNav";
import { StatusTag } from "@/components/ui/StatusTag";
import { FadeIn } from "@/components/ui/AnimatedText";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { requireAdminPage } from "@/server/authz";
import {
  getAdminStats,
  listPendingVerifications,
  listPendingVehicles,
  listOpenDisputes,
} from "@/server/admin";
import { formatDate } from "@/lib/format";
import { DocumentReviewActions } from "@/components/admin/DocumentReviewActions";

export const dynamic = "force-dynamic";

const NAV_ITEMS = [
  { label: "Overview",      href: "/dashboard/admin", icon: "ph:squares-four" },
  { label: "Verifications", href: "#verifications",   icon: "ph:identification-card" },
  { label: "Vehicles",      href: "#vehicles",        icon: "ph:car" },
  { label: "Disputes",      href: "#disputes",        icon: "ph:scales" },
];

/** Derives two-letter initials from a display name or email address. */
function getInitials(name: string, email: string): string {
  const trimmed = name.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return trimmed.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default async function AdminConsolePage() {
  const actor = await requireAdminPage();

  const [stats, verifications, vehicles, disputes] = await Promise.all([
    getAdminStats(),
    listPendingVerifications(),
    listPendingVehicles(),
    listOpenDisputes(),
  ]);

  const userInitials = getInitials(actor.user.name, actor.user.email);

  const QUEUE_STATS = [
    { label: "Pending verifications", value: stats.pendingVerifications, color: "var(--wait)",   icon: "ph:identification-card" },
    { label: "Pending vehicles",      value: stats.pendingVehicles,      color: "var(--wait)",   icon: "ph:car" },
    { label: "Open disputes",         value: stats.openDisputes,         color: "var(--alert)",  icon: "ph:scales" },
    { label: "Active bookings",       value: stats.activeBookings,       color: "var(--active)", icon: "ph:calendar-check" },
  ];

  return (
    <>
      <SiteHeader variant="ink" />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container">
          <div className="dashboard-layout">
            <div className="dashboard-sidebar">
              <SideNav
                items={NAV_ITEMS}
                userName={actor.user.name || actor.user.email}
                userRole="Administrator"
                userInitials={userInitials}
              />
            </div>

            <div className="dashboard-content">
              {/* Page heading */}
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
                      <Icon
                        icon={s.icon}
                        width={18}
                        style={{ color: s.color, marginTop: 2, flexShrink: 0 }}
                        aria-hidden="true"
                      />
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
                <section id="verifications" style={{ marginBottom: 36, scrollMarginTop: 80 }}>
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
                  </div>

                  {verifications.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--slate)", padding: "16px 0" }}>
                      No pending verifications.
                    </p>
                  ) : (
                    <div style={{ border: "1px solid var(--line)" }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 80px 130px 1fr",
                          padding: "10px 16px",
                          borderBottom: "1px solid var(--ink)",
                          background: "var(--ink)",
                        }}
                      >
                        {["Customer", "Type", "Submitted", "Actions"].map((h) => (
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
                      {verifications.map((v, i) => (
                        <div
                          key={v.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 80px 130px 1fr",
                            padding: "12px 16px",
                            borderBottom: i < verifications.length - 1 ? "1px solid var(--line)" : "none",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span style={{ fontSize: 13, color: "var(--ink)" }}>{v.customerName}</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--slate)" }}>
                            {v.type}
                          </span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--slate)" }}>
                            {formatDate(v.createdAt)}
                          </span>
                          <DocumentReviewActions
                            documentId={v.id}
                            documentType={v.type}
                            currentStatus="Pending"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </FadeIn>

              {/* Pending vehicle approvals */}
              <FadeIn delay={0.15}>
                <section id="vehicles" style={{ marginBottom: 36, scrollMarginTop: 80 }}>
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
                  </div>

                  {vehicles.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--slate)", padding: "16px 0" }}>
                      No pending vehicles.
                    </p>
                  ) : (
                    <div style={{ border: "1px solid var(--line)" }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "90px 2fr 1fr 80px",
                          padding: "10px 16px",
                          borderBottom: "1px solid var(--ink)",
                          background: "var(--ink)",
                        }}
                      >
                        {["Code", "Vehicle", "Owner", "Review"].map((h) => (
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
                      {vehicles.map((v, i) => (
                        <div
                          key={v.listingCode}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "90px 2fr 1fr 80px",
                            padding: "12px 16px",
                            borderBottom: i < vehicles.length - 1 ? "1px solid var(--line)" : "none",
                            alignItems: "center",
                          }}
                        >
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)" }}>
                            {v.listingCode}
                          </span>
                          <span style={{ fontSize: 13, color: "var(--ink)" }}>
                            {v.year} {v.make} {v.model}
                          </span>
                          <span style={{ fontSize: 13, color: "var(--slate)" }}>{v.ownerName}</span>
                          <Link
                            href={`/dashboard/admin/vehicles/${v.listingCode}`}
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 11,
                              color: "var(--accent)",
                              textDecoration: "none",
                            }}
                          >
                            Review →
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </FadeIn>

              {/* Open disputes */}
              <FadeIn delay={0.2}>
                <section id="disputes" style={{ scrollMarginTop: 80 }}>
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
                  </div>

                  {disputes.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--slate)", padding: "16px 0" }}>
                      No open disputes.
                    </p>
                  ) : (
                    <div style={{ border: "1px solid var(--line)" }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "90px 2fr 2fr 110px 80px",
                          padding: "10px 16px",
                          borderBottom: "1px solid var(--ink)",
                          background: "var(--ink)",
                        }}
                      >
                        {["Dispute", "Customer", "Owner", "Status", "Review"].map((h) => (
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
                      {disputes.map((d, i) => (
                        <div
                          key={d.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "90px 2fr 2fr 110px 80px",
                            padding: "12px 16px",
                            borderBottom: i < disputes.length - 1 ? "1px solid var(--line)" : "none",
                            alignItems: "center",
                          }}
                        >
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)" }}>
                            {d.id}
                          </span>
                          <span style={{ fontSize: 13, color: "var(--ink)" }}>{d.customerName}</span>
                          <span style={{ fontSize: 13, color: "var(--slate)" }}>{d.ownerName}</span>
                          <StatusTag status={d.status} />
                          <Link
                            href={`/dashboard/admin/disputes/${d.id}`}
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 11,
                              color: "var(--accent)",
                              textDecoration: "none",
                            }}
                          >
                            Review →
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </FadeIn>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
