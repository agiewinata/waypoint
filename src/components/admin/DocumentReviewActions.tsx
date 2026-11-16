"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { StatusTag } from "@/components/ui/StatusTag";

interface DocumentReviewActionsProps {
  documentId: string;
  documentType: string;
  currentStatus: string;
}

export function DocumentReviewActions({
  documentId,
  documentType,
  currentStatus,
}: DocumentReviewActionsProps) {
  const [status, setStatus] = useState(currentStatus);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPending = status === "Pending";

  async function handleAction(action: "verify" | "reject") {
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? `Error ${res.status}`);
        return;
      }
      const data = (await res.json()) as { status?: string };
      setStatus(data.status ?? (action === "verify" ? "Verified" : "Rejected"));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActing(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {/* View file opens in a new tab; documented type shown in aria-label */}
      <a
        href={`/api/documents/${documentId}/file`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-ghost"
        style={{ fontSize: 11, height: 30, padding: "0 10px" }}
        aria-label={`View ${documentType} file`}
      >
        <Icon icon="ph:eye" width={12} aria-hidden="true" />
        View file
      </a>

      {isPending ? (
        <>
          <button
            onClick={() => handleAction("verify")}
            disabled={acting}
            className="btn btn-primary"
            style={{ fontSize: 11, height: 30, padding: "0 10px" }}
          >
            {acting ? (
              <Icon icon="ph:spinner" width={12} className="animate-spin" />
            ) : (
              "Verify"
            )}
          </button>
          <button
            onClick={() => handleAction("reject")}
            disabled={acting}
            className="btn btn-danger"
            style={{ fontSize: 11, height: 30, padding: "0 10px" }}
          >
            Reject
          </button>
        </>
      ) : (
        <StatusTag status={status} />
      )}

      {error && (
        <span
          role="alert"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--alert)",
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
