"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { Header } from "@/components/ui/Header";
import { SideNav } from "@/components/ui/SideNav";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { StatusTag } from "@/components/ui/StatusTag";

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

const BOOKING = {
  id: "BK-1200",
  vehicle: "2022 Toyota Avanza",
  listingCode: "WP-7731",
  customer: "Andi Pratama",
  customerVerified: true,
  startDate: "2026-11-15",
  endDate: "2026-11-18",
  days: 3,
  total: 960000,
  status: "Pending",
  createdAt: "2026-11-12 · 14:32",
};

function formatIDR(n: number) {
  return `RP ${n.toLocaleString("id-ID")}`;
}

type Action = "confirmed" | "declined" | null;

export default function BookingRequestDetailPage() {
  const [action, setAction] = useState<Action>(null);
  const [acting, setActing] = useState(false);

  async function handleAction(type: "confirmed" | "declined") {
    setActing(true);
    await new Promise((r) => setTimeout(r, 900));
    setAction(type);
    setActing(false);
  }

  return (
    <>
      <Header userName="Dimas Raharjo" userInitials="DR" />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container" style={{ maxWidth: 760 }}>
          <Breadcrumb
            crumbs={[
              { label: "Owner dashboard", href: "/dashboard/owner" },
              { label: "Requests", href: "/dashboard/owner/bookings" },
              { label: BOOKING.id },
            ]}
          />

          <div
            style={{
              borderBottom: "1px solid var(--ink)",
              paddingBottom: 16,
              marginBottom: 32,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <span className="kicker" style={{ marginBottom: 6, display: "block" }}>Booking request · {BOOKING.id}</span>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  color: "var(--ink)",
                }}
              >
                {BOOKING.vehicle}
              </h1>
            </div>
            <StatusTag status={action === "confirmed" ? "Confirmed" : action === "declined" ? "Declined" : BOOKING.status} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr min(280px,100%)", gap: 32, alignItems: "start" }}>
            {/* Left */}
            <div>
              {/* Booking details */}
              <div style={{ border: "1px solid var(--line)", marginBottom: 24 }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", background: "var(--hover)" }}>
                  <span className="kicker">Booking details</span>
                </div>
                <div style={{ padding: "0 16px" }}>
                  {[
                    { label: "Booking ID",  value: BOOKING.id },
                    { label: "Vehicle",     value: `${BOOKING.vehicle} · ${BOOKING.listingCode}` },
                    { label: "Start date",  value: BOOKING.startDate },
                    { label: "End date",    value: BOOKING.endDate },
                    { label: "Duration",    value: `${BOOKING.days} days` },
                    { label: "Total",       value: formatIDR(BOOKING.total) },
                    { label: "Requested",   value: BOOKING.createdAt },
                  ].map((r) => (
                    <div key={r.label} className="spec-row">
                      <span className="spec-label">{r.label}</span>
                      <span className="spec-value">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer card */}
              <div style={{ border: "1px solid var(--line)", marginBottom: 24 }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", background: "var(--hover)" }}>
                  <span className="kicker">Customer</span>
                </div>
                <div style={{ padding: "16px 16px", display: "flex", alignItems: "center", gap: 14 }}>
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
                    }}
                    aria-hidden="true"
                  >
                    AP
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{BOOKING.customer}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                      {BOOKING.customerVerified ? (
                        <StatusTag status="Verified" />
                      ) : (
                        <StatusTag status="Unverified" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Precondition checklist */}
              <div style={{ border: "1px solid var(--line)", marginBottom: 24 }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", background: "var(--hover)" }}>
                  <span className="kicker">Preconditions for payment</span>
                </div>
                <div style={{ padding: "12px 16px" }}>
                  {[
                    { label: "Owner confirmed",             done: action === "confirmed" },
                    { label: "Customer KTP verified",       done: true  },
                    { label: "Customer SIM verified",       done: true  },
                    { label: "Admin approved booking",      done: false },
                  ].map((c) => (
                    <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          border: `1px solid ${c.done ? "var(--ok)" : "var(--line)"}`,
                          background: c.done ? "var(--ok)" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                        aria-hidden="true"
                      >
                        {c.done && <Icon icon="ph:check" width={10} style={{ color: "#fff" }} />}
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", color: c.done ? "var(--ok)" : "var(--slate)" }}>
                        {c.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — action card */}
            <div style={{ border: "1px solid var(--ink)", background: "var(--surface)" }}>
              <div style={{ borderBottom: "1px solid var(--ink)", padding: "14px 18px" }}>
                <span className="kicker">Your decision</span>
              </div>
              <div style={{ padding: "20px 18px" }}>
                <AnimatePresence mode="wait">
                  {action ? (
                    <motion.div
                      key="done"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ textAlign: "center", padding: "12px 0" }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          border: `1px solid ${action === "confirmed" ? "var(--ok)" : "var(--alert)"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 auto 12px",
                        }}
                      >
                        <Icon
                          icon={action === "confirmed" ? "ph:check" : "ph:x"}
                          width={22}
                          style={{ color: action === "confirmed" ? "var(--ok)" : "var(--alert)" }}
                        />
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 17,
                          fontWeight: 700,
                          color: "var(--ink)",
                          marginBottom: 6,
                        }}
                      >
                        {action === "confirmed" ? "Booking confirmed" : "Booking declined"}
                      </div>
                      <p style={{ color: "var(--slate)", fontSize: 13, lineHeight: 1.6 }}>
                        {action === "confirmed"
                          ? "The customer can now proceed to payment."
                          : "The customer has been notified."}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <p style={{ fontSize: 13, color: "var(--slate)", lineHeight: 1.6, marginBottom: 20 }}>
                        Confirm to allow the customer to proceed to payment. Decline if dates don&apos;t work.
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <button
                          onClick={() => handleAction("confirmed")}
                          disabled={acting}
                          className="btn btn-primary"
                          style={{ height: 44, width: "100%" }}
                        >
                          {acting ? <Icon icon="ph:spinner" width={16} className="animate-spin" /> : (
                            <>
                              <Icon icon="ph:check" width={14} aria-hidden="true" />
                              Confirm booking
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleAction("declined")}
                          disabled={acting}
                          className="btn btn-danger"
                          style={{ height: 44, width: "100%" }}
                        >
                          <Icon icon="ph:x" width={14} aria-hidden="true" />
                          Decline
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
