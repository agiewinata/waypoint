import { requireOwnerPage } from "@/server/authz";
import { listBookingsForOwner } from "@/server/bookings";
import { getOwnerEarnings } from "@/server/payments";
import { listVehiclesForOwner } from "@/server/vehicles";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SideNav } from "@/components/ui/SideNav";
import { StatusTag } from "@/components/ui/StatusTag";
import { FadeIn } from "@/components/ui/AnimatedText";
import { formatIDR, formatDate, initials } from "@/lib/format";
import { OWNER_NAV_ITEMS } from "@/components/ui/nav";
import { Icon } from "@iconify/react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OwnerDashboardPage() {
  const actor = await requireOwnerPage();
  const renterID = actor.renter.renterID;

  const [{ items: pendingBookings }, earnings, { items: cars }] = await Promise.all([
    listBookingsForOwner(renterID, "Pending"),
    getOwnerEarnings(renterID),
    listVehiclesForOwner(renterID),
  ]);

  const approvedCount = cars.filter((c) => c.status === "Approved").length;

  const navItems = OWNER_NAV_ITEMS.map((item) =>
    item.href === "/dashboard/owner/bookings"
      ? { ...item, badge: pendingBookings.length }
      : item
  );

  const userInitials = initials(actor.user.name?.trim() || actor.user.email);

  const kpiTiles = [
    { label: "Approved cars",    value: String(approvedCount),          mono: false },
    { label: "Pending requests", value: String(pendingBookings.length),  mono: false },
    { label: "Held escrow",      value: formatIDR(earnings.heldTotal),   mono: true  },
    { label: "Released net",     value: formatIDR(earnings.net),         mono: true  },
  ];

  return (
    <>
      <SiteHeader />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container">
          <div className="dashboard-layout">
            <div className="dashboard-sidebar">
              <SideNav
                items={navItems}
                userName={actor.user.name ?? actor.user.email}
                userRole="Owner"
                userInitials={userInitials}
                keyFigure={formatIDR(earnings.net)}
                keyFigureLabel="Released net"
                switchRoleHref="/dashboard/customer"
              />
            </div>

            <div className="dashboard-content">
              {/* Page heading */}
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
                  {kpiTiles.map((kpi, i) => (
                    <div
                      key={kpi.label}
                      style={{
                        padding: "16px 16px",
                        borderRight: i < kpiTiles.length - 1 ? "1px solid var(--line)" : "none",
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

              {/* Pending booking requests */}
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
                    <Link
                      href="/dashboard/owner/bookings"
                      className="kicker"
                      style={{ color: "var(--accent)", textDecoration: "none" }}
                    >
                      View all →
                    </Link>
                  </div>

                  {pendingBookings.length === 0 ? (
                    <div
                      style={{
                        border: "1px solid var(--line)",
                        padding: "32px 16px",
                        textAlign: "center",
                      }}
                    >
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--slate)" }}>
                        No pending requests
                      </span>
                    </div>
                  ) : (
                    <div style={{ border: "1px solid var(--line)" }}>
                      {/* Table header */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr 100px 100px",
                          padding: "10px 16px",
                          borderBottom: "1px solid var(--ink)",
                          background: "var(--ink)",
                        }}
                      >
                        {["ID", "Vehicle", "Dates", "Total", "Status"].map((h) => (
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
                      {pendingBookings.map((b, i) => (
                        <Link
                          key={b.id}
                          href={`/dashboard/owner/bookings/${b.id}`}
                          className="row-hover"
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr 100px 100px",
                            padding: "14px 16px",
                            borderBottom: i < pendingBookings.length - 1 ? "1px solid var(--line)" : "none",
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
                            {b.id}
                          </span>
                          <span style={{ fontSize: 13, color: "var(--slate)" }}>
                            {b.make} {b.model}
                          </span>
                          <span style={{ fontSize: 13, color: "var(--slate)" }}>
                            {formatDate(b.startDate)} – {formatDate(b.endDate)}
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 12,
                              fontWeight: 600,
                              color: "var(--ink)",
                            }}
                          >
                            {formatIDR(b.totalPrice)}
                          </span>
                          <StatusTag status={b.status} />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </FadeIn>

              {/* My listings */}
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
                    <Link
                      href="/dashboard/owner/cars"
                      className="kicker"
                      style={{ color: "var(--accent)", textDecoration: "none" }}
                    >
                      Manage →
                    </Link>
                  </div>

                  {cars.length === 0 ? (
                    <div
                      style={{
                        border: "2px dashed var(--line)",
                        padding: "40px 16px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <Icon icon="ph:car" width={28} style={{ color: "var(--slate)", opacity: 0.5 }} aria-hidden="true" />
                      <span className="kicker">No cars listed yet</span>
                      <Link href="/dashboard/owner/list" className="btn btn-primary" style={{ fontSize: 11 }}>
                        <Icon icon="ph:plus" width={14} aria-hidden="true" />
                        List your first car
                      </Link>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(min(200px,100%), 1fr))",
                        gap: 1,
                        background: "var(--line)",
                        border: "1px solid var(--line)",
                      }}
                    >
                      {cars.map((car) => (
                        <Link
                          key={car.listingCode}
                          href="/dashboard/owner/cars"
                          className="row-hover"
                          style={{
                            background: "var(--surface)",
                            padding: "16px",
                            textDecoration: "none",
                            display: "block",
                          }}
                        >
                          <div
                            className="photo-placeholder"
                            style={{ height: 90, marginBottom: 12, border: "1px solid var(--line)" }}
                          >
                            <Icon
                              icon="ph:car"
                              width={28}
                              style={{ color: "var(--slate)", opacity: 0.4 }}
                              aria-hidden="true"
                            />
                          </div>
                          <div
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 10,
                              color: "var(--accent)",
                              marginBottom: 4,
                              letterSpacing: "0.08em",
                            }}
                          >
                            {car.listingCode}
                          </div>
                          <div
                            style={{
                              fontFamily: "var(--font-display)",
                              fontSize: 14,
                              fontWeight: 700,
                              color: "var(--ink)",
                              marginBottom: 4,
                            }}
                          >
                            {car.year} {car.make} {car.model}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <StatusTag status={car.status} />
                            <span
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: 11,
                                color: "var(--slate)",
                              }}
                            >
                              {formatIDR(car.pricePerDay)}/day
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
                        <Icon
                          icon="ph:plus-circle"
                          width={28}
                          style={{ color: "var(--slate)" }}
                          aria-hidden="true"
                        />
                        <span className="kicker" style={{ textAlign: "center" }}>List another car</span>
                      </Link>
                    </div>
                  )}
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
