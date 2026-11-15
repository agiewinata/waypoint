"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { Header } from "@/components/ui/Header";
import { SideNav } from "@/components/ui/SideNav";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
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

const STEPS = ["Vehicle info", "Documents", "Pricing", "Review & submit"];
const VEHICLE_TYPES = ["Sedan", "SUV", "MPV", "Hatchback", "Pickup", "Motorcycle"];
const CITIES = ["Jakarta", "Bandung", "Surabaya", "Yogyakarta", "Bali", "Medan", "Semarang", "Makassar"];

export default function ListACarPage() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    make: "", model: "", year: "", type: "SUV", city: "", plate: "", vin: "",
    pricePerDay: "", stnkFile: null as File | null, insuranceFile: null as File | null,
  });

  function update(field: string, value: string | File | null) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function next() { setStep((s) => Math.min(s + 1, 3)); }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitted(true);
  }

  return (
    <>
      <Header userName="Dimas Raharjo" userInitials="DR" />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container" style={{ maxWidth: 760 }}>
          <Breadcrumb
            crumbs={[
              { label: "Owner dashboard", href: "/dashboard/owner" },
              { label: "My cars", href: "/dashboard/owner/cars" },
              { label: "List a car" },
            ]}
          />

          <div style={{ borderBottom: "1px solid var(--ink)", paddingBottom: 16, marginBottom: 32 }}>
            <span className="kicker" style={{ marginBottom: 6, display: "block" }}>Owner · New listing</span>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-0.025em",
                color: "var(--ink)",
              }}
            >
              List a car
            </h1>
          </div>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                border: "1px solid var(--ok)",
                padding: "44px 32px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div style={{ width: 56, height: 56, border: "1px solid var(--ok)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon icon="ph:check" width={28} style={{ color: "var(--ok)" }} />
              </div>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
                  Listing submitted
                </h2>
                <p style={{ color: "var(--slate)", fontSize: 14, lineHeight: 1.6, maxWidth: 380, margin: "0 auto" }}>
                  Your vehicle is now <strong>Pending</strong> review. An admin will approve it after verifying your documents. Usually within 24 hours.
                </p>
              </div>
              <Link href="/dashboard/owner/cars" className="btn btn-ghost" style={{ marginTop: 8 }}>
                Back to my cars
              </Link>
            </motion.div>
          ) : (
            <>
              {/* Step indicator */}
              <div style={{ display: "flex", gap: 0, marginBottom: 36, border: "1px solid var(--line)" }}>
                {STEPS.map((s, i) => (
                  <button
                    key={s}
                    onClick={() => i < step && setStep(i)}
                    style={{
                      flex: 1,
                      padding: "12px 8px",
                      borderRight: i < 3 ? "1px solid var(--line)" : "none",
                      background: i === step ? "var(--ink)" : i < step ? "var(--hover)" : "transparent",
                      cursor: i < step ? "pointer" : "default",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      border: "none",
                      outline: "none",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: i === step ? "rgba(255,255,255,0.6)" : i < step ? "var(--accent)" : "var(--done)",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        letterSpacing: "0.07em",
                        textTransform: "uppercase",
                        color: i === step ? "#fff" : i < step ? "var(--ink)" : "var(--slate)",
                      }}
                    >
                      {s}
                    </span>
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit}>
                <AnimatePresence mode="wait">
                  {step === 0 && (
                    <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                        <div>
                          <label className="field-label" htmlFor="car-make">Make</label>
                          <input id="car-make" required className="input" placeholder="Toyota" value={form.make} onChange={(e) => update("make", e.target.value)} />
                        </div>
                        <div>
                          <label className="field-label" htmlFor="car-model">Model</label>
                          <input id="car-model" required className="input" placeholder="Avanza" value={form.model} onChange={(e) => update("model", e.target.value)} />
                        </div>
                        <div>
                          <label className="field-label" htmlFor="car-year">Year</label>
                          <input id="car-year" required type="number" min={2000} max={2026} className="input" placeholder="2022" value={form.year} onChange={(e) => update("year", e.target.value)} />
                        </div>
                        <div>
                          <label className="field-label" htmlFor="car-type">Type</label>
                          <select id="car-type" className="input select" value={form.type} onChange={(e) => update("type", e.target.value)}>
                            {VEHICLE_TYPES.map((t) => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="field-label" htmlFor="car-city">City</label>
                          <select id="car-city" className="input select" value={form.city} onChange={(e) => update("city", e.target.value)}>
                            <option value="">Select city</option>
                            {CITIES.map((c) => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="field-label" htmlFor="car-plate">Plate number</label>
                          <input id="car-plate" required className="input" placeholder="B 1234 XY" value={form.plate} onChange={(e) => update("plate", e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="field-label" htmlFor="car-vin">VIN</label>
                        <input id="car-vin" required className="input" placeholder="17-character VIN" value={form.vin} onChange={(e) => update("vin", e.target.value)} />
                      </div>
                    </motion.div>
                  )}

                  {step === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <p style={{ fontSize: 14, color: "var(--slate)", marginBottom: 20, lineHeight: 1.6 }}>
                        Upload your STNK and insurance document. Files are AES-256-GCM encrypted at rest.
                      </p>
                      {[
                        { key: "stnkFile",      label: "STNK (vehicle registration)", hint: "Front side of your STNK document" },
                        { key: "insuranceFile", label: "Insurance certificate",        hint: "Valid insurance coverage document" },
                      ].map((doc) => (
                        <div key={doc.key} style={{ marginBottom: 16, border: "1px solid var(--line)", padding: 16 }}>
                          <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>{doc.label}</div>
                          <div style={{ fontSize: 13, color: "var(--slate)", marginBottom: 12 }}>{doc.hint}</div>
                          <label
                            htmlFor={`doc-${doc.key}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "12px 14px",
                              border: "1px dashed var(--line)",
                              cursor: "pointer",
                              background: "var(--hover)",
                            }}
                          >
                            <Icon icon={(form as never)[doc.key] ? "ph:file-text" : "ph:upload-simple"} width={16} style={{ color: "var(--slate)" }} aria-hidden="true" />
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--slate)" }}>
                              {(form as never)[doc.key] ? ((form as never)[doc.key] as File).name : `Upload ${doc.label.split(" ")[0]}`}
                            </span>
                          </label>
                          <input
                            id={`doc-${doc.key}`}
                            type="file"
                            accept="image/*,.pdf"
                            style={{ display: "none" }}
                            onChange={(e) => update(doc.key, e.target.files?.[0] ?? null)}
                          />
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <div style={{ maxWidth: 360 }}>
                        <label className="field-label" htmlFor="car-price">Price per day (IDR)</label>
                        <div style={{ position: "relative" }}>
                          <span
                            style={{
                              position: "absolute",
                              left: 12,
                              top: "50%",
                              transform: "translateY(-50%)",
                              fontFamily: "var(--font-mono)",
                              fontSize: 12,
                              color: "var(--slate)",
                            }}
                          >
                            RP
                          </span>
                          <input
                            id="car-price"
                            required
                            type="number"
                            min={50000}
                            className="input"
                            style={{ paddingLeft: 36 }}
                            placeholder="320000"
                            value={form.pricePerDay}
                            onChange={(e) => update("pricePerDay", e.target.value)}
                          />
                        </div>
                        <p style={{ fontSize: 13, color: "var(--slate)", marginTop: 8, lineHeight: 1.6 }}>
                          You receive 95% of each booking. Waypoint takes a 5% platform fee.
                        </p>
                        {form.pricePerDay && (
                          <div style={{ marginTop: 16, border: "1px solid var(--line)", padding: "12px 14px" }}>
                            <div className="spec-row">
                              <span className="spec-label">Listed price</span>
                              <span className="spec-value">RP {Number(form.pricePerDay).toLocaleString("id-ID")}/d</span>
                            </div>
                            <div className="spec-row" style={{ borderBottom: "none" }}>
                              <span className="spec-label">Your payout</span>
                              <span className="spec-value" style={{ color: "var(--ok)" }}>RP {Math.round(Number(form.pricePerDay) * 0.95).toLocaleString("id-ID")}/d</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <div style={{ border: "1px solid var(--line)", padding: "20px 22px", marginBottom: 24 }}>
                        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)", marginBottom: 12 }}>
                          Review your listing
                        </h3>
                        {[
                          { label: "Vehicle",    value: `${form.year} ${form.make} ${form.model}` || "—" },
                          { label: "Type",       value: form.type },
                          { label: "City",       value: form.city || "—" },
                          { label: "Plate",      value: form.plate || "—" },
                          { label: "VIN",        value: form.vin || "—" },
                          { label: "Price/day",  value: form.pricePerDay ? `RP ${Number(form.pricePerDay).toLocaleString("id-ID")}` : "—" },
                          { label: "STNK",       value: form.stnkFile ? form.stnkFile.name : "Not uploaded" },
                          { label: "Insurance",  value: form.insuranceFile ? form.insuranceFile.name : "Not uploaded" },
                        ].map((r) => (
                          <div key={r.label} className="spec-row">
                            <span className="spec-label">{r.label}</span>
                            <span className="spec-value">{r.value}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ border: "1px solid var(--line)", padding: "12px 14px", marginBottom: 20, display: "flex", gap: 10 }}>
                        <Icon icon="ph:info" width={14} style={{ color: "var(--slate)", flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                        <p style={{ fontSize: 13, color: "var(--slate)", lineHeight: 1.6 }}>
                          Your listing will be in <strong>Pending</strong> status. An admin will review your documents and approve or reject the listing. Only approved listings are visible to customers.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div style={{ marginTop: 32, display: "flex", gap: 12, justifyContent: "space-between" }}>
                  {step > 0 ? (
                    <button type="button" onClick={back} className="btn btn-ghost" style={{ fontSize: 11 }}>
                      ← Previous
                    </button>
                  ) : (
                    <div />
                  )}
                  {step < 3 ? (
                    <button type="button" onClick={next} className="btn btn-primary" style={{ fontSize: 11 }}>
                      Next →
                    </button>
                  ) : (
                    <button type="submit" className="btn btn-primary" style={{ fontSize: 11 }}>
                      <Icon icon="ph:paper-plane-tilt" width={14} aria-hidden="true" />
                      Submit listing
                    </button>
                  )}
                </div>
              </form>
            </>
          )}
        </div>
      </main>
    </>
  );
}
