import Link from "next/link";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { BrowseClient } from "@/components/browse/BrowseClient";
import { AnimatedHeading, FadeIn } from "@/components/ui/AnimatedText";
import { listPublicVehicles } from "@/server/vehicles";
import { VehicleSearchQuery, CITIES, VEHICLE_TYPES } from "@/lib/validation/vehicle";
import { Icon } from "@iconify/react";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const rawParams = await searchParams;

  // Normalize: take the first value if an array, ignore others
  const normalised: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawParams)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val !== undefined) normalised[k] = val;
  }

  const parsed = VehicleSearchQuery.safeParse(normalised);
  const query = parsed.success ? parsed.data : VehicleSearchQuery.parse({});

  const { items, page, pageSize, total } = await listPublicVehicles(query);

  return (
    <>
      <SiteHeader />

      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <section
        style={{
          borderBottom: "1px solid var(--ink)",
          padding: "64px 0 56px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative grid lines */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            opacity: 0.5,
            pointerEvents: "none",
          }}
        />

        <div className="page-container" style={{ position: "relative" }}>
          <span className="kicker" style={{ marginBottom: 16, display: "block" }}>
            Peer-to-peer car rental — Indonesia
          </span>

          <AnimatedHeading
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(36px, 6vw, 72px)",
              letterSpacing: "-0.03em",
              lineHeight: 1.0,
              color: "var(--ink)",
              maxWidth: 700,
              marginBottom: 24,
            }}
          >
            Rent a car from your neighbour.
          </AnimatedHeading>

          <FadeIn delay={0.3}>
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 16,
                color: "var(--slate)",
                maxWidth: 480,
                lineHeight: 1.6,
                marginBottom: 36,
              }}
            >
              Verified vehicles, identity-checked owners, money held in escrow
              until you&apos;re safely back. Trust built in.
            </p>
          </FadeIn>

          {/* Stats row */}
          <FadeIn delay={0.4}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0",
                borderTop: "1px solid var(--line)",
                borderLeft: "1px solid var(--line)",
                marginBottom: 44,
                width: "fit-content",
              }}
            >
              {[
                { value: total > 0 ? `${total}+` : "0", label: "Verified vehicles" },
                { value: "8,900+", label: "Completed trips" },
                { value: "98%",    label: "Return rate" },
                { value: "24 h",   label: "Average response" },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    padding: "16px 28px",
                    borderRight: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 22,
                      fontWeight: 600,
                      color: "var(--ink)",
                    }}
                  >
                    {s.value}
                  </div>
                  <div className="kicker" style={{ marginTop: 4 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>

          {/* CTA */}
          <FadeIn delay={0.5}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/auth/signup" className="btn btn-primary" style={{ fontSize: 12 }}>
                Get started
              </Link>
              <Link href="#browse" className="btn btn-ghost" style={{ fontSize: 12 }}>
                Browse cars
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── How it works ──────────────────────────────────────────────────── */}
      <section
        id="how"
        style={{ borderBottom: "1px solid var(--line)", padding: "52px 0" }}
      >
        <div className="page-container">
          <span className="kicker" style={{ marginBottom: 20, display: "block" }}>
            How Waypoint works
          </span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(220px,100%), 1fr))",
              gap: 0,
              border: "1px solid var(--line)",
            }}
          >
            {[
              { n: "01", icon: "ph:magnifying-glass", title: "Browse & book", body: "Find a verified vehicle in your city. Pick dates, check availability." },
              { n: "02", icon: "ph:shield-check", title: "Get verified", body: "Upload your KTP + SIM. Admin review usually takes under 2 hours." },
              { n: "03", icon: "ph:lock-key", title: "Escrow payment", body: "Your money is held safely until the car comes back in good condition." },
              { n: "04", icon: "ph:map-pin-line", title: "Drive & return", body: "Track-enabled rental. Owner is notified when you&apos;re on your way back." },
            ].map((step, i) => (
              <FadeIn key={step.n} delay={i * 0.1}>
                <div
                  style={{
                    padding: "28px 24px",
                    borderRight: "1px solid var(--line)",
                    height: "100%",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 14,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--accent)",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {step.n}
                    </span>
                    <Icon
                      icon={step.icon}
                      width={20}
                      style={{ color: "var(--ink)" }}
                      aria-hidden="true"
                    />
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 17,
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      color: "var(--ink)",
                      marginBottom: 8,
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 14,
                      color: "var(--slate)",
                      lineHeight: 1.55,
                    }}
                  >
                    {step.body}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Browse / Search ───────────────────────────────────────────────── */}
      <section id="browse" style={{ padding: "52px 0 80px" }}>
        <div className="page-container">
          <BrowseClient
            initialItems={items}
            initialQuery={query}
            total={total}
            cities={CITIES}
            vehicleTypes={VEHICLE_TYPES}
          />
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid var(--ink)",
          background: "var(--ink)",
          color: "var(--paper)",
          padding: "32px 0",
        }}
      >
        <div
          className="page-container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            WAYPOINT
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            © 2026 Waypoint · Peer-to-peer car rental platform
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {["About", "Safety", "Support"].map((link) => (
              <a
                key={link}
                href="#"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.6)",
                  textDecoration: "none",
                }}
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </>
  );
}
