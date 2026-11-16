import { requireOwnerPage } from "@/server/authz";
import { getOwnerEarnings } from "@/server/payments";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SideNav } from "@/components/ui/SideNav";
import { StatusTag } from "@/components/ui/StatusTag";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { FadeIn } from "@/components/ui/AnimatedText";
import { formatIDR, formatDate } from "@/lib/format";
import { Icon } from "@iconify/react";

export const dynamic = "force-dynamic";

const NAV_ITEMS = [
  { label: "Overview",  href: "/dashboard/owner",          icon: "ph:squares-four" },
  { label: "My Cars",   href: "/dashboard/owner/cars",      icon: "ph:car" },
  { label: "Requests",  href: "/dashboard/owner/bookings",  icon: "ph:clipboard-text" },
  { label: "Tracking",  href: "/dashboard/owner/tracking",  icon: "ph:map-pin" },
  { label: "Earnings",  href: "/dashboard/owner/earnings",  icon: "ph:currency-circle-dollar" },
  { label: "Messages",  href: "/messages",                  icon: "ph:chat-dots" },
  { label: "Account",   href: "/account",                   icon: "ph:user" },
];

function getInitials(name: string | null | undefined, email: string): string {
  const trimmed = (name ?? "").trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return trimmed.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default async function EarningsPage() {
  const actor = await requireOwnerPage();
  const earnings = await getOwnerEarnings(actor.renter.renterID);

  const userInitials = getInitials(actor.user.name, actor.user.email);

  const kpiTiles = [
    { label: "Held in escrow",  value: formatIDR(earnings.heldTotal),    color: "var(--active)" },
    { label: "Released gross",  value: formatIDR(earnings.releasedGross), color: "var(--ok)"     },
    { label: "Platform fees",   value: formatIDR(earnings.fee),           color: "var(--done)"   },
    { label: "Net payout",      value: formatIDR(earnings.net),           color: "var(--ink)"    },
  ];

  return (
    <>
      <SiteHeader />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container">
          <div className="dashboard-layout">
            <div className="dashboard-sidebar">
              <SideNav
                items={NAV_ITEMS}
                userName={actor.user.name ?? actor.user.email}
                userRole="Owner"
                userInitials={userInitials}
                switchRoleHref="/dashboard/customer"
              />
            </div>

            <div className="dashboard-content">
              <Breadcrumb
                crumbs={[
                  { label: "Owner dashboard", href: "/dashboard/owner" },
                  { label: "Earnings & payouts" },
                ]}
              />

              <div style={{ borderBottom: "1px solid var(--ink)", paddingBottom: 16, marginBottom: 28 }}>
                <span className="kicker" style={{ marginBottom: 6, display: "block" }}>Owner · Financials</span>
                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 28,
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    color: "var(--ink)",
                  }}
                >
                  Earnings &amp; payouts
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
                  {kpiTiles.map((kpi, i) => (
                    <div
                      key={kpi.label}
                      style={{
                        padding: "18px 18px",
                        borderRight: i < kpiTiles.length - 1 ? "1px solid var(--line)" : "none",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 16,
                          fontWeight: 600,
                          color: kpi.color,
                        }}
                      >
                        {kpi.value}
                      </div>
                      <div className="kicker" style={{ marginTop: 4 }}>{kpi.label}</div>
                    </div>
                  ))}
                </div>
              </FadeIn>

              {/* Payout history */}
              <FadeIn delay={0.1}>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: "var(--ink)",
                    marginBottom: 12,
                  }}
                >
                  Payout history
                </h2>

                {earnings.payouts.length === 0 ? (
                  <div
                    style={{
                      border: "1px solid var(--line)",
                      padding: "32px 16px",
                      textAlign: "center",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--slate)" }}>
                      No released payouts yet
                    </span>
                  </div>
                ) : (
                  <div style={{ border: "1px solid var(--line)" }}>
                    {/* Table header */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 90px 1fr 120px 120px 100px",
                        padding: "10px 16px",
                        borderBottom: "1px solid var(--ink)",
                        background: "var(--ink)",
                      }}
                    >
                      {["Vehicle", "Booking", "Release date", "Gross", "Your payout", "Status"].map((h) => (
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

                    {earnings.payouts.map((p, i) => (
                      <div
                        key={p.bookingId}
                        className="row-hover"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 90px 1fr 120px 120px 100px",
                          padding: "14px 16px",
                          borderBottom: i < earnings.payouts.length - 1 ? "1px solid var(--line)" : "none",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontSize: 13, color: "var(--slate)" }}>
                          {p.make} {p.model}
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 10,
                              color: "var(--accent)",
                              marginLeft: 6,
                              letterSpacing: "0.06em",
                            }}
                          >
                            {p.listingCode}
                          </span>
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: "var(--accent)",
                          }}
                        >
                          {p.bookingId}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: "var(--slate)",
                          }}
                        >
                          {formatDate(p.releasedAt)}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 12,
                            color: "var(--slate)",
                          }}
                        >
                          {formatIDR(p.amount)}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--ok)",
                          }}
                        >
                          {formatIDR(p.payout)}
                        </span>
                        <StatusTag status="Released" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Escrow info */}
                <div
                  style={{
                    marginTop: 20,
                    border: "1px solid var(--line)",
                    padding: "12px 16px",
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <Icon
                    icon="ph:info"
                    width={14}
                    style={{ color: "var(--slate)", flexShrink: 0, marginTop: 1 }}
                    aria-hidden="true"
                  />
                  <p style={{ fontSize: 13, color: "var(--slate)", lineHeight: 1.6 }}>
                    Payouts are released after safe return of the vehicle. Platform fee is 5% of the booking total.
                    Held funds are released to your registered bank account within 1 business day.
                  </p>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
