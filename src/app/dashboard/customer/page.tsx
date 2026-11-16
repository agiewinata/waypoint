import { SiteHeader } from "@/components/ui/SiteHeader";
import { SideNav } from "@/components/ui/SideNav";
import { StatusTag } from "@/components/ui/StatusTag";
import { FadeIn } from "@/components/ui/AnimatedText";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { requireCustomerPage } from "@/server/authz";
import { listBookingsForCustomer } from "@/server/bookings";
import { formatIDR, formatDate, initials } from "@/lib/format";
import { CUSTOMER_NAV_ITEMS } from "@/components/ui/nav";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardPage() {
  const actor = await requireCustomerPage();
  const { items } = await listBookingsForCustomer(actor.rentee.renteeID);

  const verificationStatus = actor.rentee.verificationStatus;
  const userName = actor.user.name || actor.user.email;
  const userInitials = initials(userName);

  const isVerified = verificationStatus === "Verified";
  const activeCount = items.filter((b) => b.status === "Active").length;
  const totalSpent = items.reduce((sum, b) => sum + b.totalPrice, 0);

  const navItems = CUSTOMER_NAV_ITEMS.map((item) =>
    item.href === "/dashboard/customer/verify" ? { ...item, badge: isVerified ? 0 : 1 } : item
  );

  return (
    <>
      <SiteHeader />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container">
          <div className="dashboard-layout">
            {/* Sidebar */}
            <div className="dashboard-sidebar">
              <SideNav
                items={navItems}
                userName={userName}
                userRole="Customer"
                userInitials={userInitials}
                keyFigure={formatIDR(totalSpent)}
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
                  <span className="kicker" style={{ marginBottom: 6, display: "block" }}>
                    Customer dashboard
                  </span>
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
              {!isVerified && (
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
                      <Icon
                        icon="ph:warning"
                        width={18}
                        style={{ color: "var(--wait)", flexShrink: 0 }}
                        aria-hidden="true"
                      />
                      <div>
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "var(--wait)",
                          }}
                        >
                          Identity unverified
                        </div>
                        <div style={{ fontSize: 13, color: "var(--slate)", marginTop: 3 }}>
                          {verificationStatus === "Rejected"
                            ? "Verification rejected — resubmit your documents"
                            : "Complete identity verification to unlock booking"}
                        </div>
                      </div>
                    </div>
                    <Link
                      href="/dashboard/customer/verify"
                      className="btn btn-ghost"
                      style={{ fontSize: 11, flexShrink: 0 }}
                    >
                      {verificationStatus === "Rejected" ? "Resubmit" : "Verify now"}
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
                    { label: "Total trips",  value: String(items.length), mono: false },
                    { label: "Active now",   value: String(activeCount),  mono: false },
                    { label: "Total spent",  value: formatIDR(totalSpent), mono: true },
                    { label: "Verification", value: verificationStatus,   mono: true },
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
                      <div className="kicker" style={{ marginTop: 4 }}>
                        {kpi.label}
                      </div>
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
                    gridTemplateColumns: "1fr 2fr 150px 120px 120px",
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

                {items.length === 0 && (
                  <div
                    style={{
                      padding: "32px 16px",
                      textAlign: "center",
                      color: "var(--slate)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      letterSpacing: "0.06em",
                    }}
                  >
                    No trips yet.{" "}
                    <Link href="/" style={{ color: "var(--accent)" }}>
                      Book your first car →
                    </Link>
                  </div>
                )}

                {items.map((trip, i) => {
                  // Confirmed bookings go to checkout; all others go to the trip detail page
                  const href =
                    trip.status === "Confirmed"
                      ? `/dashboard/customer/checkout/${trip.id}`
                      : `/trips/${trip.id}`;

                  return (
                    <Link
                      key={trip.id}
                      href={href}
                      className="row-hover"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 2fr 150px 120px 120px",
                        padding: "14px 16px",
                        borderBottom: i < items.length - 1 ? "1px solid var(--line)" : "none",
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
                        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>
                          {trip.make} {trip.model}
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--slate)", marginTop: 2 }}>
                          {trip.listingCode}
                        </div>
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--slate)",
                        }}
                      >
                        {formatDate(trip.startDate)}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          color: "var(--ink)",
                          fontWeight: 600,
                        }}
                      >
                        {formatIDR(trip.totalPrice)}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <StatusTag status={trip.status} />
                        {trip.status === "Confirmed" && !trip.adminApproved && (
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 9,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "var(--slate)",
                            }}
                          >
                            Awaiting approval
                          </span>
                        )}
                        {trip.status === "Confirmed" && trip.adminApproved && (
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 9,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "var(--accent)",
                            }}
                          >
                            Pay now
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
