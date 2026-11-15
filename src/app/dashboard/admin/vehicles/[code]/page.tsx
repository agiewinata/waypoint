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

const VEHICLE = {
  code: "WP-7740",
  make: "Daihatsu",
  model: "Terios",
  year: 2021,
  type: "SUV",
  city: "Bogor",
  plate: "F 5566 AB",
  VIN: "MHFA2BHR1LJ012345",
  price: 350000,
  status: "Pending",
  owner: "Dimas Raharjo",
  ownerVerified: true,
  submittedAt: "2026-11-11 · 09:30",
  docs: [
    { type: "STNK", label: "Vehicle registration (STNK)", status: "Pending" },
    { type: "Insurance", label: "Insurance certificate",   status: "Pending" },
  ],
};

type Decision = "Approved" | "Rejected" | null;

export default function AdminVehicleApprovalPage() {
  const [decision, setDecision] = useState<Decision>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [acting, setActing] = useState(false);
  const [decryptedDoc, setDecryptedDoc] = useState<string | null>(null);

  async function handleDecision(d: Decision) {
    setActing(true);
    await new Promise((r) => setTimeout(r, 900));
    setDecision(d);
    setActing(false);
    setShowRejectForm(false);
  }

  function handleViewDoc(type: string) {
    setDecryptedDoc(type);
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
                  { label: "Vehicles", href: "/dashboard/admin/vehicles" },
                  { label: VEHICLE.code },
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
                  <span className="kicker" style={{ marginBottom: 6, display: "block" }}>Vehicle approval · {VEHICLE.code}</span>
                  <h1
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 28,
                      fontWeight: 700,
                      letterSpacing: "-0.025em",
                      color: "var(--ink)",
                    }}
                  >
                    {VEHICLE.year} {VEHICLE.make} {VEHICLE.model}
                  </h1>
                </div>
                <StatusTag status={decision ?? VEHICLE.status} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr min(280px,100%)", gap: 32, alignItems: "start" }}>
                {/* Left — vehicle details + documents */}
                <div>
                  {/* Vehicle specs */}
                  <div style={{ border: "1px solid var(--line)", marginBottom: 24 }}>
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", background: "var(--hover)" }}>
                      <span className="kicker">Vehicle details</span>
                    </div>
                    <div style={{ padding: "0 16px" }}>
                      {[
                        { label: "Code",    value: VEHICLE.code  },
                        { label: "VIN",     value: VEHICLE.VIN   },
                        { label: "Plate",   value: VEHICLE.plate },
                        { label: "Type",    value: VEHICLE.type  },
                        { label: "City",    value: VEHICLE.city  },
                        { label: "Price",   value: `RP ${VEHICLE.price.toLocaleString("id-ID")}/day` },
                        { label: "Owner",   value: VEHICLE.owner },
                        { label: "Submitted", value: VEHICLE.submittedAt },
                      ].map((r) => (
                        <div key={r.label} className="spec-row">
                          <span className="spec-label">{r.label}</span>
                          <span className="spec-value">{r.value}</span>
                        </div>
                      ))}
                      <div className="spec-row">
                        <span className="spec-label">Owner status</span>
                        <span className="spec-value">
                          <StatusTag status={VEHICLE.ownerVerified ? "Verified" : "Unverified"} />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  <div style={{ border: "1px solid var(--line)", marginBottom: 24 }}>
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", background: "var(--hover)" }}>
                      <span className="kicker">Uploaded documents</span>
                    </div>
                    {VEHICLE.docs.map((doc, i) => (
                      <div
                        key={doc.type}
                        style={{
                          padding: "14px 16px",
                          borderBottom: i < VEHICLE.docs.length - 1 ? "1px solid var(--line)" : "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: 10,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{doc.label}</div>
                          <StatusTag status={doc.status} />
                        </div>
                        <button
                          onClick={() => handleViewDoc(doc.type)}
                          className="btn btn-ghost"
                          style={{ fontSize: 11 }}
                        >
                          <Icon icon="ph:eye" width={13} aria-hidden="true" />
                          Decrypt & view
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Decrypted doc viewer */}
                  <AnimatePresence>
                    {decryptedDoc && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ border: "1px solid var(--ok)", marginBottom: 24, overflow: "hidden" }}
                      >
                        <div
                          style={{
                            padding: "10px 16px",
                            borderBottom: "1px solid var(--ok)",
                            background: "rgba(28,107,70,0.06)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ok)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                            <Icon icon="ph:lock-open" width={12} style={{ display: "inline", marginRight: 6 }} aria-hidden="true" />
                            Decrypted for this review · access logged
                          </span>
                          <button onClick={() => setDecryptedDoc(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--slate)" }} aria-label="Close">
                            <Icon icon="ph:x" width={14} />
                          </button>
                        </div>
                        <div
                          className="photo-placeholder"
                          style={{ height: 200 }}
                        >
                          <div style={{ textAlign: "center" }}>
                            <Icon icon="ph:file-text" width={36} style={{ color: "var(--slate)", opacity: 0.5, marginBottom: 8 }} aria-hidden="true" />
                            <div className="kicker">{decryptedDoc} document preview</div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Right — decision card */}
                <div style={{ border: "1px solid var(--ink)", background: "var(--surface)" }}>
                  <div style={{ borderBottom: "1px solid var(--ink)", padding: "14px 18px" }}>
                    <span className="kicker">Admin decision</span>
                  </div>
                  <div style={{ padding: "20px 18px" }}>
                    <AnimatePresence mode="wait">
                      {decision ? (
                        <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                          <div style={{ textAlign: "center", padding: "10px 0" }}>
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                border: `1px solid ${decision === "Approved" ? "var(--ok)" : "var(--alert)"}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto 12px",
                              }}
                            >
                              <Icon icon={decision === "Approved" ? "ph:check" : "ph:x"} width={22} style={{ color: decision === "Approved" ? "var(--ok)" : "var(--alert)" }} />
                            </div>
                            <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
                              Vehicle {decision}
                            </div>
                            <p style={{ color: "var(--slate)", fontSize: 13, lineHeight: 1.6 }}>
                              {decision === "Approved"
                                ? "The vehicle is now live and bookable by customers."
                                : "The owner has been notified with your rejection note."}
                            </p>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <p style={{ fontSize: 13, color: "var(--slate)", lineHeight: 1.6, marginBottom: 20 }}>
                            Review all documents before approving. Approved vehicles become immediately bookable.
                          </p>

                          <AnimatePresence>
                            {showRejectForm && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{ marginBottom: 14, overflow: "hidden" }}
                              >
                                <label className="field-label" htmlFor="reject-note">Rejection reason</label>
                                <textarea
                                  id="reject-note"
                                  rows={3}
                                  value={rejectionNote}
                                  onChange={(e) => setRejectionNote(e.target.value)}
                                  className="input"
                                  placeholder="Explain why the vehicle was rejected..."
                                  style={{ resize: "none" }}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <button
                              onClick={() => handleDecision("Approved")}
                              disabled={acting}
                              className="btn btn-primary"
                              style={{ height: 44, width: "100%" }}
                            >
                              {acting ? <Icon icon="ph:spinner" width={16} className="animate-spin" /> : (
                                <>
                                  <Icon icon="ph:check" width={14} aria-hidden="true" />
                                  Approve vehicle
                                </>
                              )}
                            </button>
                            {showRejectForm ? (
                              <button
                                onClick={() => handleDecision("Rejected")}
                                disabled={acting || !rejectionNote.trim()}
                                className="btn btn-danger"
                                style={{ height: 44, width: "100%" }}
                              >
                                Confirm rejection
                              </button>
                            ) : (
                              <button
                                onClick={() => setShowRejectForm(true)}
                                className="btn btn-danger"
                                style={{ height: 44, width: "100%" }}
                              >
                                <Icon icon="ph:x" width={14} aria-hidden="true" />
                                Reject
                              </button>
                            )}
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
