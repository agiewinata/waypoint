export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { Icon } from "@iconify/react";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SideNav } from "@/components/ui/SideNav";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { StatusTag } from "@/components/ui/StatusTag";
import { TrackingMap } from "@/components/owner/TrackingMap";
import { AutoRefresh } from "@/components/ui/AutoRefresh";
import { requireOwnerPage } from "@/server/authz";
import { getTrackingForOwner } from "@/server/location";
import { formatDate } from "@/lib/format";

const NAV_ITEMS = [
  { label: "Overview",  href: "/dashboard/owner",          icon: "ph:squares-four" },
  { label: "My Cars",   href: "/dashboard/owner/cars",      icon: "ph:car" },
  { label: "Requests",  href: "/dashboard/owner/bookings",  icon: "ph:clipboard-text" },
  { label: "Tracking",  href: "/dashboard/owner/tracking",  icon: "ph:map-pin" },
  { label: "Earnings",  href: "/dashboard/owner/earnings",  icon: "ph:currency-circle-dollar" },
  { label: "Account",   href: "/account",                   icon: "ph:user" },
];

/** Derives two-letter initials from a display name. */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default async function LiveTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireOwnerPage();
  const { id } = await params;
  const tracking = await getTrackingForOwner(actor.renter.renterID, id);
  if (!tracking) notFound();

  const userName = actor.user.name ?? actor.user.email;
  const userInitials = getInitials(userName);
  const latest = tracking.points[0] ?? null;

  return (
    <>
      <SiteHeader variant="default" />
      {/* AutoRefresh polls server state every 15 s */}
      <AutoRefresh intervalMs={15_000} />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container">
          <div className="dashboard-layout">
            <div className="dashboard-sidebar">
              <SideNav
                items={NAV_ITEMS}
                userName={userName}
                userRole="Owner"
                userInitials={userInitials}
                switchRoleHref="/dashboard/customer"
              />
            </div>

            <div className="dashboard-content">
              <Breadcrumb
                crumbs={[
                  { label: "Owner dashboard", href: "/dashboard/owner" },
                  { label: "Tracking", href: "/dashboard/owner/tracking" },
                  { label: `Booking ${id}` },
                ]}
              />

              {/* Title row */}
              <div
                style={{
                  borderBottom: "1px solid var(--ink)",
                  paddingBottom: 16,
                  marginBottom: 28,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <span
                    className="kicker"
                    style={{ marginBottom: 6, display: "block" }}
                  >
                    Booking {id}
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
                    Live tracking
                  </h1>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <StatusTag status="Active" />
                  {tracking.overdue && (
                    <span
                      className="tag"
                      style={{ color: "var(--alert)" }}
                      role="status"
                    >
                      <span
                        className="dot"
                        style={{ background: "var(--alert)" }}
                        aria-hidden="true"
                      />
                      Overdue
                    </span>
                  )}
                </div>
              </div>

              {/* Overdue alert banner */}
              {tracking.overdue && (
                <div
                  style={{
                    border: "1px solid var(--alert)",
                    padding: "10px 16px",
                    marginBottom: 24,
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <Icon
                    icon="ph:warning"
                    width={16}
                    style={{ color: "var(--alert)", flexShrink: 0 }}
                    aria-hidden="true"
                  />
                  <span style={{ fontSize: 13, color: "var(--alert)" }}>
                    This booking is <strong>overdue</strong> — the customer has not
                    returned the vehicle.
                  </span>
                </div>
              )}

              {/* Map */}
              <TrackingMap
                points={tracking.points}
                lastSeenAt={tracking.lastSeenAt}
                overdue={tracking.overdue}
              />

              {/* Info cards */}
              {latest && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(min(160px,100%), 1fr))",
                    gap: 1,
                    background: "var(--line)",
                    border: "1px solid var(--line)",
                    marginBottom: 24,
                  }}
                >
                  {[
                    {
                      label: "Last recorded",
                      value: formatDate(latest.recordedAt),
                      icon: "ph:clock",
                    },
                    {
                      label: "Speed",
                      value:
                        latest.speedKph !== null
                          ? `${latest.speedKph.toFixed(0)} km/h`
                          : "—",
                      icon: "ph:speedometer",
                    },
                    {
                      label: "Accuracy",
                      value:
                        latest.accuracy !== null
                          ? `±${latest.accuracy.toFixed(0)} m`
                          : "—",
                      icon: "ph:crosshair-simple",
                    },
                    {
                      label: "Points",
                      value: `${tracking.points.length}`,
                      icon: "ph:map-pin",
                    },
                  ].map((info) => (
                    <div
                      key={info.label}
                      style={{
                        background: "var(--surface)",
                        padding: "14px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Icon
                        icon={info.icon}
                        width={16}
                        style={{ color: "var(--slate)", flexShrink: 0 }}
                        aria-hidden="true"
                      />
                      <div>
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--ink)",
                          }}
                        >
                          {info.value}
                        </div>
                        <div className="kicker" style={{ marginTop: 2 }}>
                          {info.label}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Consent notice */}
              <div
                style={{
                  border: "1px solid var(--line)",
                  padding: "12px 16px",
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <Icon
                  icon="ph:lock"
                  width={14}
                  style={{ color: "var(--slate)", flexShrink: 0, marginTop: 1 }}
                  aria-hidden="true"
                />
                <p style={{ fontSize: 13, color: "var(--slate)", lineHeight: 1.6 }}>
                  Location tracking is <strong>consent-based</strong>. The customer
                  granted permission at booking time. Tracking stops when the booking
                  ends. Data is never shared with third parties.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
