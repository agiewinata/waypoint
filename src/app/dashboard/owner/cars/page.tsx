import Link from "next/link";
import { Icon } from "@iconify/react";
import { requireOwnerPage } from "@/server/authz";
import { listVehiclesForOwner } from "@/server/vehicles";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SideNav } from "@/components/ui/SideNav";
import { StatusTag } from "@/components/ui/StatusTag";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { formatIDR, initials } from "@/lib/format";
import { OWNER_NAV_ITEMS } from "@/components/ui/nav";

export const dynamic = "force-dynamic";

export default async function MyCarsPage() {
  const actor = await requireOwnerPage();
  const { items } = await listVehiclesForOwner(actor.renter.renterID);
  const userName = actor.user.name || actor.user.email;
  const userInitials = initials(userName);

  return (
    <>
      <SiteHeader />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container">
          <div className="dashboard-layout">
            <div className="dashboard-sidebar">
              <SideNav
                items={OWNER_NAV_ITEMS}
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
                  { label: "My cars" },
                ]}
              />

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
                  <span className="kicker" style={{ marginBottom: 6, display: "block" }}>Owner · My listings</span>
                  <h1
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 28,
                      fontWeight: 700,
                      letterSpacing: "-0.025em",
                      color: "var(--ink)",
                    }}
                  >
                    My cars
                  </h1>
                </div>
                <Link href="/dashboard/owner/list" className="btn btn-primary" style={{ fontSize: 11 }}>
                  <Icon icon="ph:plus" width={14} aria-hidden="true" />
                  List a car
                </Link>
              </div>

              {items.length === 0 ? (
                <div
                  style={{
                    border: "1px solid var(--line)",
                    padding: "60px 24px",
                    textAlign: "center",
                  }}
                >
                  <Icon icon="ph:car-simple" width={48} style={{ color: "var(--thumb)", marginBottom: 16 }} aria-hidden="true" />
                  <h2
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 20,
                      fontWeight: 700,
                      color: "var(--ink)",
                      marginBottom: 8,
                    }}
                  >
                    You haven&apos;t listed any cars yet
                  </h2>
                  <p style={{ color: "var(--slate)", fontSize: 14, marginBottom: 20 }}>
                    List your first car to start earning on Waypoint.
                  </p>
                  <Link href="/dashboard/owner/list" className="btn btn-primary">
                    List a car
                  </Link>
                </div>
              ) : (
                <div style={{ border: "1px solid var(--line)" }}>
                  {/* Table header */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px 2fr 100px 120px 100px",
                      padding: "10px 16px",
                      borderBottom: "1px solid var(--ink)",
                      background: "var(--ink)",
                    }}
                  >
                    {["Code", "Vehicle", "City", "Price/day", "Status"].map((h) => (
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

                  {items.map((car, i) => (
                    <Link
                      key={car.listingCode}
                      href={`/dashboard/owner/cars/${car.listingCode}`}
                      className="row-hover no-underline"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "80px 2fr 100px 120px 100px",
                        padding: "14px 16px",
                        borderBottom: i < items.length - 1 ? "1px solid var(--line)" : "none",
                        alignItems: "center",
                        color: "var(--ink)",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--accent)",
                          letterSpacing: "0.07em",
                        }}
                      >
                        {car.listingCode}
                      </span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>
                          {car.year} {car.make} {car.model}
                        </div>
                        <span className="kicker">{car.type}</span>
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--slate)" }}>
                        {car.city}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--ink)",
                        }}
                      >
                        {formatIDR(car.pricePerDay)}
                      </span>
                      <StatusTag status={car.status} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
