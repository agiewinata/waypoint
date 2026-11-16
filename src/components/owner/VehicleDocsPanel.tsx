"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { StatusTag } from "@/components/ui/StatusTag";
import { uploadDocumentClient } from "@/lib/upload-client";
import type { OwnerVehicleDetail } from "@/server/vehicles";

// ── Types ────────────────────────────────────────────────────────────────────

type DocEntry = OwnerVehicleDetail["docs"][number];
type VehicleDocType = "STNK" | "Insurance";

export interface VehicleDocsPanelProps {
  listingCode: string;
  status: string;
  docs: DocEntry[];
}

const DOC_SLOTS: { type: VehicleDocType; label: string; hint: string }[] = [
  { type: "STNK", label: "STNK (vehicle registration)", hint: "Front side of your STNK document" },
  { type: "Insurance", label: "Insurance certificate", hint: "Valid insurance coverage document" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

// The server returns docs ordered by createdAt ascending, so the last match is the latest.
function latestDoc(docs: DocEntry[], type: VehicleDocType): DocEntry | null {
  let latest: DocEntry | null = null;
  for (const d of docs) {
    if (d.type === type) latest = d;
  }
  return latest;
}

async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as Record<string, unknown>;
    const msg = json["error"] ?? json["message"];
    if (typeof msg === "string" && msg.length > 0) return msg;
  } catch {
    // ignore JSON parse failure — fall through to generic message
  }
  return `Request failed with status ${res.status}`;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function VehicleDocsPanel({ listingCode, status, docs }: VehicleDocsPanelProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState<VehicleDocType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = status === "Draft" || status === "Rejected";
  const canSubmit =
    canEdit &&
    DOC_SLOTS.every((slot) => {
      const doc = latestDoc(docs, slot.type);
      return doc !== null && (doc.status === "Pending" || doc.status === "Verified");
    });

  async function handleUpload(type: VehicleDocType, file: File) {
    setError(null);
    setUploading(type);
    const result = await uploadDocumentClient(file, { type, listingCode });
    setUploading(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/vehicles/${listingCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      });
      if (!res.ok) {
        setError(await extractErrorMessage(res));
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ border: "1px solid var(--line)" }}>
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--line)",
          background: "var(--hover)",
        }}
      >
        <span className="kicker">Vehicle documents</span>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            margin: 16,
            padding: "12px 14px",
            border: "1px solid var(--alert)",
            color: "var(--alert)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {DOC_SLOTS.map((slot, i) => {
        const doc = latestDoc(docs, slot.type);
        const needsUpload = canEdit && (doc === null || doc.status === "Rejected");
        const inputId = `doc-upload-${slot.type.toLowerCase()}`;

        return (
          <div
            key={slot.type}
            style={{
              padding: "14px 16px",
              borderBottom: i < DOC_SLOTS.length - 1 ? "1px solid var(--line)" : "none",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{slot.label}</span>
              {doc ? (
                <StatusTag status={doc.status} />
              ) : (
                <span style={{ fontSize: 12, color: "var(--slate)" }}>Not uploaded</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "var(--slate)", marginBottom: needsUpload ? 10 : 0 }}>
              {slot.hint}
            </div>

            {needsUpload && (
              <>
                <label
                  htmlFor={inputId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    border: "1px dashed var(--line)",
                    cursor: uploading ? "default" : "pointer",
                    background: "var(--hover)",
                    opacity: uploading ? 0.6 : 1,
                  }}
                >
                  <Icon icon="ph:upload-simple" width={16} style={{ color: "var(--slate)" }} aria-hidden="true" />
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      color: "var(--slate)",
                    }}
                  >
                    {uploading === slot.type ? "Uploading…" : `Upload ${slot.type}`}
                  </span>
                </label>
                <input
                  id={inputId}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  disabled={uploading !== null}
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload(slot.type, file);
                    e.target.value = "";
                  }}
                />
                <p style={{ fontSize: 12, color: "var(--done)", marginTop: 6 }}>
                  JPEG, PNG, or PDF · max 5 MB · encrypted at rest
                </p>
              </>
            )}
          </div>
        );
      })}

      {canSubmit && (
        <div style={{ padding: "14px 16px", borderTop: "1px solid var(--line)" }}>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || uploading !== null}
            className="btn btn-primary"
            style={{ fontSize: 11, width: "100%", justifyContent: "center" }}
          >
            <Icon icon="ph:paper-plane-tilt" width={14} aria-hidden="true" />
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        </div>
      )}
    </div>
  );
}
