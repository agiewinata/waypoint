import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Icon } from "@iconify/react";
import { auth } from "@/lib/auth";
import { getPublicVehicle } from "@/server/vehicles";
import { getProfilesForUser } from "@/server/profiles";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { FadeIn } from "@/components/ui/AnimatedText";
import { BookingCard } from "@/components/booking/BookingCard";
import { formatIDR } from "@/lib/format";
import { todayJakarta, toDateOnly } from "@/lib/dates";
import type { User } from "@/generated/prisma/client";
import type { ViewerState } from "@/components/booking/BookingCard";

export const dynamic = "force-dynamic";

interface VehicleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function VehicleDetailPage({ params }: VehicleDetailPageProps) {
  const { id: listingCode } = await params;

  const vehicle = await getPublicVehicle(listingCode);
  if (!vehicle) notFound();

  // Determine what the viewer can do
  const result = await auth.api.getSession({ headers: await headers() });

  let viewerState: ViewerState = "guest";
  if (result) {
    const profiles = await getProfilesForUser((result.user as User).id);
    viewerState = profiles.rentee ? "can-book" : "no-profile";
  }

  const todayMin = toDateOnly(todayJakarta());

  const specs = [
    { label: "Make / Model", value: `${vehicle.make} ${vehicle.model}` },
    { label: "Year",         value: String(vehicle.year) },
    { label: "Type",         value: vehicle.type },
    { label: "City",         value: vehicle.city },
  ];

  const ownerInitials = vehicle.ownerFirstName.slice(0, 2).toUpperCase();

  return (
    <>
      <SiteHeader />

      <main style={{ padding: "36px 0 80px", background: "var(--paper)" }}>
        <div className="page-container">
          <Breadcrumb
            crumbs={[
              { label: "Browse", href: "/" },
              { label: `${vehicle.year} ${vehicle.make} ${vehicle.model}` },
            ]}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr min(360px,100%)",
              gap: 40,
              alignItems: "start",
            }}
          >
            {/* Left col */}
            <div>
              {/* Kicker */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span className="kicker">{vehicle.listingCode}</span>
              </div>

              {/* Title */}
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(28px, 4vw, 44px)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: "var(--ink)",
                  marginBottom: 6,
                }}
              >
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>

              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--slate)", fontSize: 14 }}>
                  <Icon icon="ph:map-pin" width={14} aria-hidden="true" />
                  {vehicle.city}
                </span>
                <span className="kicker">{vehicle.type}</span>
              </div>

              {/* Photo placeholder */}
              <FadeIn>
                <div
                  className="photo-placeholder"
                  style={{
                    height: 280,
                    border: "1px solid var(--line)",
                    marginBottom: 32,
                    position: "relative",
                  }}
                >
                  <Icon icon="ph:car" width={72} style={{ color: "var(--slate)", opacity: 0.3 }} aria-hidden="true" />
                </div>
              </FadeIn>

              {/* Owner card */}
              <div
                style={{
                  border: "1px solid var(--line)",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  marginBottom: 32,
                  background: "var(--surface)",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    border: "1px solid var(--ink)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  {ownerInitials}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>
                    {vehicle.ownerFirstName}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <span className="kicker">Owner</span>
                  </div>
                </div>
              </div>

              {/* Specs */}
              <div>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: "var(--ink)",
                    marginBottom: 4,
                    borderTop: "1px solid var(--ink)",
                    paddingTop: 16,
                  }}
                >
                  Vehicle specs
                </h2>
                <div style={{ marginTop: 8 }}>
                  {specs.map((s) => (
                    <div key={s.label} className="spec-row">
                      <span className="spec-label">{s.label}</span>
                      <span className="spec-value">{s.value}</span>
                    </div>
                  ))}
                  {/* Price row */}
                  <div className="spec-row">
                    <span className="spec-label">Price per day</span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--ink)",
                        flex: 1,
                      }}
                    >
                      {formatIDR(vehicle.pricePerDay)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Trust badges */}
              <div
                style={{
                  display: "flex",
                  gap: 20,
                  marginTop: 32,
                  flexWrap: "wrap",
                }}
              >
                {[
                  { icon: "ph:shield-check",          label: "Escrow protection" },
                  { icon: "ph:identification-card",   label: "ID-verified owner" },
                  { icon: "ph:map-pin-line",           label: "Location tracking" },
                ].map((b) => (
                  <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon icon={b.icon} width={16} style={{ color: "var(--accent)" }} aria-hidden="true" />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--slate)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {b.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right col — booking card */}
            <div style={{ position: "sticky", top: 80 }}>
              <BookingCard
                listingCode={vehicle.listingCode}
                pricePerDay={vehicle.pricePerDay}
                todayMin={todayMin}
                viewerState={viewerState}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
