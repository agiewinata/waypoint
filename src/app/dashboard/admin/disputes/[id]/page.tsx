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
  { label: "Overview",      href: "/dashboard/admin",                    icon: "ph:squares-four" },
  { label: "Verifications", href: "/dashboard/admin/verifications",      icon: "ph:identification-card", badge: 3 },
  { label: "Vehicles",      href: "/dashboard/admin/vehicles",           icon: "ph:car", badge: 2 },
  { label: "Disputes",      href: "/dashboard/admin/disputes",           icon: "ph:scales", badge: 1 },
  { label: "Bookings",      href: "/dashboard/admin/bookings",           icon: "ph:clipboard-text" },
  { label: "Users",         href: "/dashboard/admin/users",              icon: "ph:users" },
];

const DISPUTE = {
  id: "DS-021",
  booking: "BK-0988",
  vehicle: "2023 Honda Brio",
  raisedBy: "Rentee" as "Renter" | "Rentee",
  raisedByName: "Rudi Santoso",
  otherParty: "Honda Brio owner",
  description: "The car had a large scratch on the rear bumper that was not disclosed in the listing. I am requesting a partial refund of RP 125,000 to cover repair costs.",
  status: "Open" as "Open" | "UnderReview" | "Resolved" | "Rejected",
  createdAt: "2026-11-10 · 09:15",
  escrowAmount: 500000,
};

type Resolution = "Resolved" | "Rejected" | null;

