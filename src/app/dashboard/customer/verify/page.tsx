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
  { label: "My Trips",     href: "/dashboard/customer",          icon: "ph:car" },
  { label: "Verification", href: "/dashboard/customer/verify",   icon: "ph:identification-card", badge: 1 },
  { label: "Messages",     href: "/messages",                     icon: "ph:chat-dots" },
  { label: "Notifications",href: "/notifications",                icon: "ph:bell" },
  { label: "Account",      href: "/account",                      icon: "ph:user" },
];

interface DocUpload {
  type: "KTP" | "SIM";
  label: string;
  hint: string;
  status: "none" | "uploading" | "pending" | "verified" | "rejected";
  file?: File;
}

export default function VerificationPage() {
  const [docs, setDocs] = useState<DocUpload[]>([
    { type: "KTP", label: "National ID (KTP)", hint: "Front side of your national identity card", status: "none" },
    { type: "SIM", label: "Driver's licence (SIM)", hint: "Front side of your driver's licence (SIM A or SIM C)", status: "pending" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleFile(type: "KTP" | "SIM", file: File) {
    setDocs((prev) =>
      prev.map((d) =>
        d.type === type ? { ...d, file, status: "uploading" } : d
      )
    );
    setTimeout(() => {
      setDocs((prev) =>
        prev.map((d) => (d.type === type ? { ...d, status: "none" } : d))
      );
    }, 800);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitted(true);
    setSubmitting(false);
  }

  const allReady = docs.every(
    (d) => d.status === "none" && d.file !== undefined
  ) || docs.some((d) => d.status === "pending");

  return (
    <>
      <Header userName="Andi Pratama" userInitials="AP" />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container">
          <div className="dashboard-layout">
            <div className="dashboard-sidebar">
              <SideNav
                items={NAV_ITEMS}
                userName="Andi Pratama"
                userRole="Customer"
                userInitials="AP"
                switchRoleHref="/dashboard/owner"
              />
            </div>

            <div className="dashboard-content">
              <Breadcrumb
                crumbs={[
                  { label: "Dashboard", href: "/dashboard/customer" },
                  { label: "Identity verification" },
                ]}
              />

              <div
                style={{
                  borderBottom: "1px solid var(--ink)",
                  paddingBottom: 16,
                  marginBottom: 32,
                }}
              >
                <span className="kicker" style={{ marginBottom: 6, display: "block" }}>
                  Customer · Identity
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
                  Verify your identity
                </h1>
                <p style={{ color: "var(--slate)", fontSize: 14, marginTop: 8, lineHeight: 1.6, maxWidth: 520 }}>
                  Upload your KTP and SIM. Documents are encrypted at rest and viewed only by Waypoint admins during review. Access is logged.
                </p>
              </div>

              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      border: "1px solid var(--ok)",
                      padding: "36px 28px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      gap: 16,
                      maxWidth: 480,
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        border: "1px solid var(--ok)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon icon="ph:check" width={28} style={{ color: "var(--ok)" }} />
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
                        Documents submitted
                      </h2>
                      <p style={{ color: "var(--slate)", fontSize: 14, lineHeight: 1.6 }}>
                        Our team will review your documents within 2 hours. You&apos;ll be notified when verification is complete.
                      </p>
                    </div>
                    <StatusTag status="Pending" />
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onSubmit={handleSubmit}
                    style={{ maxWidth: 560 }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {docs.map((doc) => (
                        <div
                          key={doc.type}
                          style={{
                            border: `1px solid ${doc.status === "pending" ? "var(--wait)" : doc.status === "verified" ? "var(--ok)" : doc.status === "rejected" ? "var(--alert)" : "var(--line)"}`,
                            padding: "20px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: 12,
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontFamily: "var(--font-display)",
                                  fontSize: 16,
                                  fontWeight: 700,
                                  color: "var(--ink)",
                                }}
                              >
                                {doc.label}
                              </div>
                              <div style={{ fontSize: 13, color: "var(--slate)", marginTop: 2 }}>
                                {doc.hint}
                              </div>
                            </div>
                            {doc.status !== "none" && doc.status !== "uploading" && (
                              <StatusTag status={doc.status === "pending" ? "Pending" : doc.status === "verified" ? "Verified" : "Rejected"} />
                            )}
                          </div>

                          {/* Upload area */}
                          <label
                            htmlFor={`upload-${doc.type}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              padding: "14px 16px",
                              border: "1px dashed var(--line)",
                              cursor: "pointer",
                              background: "var(--hover)",
                              transition: "border-color .15s",
                            }}
                          >
                            {doc.status === "uploading" ? (
                              <Icon icon="ph:spinner" width={20} style={{ color: "var(--slate)" }} className="animate-spin" aria-hidden="true" />
                            ) : doc.file ? (
                              <Icon icon="ph:file-text" width={20} style={{ color: "var(--ok)" }} aria-hidden="true" />
                            ) : (
                              <Icon icon="ph:upload-simple" width={20} style={{ color: "var(--slate)" }} aria-hidden="true" />
                            )}
                            <span
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: 11,
                                letterSpacing: "0.07em",
                                textTransform: "uppercase",
                                color: "var(--slate)",
                              }}
                            >
                              {doc.file ? doc.file.name : `Upload ${doc.type}`}
                            </span>
                          </label>
                          <input
                            id={`upload-${doc.type}`}
                            type="file"
                            accept="image/*,.pdf"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFile(doc.type, f);
                            }}
                          />

                          {doc.status === "rejected" && (
                            <div
                              style={{
                                marginTop: 10,
                                padding: "8px 12px",
                                border: "1px solid var(--alert)",
                                fontFamily: "var(--font-mono)",
                                fontSize: 11,
                                color: "var(--alert)",
                                letterSpacing: "0.06em",
                              }}
                            >
                              Rejected: document is blurry or expired. Please re-upload.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Encryption notice */}
                    <div
                      style={{
                        marginTop: 20,
                        padding: "12px 14px",
                        border: "1px solid var(--line)",
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                      }}
                    >
                      <Icon icon="ph:lock" width={14} style={{ color: "var(--slate)", marginTop: 1, flexShrink: 0 }} aria-hidden="true" />
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--slate)", letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.6 }}>
                        Files are AES-256-GCM encrypted at rest · decrypted only during authorised admin review · access logged
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn btn-primary"
                      style={{ marginTop: 24, height: 44 }}
                    >
                      {submitting ? (
                        <Icon icon="ph:spinner" width={16} className="animate-spin" />
                      ) : (
                        "Submit for review"
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
