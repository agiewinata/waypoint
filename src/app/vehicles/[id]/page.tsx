"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { Header } from "@/components/ui/Header";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { StatusTag } from "@/components/ui/StatusTag";
import { FadeIn } from "@/components/ui/AnimatedText";

/* ─── Mock vehicle ───────────────────────────────────────────────────────── */
const VEHICLE = {
  id: "1",
  listingCode: "WP-7731",
  make: "Toyota",
  model: "Avanza",
  year: 2022,
  type: "MPV",
  city: "Jakarta",
  pricePerDay: 320000,
  status: "Approved",
  VIN: "MHF11BY3JCK012345",
  plateNumber: "B 1234 XY",
  ownerName: "Dimas Raharjo",
  ownerVerified: true,
  specs: [
    { label: "Make / Model",   value: "Toyota Avanza" },
    { label: "Year",           value: "2022" },
    { label: "Type",           value: "MPV" },
    { label: "Plate",          value: "B •••• XY" },
    { label: "City",           value: "Jakarta" },
    { label: "Seats",          value: "7 seats" },
    { label: "Fuel",           value: "Petrol" },
    { label: "Transmission",   value: "Manual" },
  ],
};

function formatIDR(n: number) {
  return `RP ${n.toLocaleString("id-ID")}`;
}

export default function VehicleDetailPage() {
  const v = VEHICLE;
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(tomorrow);
  const [submitted, setSubmitted] = useState(false);

  const days = Math.max(
    1,
    Math.round(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
    )
  );
  const total = days * v.pricePerDay;

  function handleBook(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <>
      <Header />

      <main style={{ padding: "36px 0 80px", background: "var(--paper)" }}>
        <div className="page-container">
          <Breadcrumb
            crumbs={[
              { label: "Browse", href: "/" },
              { label: `${v.year} ${v.make} ${v.model}` },
            ]}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr min(360px,100%)", gap: 40, alignItems: "start" }}>
            {/* Left col */}
            <div>
              {/* Kicker */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span className="kicker">{v.listingCode}</span>
                <span className="kicker">·</span>
                <StatusTag status={v.status} />
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
                {v.year} {v.make} {v.model}
              </h1>

              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--slate)", fontSize: 14 }}>
                  <Icon icon="ph:map-pin" width={14} aria-hidden="true" />
                  {v.city}
                </span>
                <span className="kicker">{v.type}</span>
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
                  DR
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{v.ownerName}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <span className="kicker">Owner</span>
                    {v.ownerVerified && (
                      <span className="tag" style={{ color: "var(--ok)" }}>
                        <span className="dot" style={{ background: "var(--ok)" }} />
                        Verified
                      </span>
                    )}
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
                  {v.specs.map((s) => (
                    <div key={s.label} className="spec-row">
                      <span className="spec-label">{s.label}</span>
                      <span className="spec-value">{s.value}</span>
                    </div>
                  ))}
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
                  { icon: "ph:shield-check", label: "Escrow protection" },
                  { icon: "ph:identification-card", label: "ID-verified owner" },
                  { icon: "ph:map-pin-line", label: "Location tracking" },
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
            <div
              style={{
                position: "sticky",
                top: 80,
                border: "1px solid var(--ink)",
                background: "var(--surface)",
              }}
            >
              {/* Price header */}
              <div
                style={{
                  borderBottom: "1px solid var(--ink)",
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                }}
              >
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 600, color: "var(--ink)" }}>
                  {formatIDR(v.pricePerDay)}
                </span>
                <span className="kicker">per day</span>
              </div>

              <AnimatePresence mode="wait">
                {!submitted ? (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleBook}
                    style={{ padding: "20px" }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div>
                        <label className="field-label" htmlFor="start-date">Start date</label>
                        <input
                          id="start-date"
                          type="date"
                          required
                          value={startDate}
                          min={today}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="field-label" htmlFor="end-date">End date</label>
                        <input
                          id="end-date"
                          type="date"
                          required
                          value={endDate}
                          min={startDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="input"
                        />
                      </div>
                    </div>

                    {/* Price breakdown */}
                    <div
                      style={{
                        marginTop: 20,
                        borderTop: "1px solid var(--line)",
                        paddingTop: 16,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div className="spec-row" style={{ padding: "6px 0" }}>
                        <span className="spec-label">Rate</span>
                        <span className="spec-value">{formatIDR(v.pricePerDay)} × {days}d</span>
                      </div>
                      <div className="spec-row" style={{ padding: "6px 0", borderBottom: "none" }}>
                        <span className="spec-label" style={{ color: "var(--ink)", fontWeight: 600 }}>Total</span>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 16,
                            fontWeight: 600,
                            color: "var(--ink)",
                            flex: 1,
                          }}
                        >
                          {formatIDR(total)}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 16,
                        padding: "10px 12px",
                        border: "1px solid var(--line)",
                        background: "var(--hover)",
                        marginBottom: 16,
                      }}
                    >
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--slate)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        <Icon icon="ph:lock" width={10} style={{ display: "inline", marginRight: 5 }} aria-hidden="true" />
                        Held in escrow · released on safe return
                      </span>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: "100%", height: 44 }}>
                      Request booking
                    </button>

                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--slate)", textAlign: "center", marginTop: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      You won&apos;t be charged yet
                    </p>
                  </motion.form>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ padding: "28px 20px", textAlign: "center" }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        border: "1px solid var(--ok)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 16px",
                      }}
                    >
                      <Icon icon="ph:check" width={24} style={{ color: "var(--ok)" }} />
                    </div>
                    <h3
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 20,
                        fontWeight: 700,
                        color: "var(--ink)",
                        marginBottom: 8,
                      }}
                    >
                      Booking requested
                    </h3>
                    <p style={{ color: "var(--slate)", fontSize: 13, lineHeight: 1.6 }}>
                      Waiting for the owner to confirm. You&apos;ll be notified within 24 hours.
                    </p>
                    <div
                      className="kicker"
                      style={{ marginTop: 16, color: "var(--accent)" }}
                    >
                      {formatIDR(total)} · {days} day{days > 1 ? "s" : ""}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
