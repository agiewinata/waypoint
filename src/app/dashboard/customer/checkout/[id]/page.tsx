"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { Header } from "@/components/ui/Header";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { StatusTag } from "@/components/ui/StatusTag";

export const dynamic = "force-dynamic";

const BOOKING = {
  id: "BK-1182",
  vehicle: "2022 Toyota Avanza",
  listingCode: "WP-7731",
  city: "Jakarta",
  owner: "Dimas Raharjo",
  startDate: "2026-11-10",
  endDate: "2026-11-13",
  days: 3,
  pricePerDay: 320000,
  total: 960000,
  status: "Confirmed",
};

const PAYMENT_METHODS = [
  { id: "bank", label: "Bank transfer", icon: "ph:bank" },
  { id: "va",   label: "Virtual account", icon: "ph:credit-card" },
  { id: "qris", label: "QRIS", icon: "ph:qr-code" },
];

function formatIDR(n: number) {
  return `RP ${n.toLocaleString("id-ID")}`;
}

export default function CheckoutPage() {
  const [method, setMethod] = useState("bank");
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  const platformFee = Math.round(BOOKING.total * 0.05);
  const escrow = BOOKING.total;

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setPaying(true);
    await new Promise((r) => setTimeout(r, 1400));
    setPaid(true);
    setPaying(false);
  }

  return (
    <>
      <Header userName="Andi Pratama" userInitials="AP" />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container" style={{ maxWidth: 760 }}>
          <Breadcrumb
            crumbs={[
              { label: "Dashboard", href: "/dashboard/customer" },
              { label: `Booking ${BOOKING.id}` },
              { label: "Checkout" },
            ]}
          />

          <div style={{ borderBottom: "1px solid var(--ink)", paddingBottom: 16, marginBottom: 32 }}>
            <span className="kicker" style={{ marginBottom: 6, display: "block" }}>Escrow payment · {BOOKING.id}</span>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-0.025em",
                color: "var(--ink)",
              }}
            >
              Pay into escrow
            </h1>
          </div>

          <AnimatePresence mode="wait">
            {paid ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  border: "1px solid var(--ok)",
                  padding: "44px 32px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 20,
                }}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    border: "1px solid var(--ok)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon icon="ph:lock-key" width={30} style={{ color: "var(--ok)" }} />
                </div>
                <div>
                  <span className="tag" style={{ color: "var(--active)", marginBottom: 10, display: "flex", justifyContent: "center" }}>
                    <span className="dot" style={{ background: "var(--active)" }} />
                    Held in escrow
                  </span>
                  <h2
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 26,
                      fontWeight: 700,
                      color: "var(--ink)",
                      marginBottom: 10,
                    }}
                  >
                    {formatIDR(escrow)} secured
                  </h2>
                  <p style={{ color: "var(--slate)", fontSize: 14, lineHeight: 1.6, maxWidth: 400, margin: "0 auto" }}>
                    Your payment is held safely. It will be released to the owner after safe return of the vehicle, minus a 5% platform fee.
                  </p>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--slate)", letterSpacing: "0.08em" }}>
                  BOOKING {BOOKING.id} · {BOOKING.vehicle}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: "grid", gridTemplateColumns: "1fr min(320px,100%)", gap: 32, alignItems: "start" }}
              >
                {/* Left — payment form */}
                <form onSubmit={handlePay}>
                  <h2
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 18,
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      color: "var(--ink)",
                      marginBottom: 16,
                    }}
                  >
                    Payment method
                  </h2>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
                    {PAYMENT_METHODS.map((pm) => (
                      <label
                        key={pm.id}
                        htmlFor={`pm-${pm.id}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "14px 16px",
                          border: `1px solid ${method === pm.id ? "var(--ink)" : "var(--line)"}`,
                          background: method === pm.id ? "var(--hover)" : "var(--surface)",
                          cursor: "pointer",
                          transition: "border-color .15s, background .15s",
                        }}
                      >
                        <input
                          id={`pm-${pm.id}`}
                          type="radio"
                          name="payment-method"
                          value={pm.id}
                          checked={method === pm.id}
                          onChange={() => setMethod(pm.id)}
                          style={{ accentColor: "var(--ink)" }}
                        />
                        <Icon icon={pm.icon} width={18} style={{ color: "var(--slate)" }} aria-hidden="true" />
                        <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink)" }}>
                          {pm.label}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Escrow explanation */}
                  <div
                    style={{
                      border: "1px solid var(--active)",
                      padding: "14px 16px",
                      marginBottom: 24,
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <Icon icon="ph:lock-key" width={16} style={{ color: "var(--active)", marginTop: 1, flexShrink: 0 }} aria-hidden="true" />
                    <div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--active)", marginBottom: 4 }}>
                        Escrow protection
                      </div>
                      <p style={{ fontSize: 13, color: "var(--slate)", lineHeight: 1.6 }}>
                        Your payment is held until the car is safely returned. If anything goes wrong, Waypoint mediates and can refund.
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={paying}
                    className="btn btn-primary"
                    style={{ height: 46, width: "100%" }}
                  >
                    {paying ? (
                      <Icon icon="ph:spinner" width={18} className="animate-spin" />
                    ) : (
                      `Pay ${formatIDR(escrow)} into escrow`
                    )}
                  </button>
                </form>

                {/* Right — booking summary */}
                <div style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
                  <div style={{ borderBottom: "1px solid var(--line)", padding: "14px 18px" }}>
                    <div className="kicker" style={{ marginBottom: 4 }}>Booking summary</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent)", letterSpacing: "0.06em" }}>
                      {BOOKING.id}
                    </div>
                  </div>
                  <div style={{ padding: "16px 18px" }}>
                    {/* Vehicle */}
                    <div
                      className="photo-placeholder"
                      style={{ height: 100, marginBottom: 14, border: "1px solid var(--line)" }}
                    >
                      <Icon icon="ph:car" width={36} style={{ color: "var(--slate)", opacity: 0.4 }} aria-hidden="true" />
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
                      {BOOKING.vehicle}
                    </div>
                    <div className="kicker" style={{ marginBottom: 16 }}>
                      <Icon icon="ph:map-pin" width={10} style={{ display: "inline", marginRight: 4 }} aria-hidden="true" />
                      {BOOKING.city}
                    </div>

                    {/* Spec rows */}
                    {[
                      { label: "Owner",    value: BOOKING.owner },
                      { label: "Dates",    value: `${BOOKING.startDate} → ${BOOKING.endDate}` },
                      { label: "Duration", value: `${BOOKING.days} days` },
                      { label: "Rate",     value: formatIDR(BOOKING.pricePerDay) + "/d" },
                    ].map((r) => (
                      <div key={r.label} className="spec-row">
                        <span className="spec-label">{r.label}</span>
                        <span className="spec-value">{r.value}</span>
                      </div>
                    ))}

                    <div
                      style={{
                        borderTop: "1px solid var(--ink)",
                        paddingTop: 12,
                        marginTop: 4,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                      }}
                    >
                      <span className="spec-label" style={{ color: "var(--ink)", fontWeight: 700 }}>Total</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>
                        {formatIDR(BOOKING.total)}
                      </span>
                    </div>
                    <div className="kicker" style={{ marginTop: 6, textAlign: "right", color: "var(--done)" }}>
                      Platform fee 5% = {formatIDR(platformFee)} (from owner)
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}
