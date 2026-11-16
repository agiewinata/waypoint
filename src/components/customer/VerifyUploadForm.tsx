"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { StatusTag } from "@/components/ui/StatusTag";
import type { DocumentStatusDTO } from "@/server/documents";

interface Props {
  renteeID: string;
  ktpDoc: DocumentStatusDTO | null;
  simDoc: DocumentStatusDTO | null;
}

interface DocUploadState {
  uploading: boolean;
  error: string | null;
  /** Status updated after a successful upload; overrides the prop value. */
  uploadedStatus: "Pending" | null;
}

const INITIAL_STATE: DocUploadState = {
  uploading: false,
  error: null,
  uploadedStatus: null,
};

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export function VerifyUploadForm({ ktpDoc, simDoc }: Props) {
  const [ktpState, setKtpState] = useState<DocUploadState>(INITIAL_STATE);
  const [simState, setSimState] = useState<DocUploadState>(INITIAL_STATE);

  async function handleUpload(type: "KTP" | "SIM", file: File) {
    const setState = type === "KTP" ? setKtpState : setSimState;

    // Client-side validation
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setState((s) => ({ ...s, error: "Only JPEG, PNG or PDF files are accepted." }));
      return;
    }
    if (file.size > MAX_BYTES) {
      setState((s) => ({ ...s, error: "File must be 5 MB or smaller." }));
      return;
    }

    setState({ uploading: true, error: null, uploadedStatus: null });

    try {
      const form = new FormData();
      form.append("type", type);
      form.append("file", file);

      const res = await fetch("/api/documents", { method: "POST", body: form });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setState({
          uploading: false,
          error: body.error ?? "Upload failed. Please try again.",
          uploadedStatus: null,
        });
        return;
      }

      setState({ uploading: false, error: null, uploadedStatus: "Pending" });
    } catch {
      setState({ uploading: false, error: "Network error. Please try again.", uploadedStatus: null });
    }
  }

  const docs = [
    {
      type: "KTP" as const,
      label: "National ID (KTP)",
      hint: "Front side of your national identity card",
      existingDoc: ktpDoc,
      state: ktpState,
    },
    {
      type: "SIM" as const,
      label: "Driver's licence (SIM)",
      hint: "Front side of your driver's licence (SIM A or SIM C)",
      existingDoc: simDoc,
      state: simState,
    },
  ];

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {docs.map((doc) => {
          const effectiveStatus = doc.state.uploadedStatus ?? doc.existingDoc?.status ?? null;
          // Upload is blocked when doc is already Pending or Verified
          const disabled = effectiveStatus === "Pending" || effectiveStatus === "Verified";

          const borderColor =
            effectiveStatus === "Pending"
              ? "var(--wait)"
              : effectiveStatus === "Verified"
              ? "var(--ok)"
              : effectiveStatus === "Rejected"
              ? "var(--alert)"
              : "var(--line)";

          return (
            <div
              key={doc.type}
              style={{ border: `1px solid ${borderColor}`, padding: "20px" }}
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
                {effectiveStatus && <StatusTag status={effectiveStatus} />}
              </div>

              {/* Upload area — hidden when Pending or Verified */}
              {!disabled && (
                <>
                  <label
                    htmlFor={`upload-${doc.type}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 16px",
                      border: "1px dashed var(--line)",
                      cursor: doc.state.uploading ? "wait" : "pointer",
                      background: "var(--hover)",
                    }}
                  >
                    {doc.state.uploading ? (
                      <Icon
                        icon="ph:spinner"
                        width={20}
                        style={{ color: "var(--slate)" }}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Icon
                        icon="ph:upload-simple"
                        width={20}
                        style={{ color: "var(--slate)" }}
                        aria-hidden="true"
                      />
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
                      {doc.state.uploading ? "Uploading…" : `Upload ${doc.type}`}
                    </span>
                  </label>
                  <input
                    id={`upload-${doc.type}`}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    disabled={doc.state.uploading}
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleUpload(doc.type, f);
                      // Reset so the same file can be re-selected after an error
                      e.target.value = "";
                    }}
                  />
                </>
              )}

              {/* Rejection note — shown when doc was rejected and not yet re-uploaded */}
              {effectiveStatus === "Rejected" && doc.state.uploadedStatus === null && (
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
                  Document rejected — please upload a clearer or more recent copy.
                </div>
              )}

              {doc.state.error && (
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
                  {doc.state.error}
                </div>
              )}
            </div>
          );
        })}
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
        <Icon
          icon="ph:lock"
          width={14}
          style={{ color: "var(--slate)", marginTop: 1, flexShrink: 0 }}
          aria-hidden="true"
        />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--slate)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            lineHeight: 1.6,
          }}
        >
          Files are AES-256-GCM encrypted at rest · decrypted only during authorised admin
          review · access logged
        </span>
      </div>
    </div>
  );
}
