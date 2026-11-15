"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { Header } from "@/components/ui/Header";
import { VehicleCard } from "@/components/ui/VehicleCard";
import { AnimatedHeading, FadeIn } from "@/components/ui/AnimatedText";
import Link from "next/link";

/* ─── Mock data ──────────────────────────────────────────────────────────── */
const VEHICLES = [
  { id: "1", listingCode: "WP-7731", make: "Toyota", model: "Avanza", year: 2022, type: "MPV",      city: "Jakarta",   pricePerDay: 320000 },
  { id: "2", listingCode: "WP-7732", make: "Honda",  model: "Brio",   year: 2023, type: "Hatchback", city: "Bandung",   pricePerDay: 250000 },
  { id: "3", listingCode: "WP-7733", make: "Mitsubishi", model: "Xpander", year: 2021, type: "MPV", city: "Surabaya",  pricePerDay: 380000 },
  { id: "4", listingCode: "WP-7734", make: "Daihatsu", model: "Rocky",  year: 2022, type: "SUV",   city: "Jakarta",   pricePerDay: 420000 },
  { id: "5", listingCode: "WP-7735", make: "Honda",  model: "HR-V",   year: 2023, type: "SUV",      city: "Yogyakarta",pricePerDay: 450000 },
  { id: "6", listingCode: "WP-7736", make: "Toyota", model: "Calya",  year: 2021, type: "MPV",      city: "Medan",     pricePerDay: 280000 },
  { id: "7", listingCode: "WP-7737", make: "Suzuki", model: "Ertiga", year: 2022, type: "MPV",      city: "Semarang",  pricePerDay: 300000 },
  { id: "8", listingCode: "WP-7738", make: "Toyota", model: "Innova", year: 2020, type: "SUV",      city: "Bali",      pricePerDay: 520000 },
];

const CITIES = ["All Cities", "Jakarta", "Bandung", "Surabaya", "Yogyakarta", "Bali", "Medan", "Semarang"];
const TYPES  = ["All Types", "SUV", "MPV", "Hatchback", "Sedan", "Pickup", "Motorcycle"];

const STATS = [
  { value: "1,240+", label: "Verified vehicles" },
  { value: "8,900+", label: "Completed trips" },
  { value: "98%",    label: "Return rate" },
  { value: "24 h",   label: "Average response" },
];

export default function HomePage() {
  const [city, setCity] = useState("All Cities");
  const [type, setType] = useState("All Types");
  const [query, setQuery] = useState("");

  const filtered = VEHICLES.filter((v) => {
    const matchCity = city === "All Cities" || v.city === city;
    const matchType = type === "All Types" || v.type === type;
    const q = query.toLowerCase();
    const matchQ = !q || `${v.make} ${v.model} ${v.city}`.toLowerCase().includes(q);
    return matchCity && matchType && matchQ;
  });

  return (
    <>
      <Header />

      {/* ─── Hero ──────────────────────────────────────────────────────── */}
      <section
        style={{
          borderBottom: "1px solid var(--ink)",
          padding: "64px 0 56px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative grid lines — React Bits background pattern */}
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
              until you're safely back. Trust built in.
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
              {STATS.map((s) => (
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

      {/* ─── How it works ──────────────────────────────────────────────── */}
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
              { n: "04", icon: "ph:map-pin-line", title: "Drive & return", body: "Track-enabled rental. Owner is notified when you're on your way back." },
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

      {/* ─── Browse / Search ───────────────────────────────────────────── */}
      <section id="browse" style={{ padding: "52px 0 80px" }}>
        <div className="page-container">
          {/* Section header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 28,
              borderBottom: "1px solid var(--ink)",
              paddingBottom: 16,
            }}
          >
            <div>
              <span className="kicker" style={{ display: "block", marginBottom: 6 }}>
                {filtered.length} vehicles available
              </span>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 26,
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  color: "var(--ink)",
                }}
              >
                Browse cars
              </h2>
            </div>
          </div>

          {/* Filters */}
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 32,
              alignItems: "center",
            }}
          >
            {/* Search input */}
            <div style={{ position: "relative", flex: "1 1 220px" }}>
              <Icon
                icon="ph:magnifying-glass"
                width={15}
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--slate)",
                  pointerEvents: "none",
                }}
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder="Search make, model, city…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input"
                style={{ paddingLeft: 32 }}
                aria-label="Search vehicles"
              />
            </div>

            {/* City filter */}
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input select"
              style={{ flex: "0 1 160px" }}
              aria-label="Filter by city"
            >
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>

            {/* Type filter */}
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="input select"
              style={{ flex: "0 1 160px" }}
              aria-label="Filter by vehicle type"
            >
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Vehicle grid */}
          {filtered.length > 0 ? (
            <motion.div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
                gap: 1,
                background: "var(--line)",
                border: "1px solid var(--line)",
              }}
              layout
            >
              {filtered.map((v, i) => (
                <motion.div
                  key={v.id}
                  style={{ background: "var(--paper)" }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.35 }}
                  layout
                >
                  <VehicleCard {...v} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div
              style={{
                border: "1px solid var(--line)",
                padding: "60px 24px",
                textAlign: "center",
              }}
            >
              <Icon
                icon="ph:car-simple"
                width={48}
                style={{ color: "var(--thumb)", marginBottom: 16 }}
                aria-hidden="true"
              />
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--ink)",
                  marginBottom: 8,
                }}
              >
                No vehicles found
              </div>
              <p style={{ color: "var(--slate)", fontSize: 14 }}>
                Try adjusting your filters or search terms.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
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
