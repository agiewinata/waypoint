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
import { formatDate, formatIDR, initials } from "@/lib/format";
import { ADMIN_NAV_ITEMS } from "@/components/ui/nav";
import { DocumentReviewActions } from "@/components/admin/DocumentReviewActions";
import { BookingApprovalActions } from "@/components/admin/BookingApprovalActions";
import { listBookingsAwaitingApproval } from "@/server/bookings";

export const dynamic = "force-dynamic";

export default async function AdminConsolePage() {
  const actor = await requireAdminPage();

  const [stats, verifications, vehicles, bookings, disputes] = await Promise.all([
    getAdminStats(),
    listPendingVerifications(),
    listPendingVehicles(),
    listBookingsAwaitingApproval(),
    listOpenDisputes(),
  ]);

  const userInitials = initials(actor.user.name.trim() || actor.user.email);

  const QUEUE_STATS = [
    { label: "Pending verifications",  value: stats.pendingVerifications,     color: "var(--wait)",   icon: "ph:identification-card" },
    { label: "Pending vehicles",       value: stats.pendingVehicles,          color: "var(--wait)",   icon: "ph:car" },
    { label: "Bookings to approve",    value: stats.pendingBookingApprovals,  color: "var(--wait)",   icon: "ph:calendar" },
    { label: "Open disputes",          value: stats.openDisputes,             color: "var(--alert)",  icon: "ph:scales" },
    { label: "Active bookings",        value: stats.activeBookings,           color: "var(--active)", icon: "ph:calendar-check" },
  ];

  return (
    <>
      <SiteHeader variant="ink" />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container">
          <div className="dashboard-layout">
            <div className="dashboard-sidebar">
              <SideNav
                items={ADMIN_NAV_ITEMS}
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
                        {["Holder", "Type", "Submitted", "Actions"].map((h) => (
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
                          <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, color: "var(--ink)" }}>{v.holderName}</span>
                            <StatusTag status={v.subject === "owner" ? "Owner" : "Customer"} />
                          </span>
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

              {/* Bookings awaiting approval */}
              <FadeIn delay={0.18}>
                <section id="bookings" style={{ marginBottom: 36, scrollMarginTop: 80 }}>
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
                      <Icon icon="ph:calendar" width={18} style={{ color: "var(--wait)" }} aria-hidden="true" />
                      Bookings awaiting approval
                    </h2>
                  </div>

                  {bookings.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--slate)", padding: "16px 0" }}>
                      No bookings awaiting approval.
                    </p>
                  ) : (
                    <div style={{ border: "1px solid var(--line)", overflowX: "auto" }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.4fr 1.5fr 120px 1.4fr 1fr 170px",
                          padding: "10px 16px",
                          borderBottom: "1px solid var(--ink)",
                          background: "var(--ink)",
                          minWidth: 900,
                        }}
                      >
                        {["Vehicle", "Dates", "Total", "Customer", "Owner", "Decision"].map((h) => (
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
                      {bookings.map((b, i) => (
                        <div
                          key={b.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1.4fr 1.5fr 120px 1.4fr 1fr 170px",
                            padding: "12px 16px",
                            borderBottom: i < bookings.length - 1 ? "1px solid var(--line)" : "none",
                            alignItems: "center",
                            gap: 8,
                            minWidth: 900,
                          }}
                        >
                          <span style={{ fontSize: 13, color: "var(--ink)" }}>
                            {b.make} {b.model}
                          </span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--slate)" }}>
                            {formatDate(b.startDate)} – {formatDate(b.endDate)}
                          </span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink)" }}>
                            {formatIDR(b.totalPrice)}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, color: "var(--ink)" }}>{b.customerName}</span>
                            <StatusTag status={b.customerVerificationStatus} />
                          </span>
                          <span style={{ fontSize: 13, color: "var(--slate)" }}>{b.ownerName}</span>
                          <BookingApprovalActions bookingId={b.id} />
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