export default function AdminDisputeCasePage() {
  const [status, setStatus] = useState<"Open" | "UnderReview" | "Resolved" | "Rejected">(DISPUTE.status);
  const [resolution, setResolution] = useState<Resolution>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [acting, setActing] = useState(false);

  async function handleTakeReview() {
    setActing(true);
    await new Promise((r) => setTimeout(r, 600));
    setStatus("UnderReview");
    setActing(false);
  }

  async function handleResolve(type: Resolution) {
    if (!type) return;
    setActing(true);
    await new Promise((r) => setTimeout(r, 900));
    setStatus(type);
    setResolution(type);
    setActing(false);
  }

  return (
    <>
      <Header variant="ink" userName="Admin" userInitials="WA" />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container">
          <div className="dashboard-layout">
            <div className="dashboard-sidebar">
              <SideNav
                items={NAV_ITEMS}
                userName="Waypoint Admin"
                userRole="Administrator"
                userInitials="WA"
              />
            </div>

            <div className="dashboard-content">
              <Breadcrumb
                crumbs={[
                  { label: "Admin", href: "/dashboard/admin" },
                  { label: "Disputes", href: "/dashboard/admin/disputes" },
                  { label: DISPUTE.id },
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
                  <span className="kicker" style={{ marginBottom: 6, display: "block" }}>
                    Dispute case · {DISPUTE.id}
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
                    {DISPUTE.vehicle}
                  </h1>
                </div>
                <StatusTag status={status} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr min(280px,100%)", gap: 32, alignItems: "start" }}>
                {/* Left */}
                <div>
                  {/* Dispute details */}
                  <div style={{ border: "1px solid var(--line)", marginBottom: 24 }}>
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", background: "var(--hover)" }}>
                      <span className="kicker">Case details</span>
                    </div>
                    <div style={{ padding: "0 16px" }}>
                      {[
                        { label: "Dispute ID",  value: DISPUTE.id },
                        { label: "Booking",     value: DISPUTE.booking },
                        { label: "Vehicle",     value: DISPUTE.vehicle },
                        { label: "Raised by",   value: `${DISPUTE.raisedByName} (Customer)` },
                        { label: "Other party", value: DISPUTE.otherParty },
                        { label: "Escrow",      value: `RP ${DISPUTE.escrowAmount.toLocaleString("id-ID")} held` },
                        { label: "Opened",      value: DISPUTE.createdAt },
                      ].map((r) => (
                        <div key={r.label} className="spec-row">
                          <span className="spec-label">{r.label}</span>
                          <span className="spec-value">{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div style={{ border: "1px solid var(--line)", marginBottom: 24 }}>
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", background: "var(--hover)" }}>
                      <span className="kicker">Customer&apos;s description</span>
                    </div>
                    <div style={{ padding: "16px 16px" }}>
                      <p style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.7 }}>
                        &ldquo;{DISPUTE.description}&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Evidence */}
                  <div style={{ border: "1px solid var(--line)", marginBottom: 24 }}>
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", background: "var(--hover)" }}>
                      <span className="kicker">Evidence submitted</span>
                    </div>
                    <div style={{ padding: "16px 16px", display: "flex", gap: 10 }}>
                      {["Photo 1", "Photo 2"].map((ph) => (
                        <div
                          key={ph}
                          className="photo-placeholder"
                          style={{
                            width: 100,
                            height: 80,
                            border: "1px solid var(--line)",
                            cursor: "pointer",
                          }}
                        >
                          <Icon icon="ph:image" width={24} style={{ color: "var(--slate)", opacity: 0.4 }} aria-hidden="true" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right — resolution panel */}
                <div style={{ border: "1px solid var(--ink)", background: "var(--surface)" }}>
                  <div style={{ borderBottom: "1px solid var(--ink)", padding: "14px 18px" }}>
                    <span className="kicker">Admin resolution</span>
                  </div>
                  <div style={{ padding: "20px 18px" }}>
                    <AnimatePresence mode="wait">
                      {resolution ? (
                        <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", padding: "10px 0" }}>
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              border: `1px solid ${resolution === "Resolved" ? "var(--ok)" : "var(--done)"}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              margin: "0 auto 12px",
                            }}
                          >
                            <Icon icon={resolution === "Resolved" ? "ph:check" : "ph:x"} width={22} style={{ color: resolution === "Resolved" ? "var(--ok)" : "var(--done)" }} />
                          </div>
                          <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
                            Dispute {resolution}
                          </div>
                          <p style={{ color: "var(--slate)", fontSize: 13, lineHeight: 1.6 }}>
                            {resolution === "Resolved"
                              ? "Escrow has been adjusted accordingly and both parties notified."
                              : "The dispute was rejected. Escrow will be released normally."}
                          </p>
                        </motion.div>
                      ) : status === "Open" ? (
                        <motion.div key="take" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <p style={{ fontSize: 13, color: "var(--slate)", lineHeight: 1.6, marginBottom: 20 }}>
                            Take this case under review before making a decision.
                          </p>
                          <button
                            onClick={handleTakeReview}
                            disabled={acting}
                            className="btn btn-primary"
                            style={{ height: 44, width: "100%" }}
                          >
                            {acting ? <Icon icon="ph:spinner" width={16} className="animate-spin" /> : (
                              <>
                                <Icon icon="ph:magnifying-glass" width={14} aria-hidden="true" />
                                Take under review
                              </>
                            )}
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div key="resolve" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <div style={{ marginBottom: 16 }}>
                            <label className="field-label" htmlFor="resolve-note">Resolution note</label>
                            <textarea
                              id="resolve-note"
                              rows={4}
                              value={resolutionNote}
                              onChange={(e) => setResolutionNote(e.target.value)}
                              className="input"
                              placeholder="Explain your decision — this is shared with both parties."
                              style={{ resize: "none" }}
                            />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <button
                              onClick={() => handleResolve("Resolved")}
                              disabled={acting || !resolutionNote.trim()}
                              className="btn btn-primary"
                              style={{ height: 44, width: "100%" }}
                            >
                              {acting ? <Icon icon="ph:spinner" width={16} className="animate-spin" /> : (
                                <>
                                  <Icon icon="ph:check" width={14} aria-hidden="true" />
                                  Mark as Resolved
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleResolve("Rejected")}
                              disabled={acting || !resolutionNote.trim()}
                              className="btn btn-ghost"
                              style={{ height: 44, width: "100%" }}
                            >
                              Reject dispute
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
