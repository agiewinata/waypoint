import { Header } from "@/components/ui/Header";
import { SideNav } from "@/components/ui/SideNav";
import { StatusTag } from "@/components/ui/StatusTag";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
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

const CARS = [
  { code: "WP-7731", make: "Toyota",    model: "Avanza",  year: 2022, type: "MPV",      price: 320000, status: "Approved", trips: 12, city: "Jakarta"    },
  { code: "WP-7735", make: "Honda",     model: "HR-V",    year: 2023, type: "SUV",      price: 450000, status: "Approved", trips: 8,  city: "Jakarta"    },
  { code: "WP-7740", make: "Daihatsu",  model: "Terios",  year: 2021, type: "SUV",      price: 350000, status: "Pending",  trips: 0,  city: "Bogor"      },
  { code: "WP-7745", make: "Suzuki",    model: "Jimny",   year: 2022, type: "SUV",      price: 480000, status: "Draft",    trips: 0,  city: "Bandung"    },
];

function formatIDR(n: number) {
  return `RP ${n.toLocaleString("id-ID")}`;
}

export default function MyCarsPage() {
  return (
    <>
      <Header userName="Dimas Raharjo" userInitials="DR" />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container">
          <div className="dashboard-layout">
            <div className="dashboard-sidebar">
              <SideNav
                items={NAV_ITEMS}
                userName="Dimas Raharjo"
                userRole="Owner"
                userInitials="DR"
                switchRoleHref="/dashboard/customer"
              />
            </div>

            <div className="dashboard-content">
              <Breadcrumb crumbs={[{ label: "Owner dashboard", href: "/dashboard/owner" }, { label: "My cars" }]} />

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

              {CARS.length === 0 ? (
                <div
                  style={{
                    border: "1px solid var(--line)",
                    padding: "60px 24px",
                    textAlign: "center",
                  }}
                >
                  <Icon icon="ph:car-simple" width={48} style={{ color: "var(--thumb)", marginBottom: 16 }} aria-hidden="true" />
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
                    No listings yet
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
                      gridTemplateColumns: "80px 2fr 100px 120px 80px 100px",
                      padding: "10px 16px",
                      borderBottom: "1px solid var(--ink)",
                      background: "var(--ink)",
                    }}
                  >
                    {["Code", "Vehicle", "City", "Price/day", "Trips", "Status"].map((h) => (
                      <span key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>
                        {h}
                      </span>
                    ))}
                  </div>

                  {CARS.map((car, i) => (
                    <div
                      key={car.code}
                      className="row-hover"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "80px 2fr 100px 120px 80px 100px",
                        padding: "14px 16px",
                        borderBottom: i < CARS.length - 1 ? "1px solid var(--line)" : "none",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", letterSpacing: "0.07em" }}>{car.code}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>
                          {car.year} {car.make} {car.model}
                        </div>
                        <span className="kicker">{car.type}</span>
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--slate)" }}>{car.city}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{formatIDR(car.price)}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--slate)" }}>{car.trips}</span>
                      <StatusTag status={car.status} />
                    </div>
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
