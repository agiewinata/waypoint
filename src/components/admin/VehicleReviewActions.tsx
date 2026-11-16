"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { StatusTag } from "@/components/ui/StatusTag";

interface VehicleReviewActionsProps {
  listingCode: string;
  currentStatus: string;
}

export function VehicleReviewActions({
  listingCode,
  currentStatus,
}: VehicleReviewActionsProps) {
  const [status, setStatus] = useState(currentStatus);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPending = status === "Pending";

  async function handleAction(action: "approve" | "reject") {
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/vehicles/${listingCode}`, {
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
      setStatus(data.status ?? (action === "approve" ? "Approved" : "Rejected"));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActing(false);
    }
  }

  if (!isPending) {
    return (
      <div style={{ border: "1px solid var(--ink)", background: "var(--surface)" }}>
        <div style={{ borderBottom: "1px solid var(--ink)", padding: "14px 18px" }}>
          <span className="kicker">Admin decision</span>
        </div>
        <div style={{ padding: "20px 18px", textAlign: "center" }}>
          <div
            style={{
              width: 44,
              height: 44,
              border: `1px solid ${status === "Approved" ? "var(--ok)" : "var(--alert)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <Icon
              icon={status === "Approved" ? "ph:check" : "ph:x"}
              width={22}
              style={{ color: status === "Approved" ? "var(--ok)" : "var(--alert)" }}
            />
          </div>
          <StatusTag status={status} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid var(--ink)", background: "var(--surface)" }}>
      <div style={{ borderBottom: "1px solid var(--ink)", padding: "14px 18px" }}>
        <span className="kicker">Admin decision</span>
      </div>
      <div style={{ padding: "20px 18px" }}>
        <p style={{ fontSize: 13, color: "var(--slate)", lineHeight: 1.6, marginBottom: 20 }}>
          Review all documents before approving. Approved vehicles become immediately bookable.
        </p>

        {error && (
          <p
            role="alert"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--alert)",
              marginBottom: 14,
            }}
          >
            {error}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={() => handleAction("approve")}
            disabled={acting}
            className="btn btn-primary"
            style={{ height: 44, width: "100%" }}
          >
            {acting ? (
              <Icon icon="ph:spinner" width={16} className="animate-spin" />
            ) : (
              <>
                <Icon icon="ph:check" width={14} aria-hidden="true" />
                Approve vehicle
              </>
            )}
          </button>
          <button
            onClick={() => handleAction("reject")}
            disabled={acting}
            className="btn btn-danger"
            style={{ height: 44, width: "100%" }}
          >
            <Icon icon="ph:x" width={14} aria-hidden="true" />
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
