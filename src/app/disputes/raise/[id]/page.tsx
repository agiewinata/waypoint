"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { Header } from "@/components/ui/Header";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

export const dynamic = "force-dynamic";

const BOOKING = {
  id: "BK-1182",
  vehicle: "2022 Toyota Avanza",
  total: 960000,
};

export default function RaiseDisputePage() {
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSubmitted(true);
    setSubmitting(false);
  }

  return (
    <>
      <Header userName="Andi Pratama" userInitials="AP" />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container" style={{ maxWidth: 640 }}>
          <Breadcrumb
            crumbs={[
              { label: "Dashboard", href: "/dashboard/customer" },
              { label: `Trip ${BOOKING.id}`, href: `/trips/${BOOKING.id}` },
              { label: "Raise dispute" },
            ]}
          />

          <div style={{ borderBottom: "1px solid var(--ink)", paddingBottom: 16, marginBottom: 32 }}>
            <span className="kicker" style={{ marginBottom: 6, display: "block", color: "var(--alert)" }}>
              Dispute · {BOOKING.id}
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
              Raise a dispute
            </h1>
            <p style={{ color: "var(--slate)", fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
              For booking <strong style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{BOOKING.id}</strong> · {BOOKING.vehicle}.
              Waypoint will review and mediate.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="ok"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  border: "1px solid var(--wait)",
                  padding: "36px 28px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    border: "1px solid var(--wait)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon icon="ph:flag" width={26} style={{ color: "var(--wait)" }} />
                </div>
                <div>
                  <h2
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 22,
                      fontWeight: 700,
                      color: "var(--ink)",
                      marginBottom: 8,
                    }}
                  >
                    Dispute opened
                  </h2>
                  <p style={{ color: "var(--slate)", fontSize: 14, lineHeight: 1.6 }}>
                    Our team has been notified. We&apos;ll review and respond within 24 hours. Escrow is frozen until resolved.
                  </p>
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    border: "1px solid var(--line)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--slate)",
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                  }}
                >
                  Status: Under review · Escrow frozen
                </div>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleSubmit}
              >
                {/* Alert */}
                <div
                  style={{
                    border: "1px solid var(--alert)",
                    padding: "12px 16px",
                    display: "flex",
                    gap: 10,
                    marginBottom: 24,
                  }}
                >
                  <Icon icon="ph:warning" width={16} style={{ color: "var(--alert)", marginTop: 1, flexShrink: 0 }} aria-hidden="true" />
                  <p style={{ fontSize: 13, color: "var(--alert)", lineHeight: 1.6 }}>
                    Opening a dispute will pause escrow release. Only proceed if there is a genuine issue.
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <label className="field-label" htmlFor="dispute-desc">
                      Describe the issue
                    </label>
                    <textarea
                      id="dispute-desc"
                      required
                      rows={6}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Explain what happened — be specific. Include dates, times, and any evidence you can describe."
                      className="input"
                      style={{ resize: "vertical", lineHeight: 1.6 }}
                    />
                    <div
                      style={{
                        marginTop: 4,
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--slate)",
                        textAlign: "right",
                      }}
                    >
                      {description.length} / 1000
                    </div>
                  </div>

                  <div>
                    <label className="field-label">Evidence (optional)</label>
                    <label
                      htmlFor="dispute-evidence"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "12px 16px",
                        border: "1px dashed var(--line)",
                        cursor: "pointer",
                        background: "var(--hover)",
                      }}
                    >
                      <Icon icon="ph:paperclip" width={16} style={{ color: "var(--slate)" }} aria-hidden="true" />
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--slate)" }}>
                        Attach photos / documents
                      </span>
                    </label>
                    <input
                      id="dispute-evidence"
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      style={{ display: "none" }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button
                    type="submit"
                    disabled={submitting || !description.trim()}
                    className="btn btn-danger"
                    style={{ height: 44 }}
                  >
                    {submitting ? (
                      <Icon icon="ph:spinner" width={16} className="animate-spin" />
                    ) : (
                      <>
                        <Icon icon="ph:flag" width={14} aria-hidden="true" />
                        Submit dispute
                      </>
                    )}
                  </button>
                  <a href={`/trips/${BOOKING.id}`} className="btn btn-ghost" style={{ height: 44 }}>
                    Cancel
                  </a>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}
