"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { StatusTag } from "@/components/ui/StatusTag";
import { uploadDocumentClient } from "@/lib/upload-client";
import type { DocumentStatusDTO } from "@/server/documents";

export interface IdentityDocConfig {
  type: "KTP" | "SIM" | "BPKB";
  label: string;
  hint: string;
  existing: DocumentStatusDTO | null;
}

interface Props {
  subject: "owner" | "customer";
  docs: IdentityDocConfig[];
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

export function IdentityUploadForm({ subject, docs }: Props) {
  const router = useRouter();
  const [states, setStates] = useState<Record<string, DocUploadState>>({});

  function setDocState(type: string, next: DocUploadState) {
    setStates((prev) => ({ ...prev, [type]: next }));
  }

  async function handleUpload(type: IdentityDocConfig["type"], file: File) {
    setDocState(type, { uploading: true, error: null, uploadedStatus: null });

    // BPKB is always an owner document; KTP and SIM follow the page subject
    const result = await uploadDocumentClient(file, {
      type,
      as: type === "BPKB" ? "owner" : subject,
    });

    if (!result.ok) {
      setDocState(type, { uploading: false, error: result.error, uploadedStatus: null });
      return;
    }

    setDocState(type, { uploading: false, error: null, uploadedStatus: "Pending" });
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {docs.map((doc) => {
          const state = states[doc.type] ?? INITIAL_STATE;
          const effectiveStatus = state.uploadedStatus ?? doc.existing?.status ?? null;
          // Re-upload is allowed only when the doc is missing or Rejected
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
                      cursor: state.uploading ? "wait" : "pointer",
                      background: "var(--hover)",
                    }}
                  >
                    {state.uploading ? (
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
                      {state.uploading ? "Uploading…" : `Upload ${doc.type}`}
                    </span>
                  </label>
                  <input
                    id={`upload-${doc.type}`}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    disabled={state.uploading}
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
              {effectiveStatus === "Rejected" && state.uploadedStatus === null && (
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

              {state.error && (
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
                  {state.error}
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
