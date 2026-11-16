"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

interface BookingApprovalActionsProps {
  bookingId: string;
}

const BUTTON_STYLE = { fontSize: 11, height: 30, padding: "0 10px" } as const;

export function BookingApprovalActions({ bookingId }: BookingApprovalActionsProps) {
  const router = useRouter();
  const [acting, setActing] = useState<"approve" | "reject" | null>(null);
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: "approve" | "reject") {
    setActing(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? `Error ${res.status}`);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActing(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {confirmingReject ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--alert)" }}>Are you sure?</span>
          <button
            onClick={() => handleAction("reject")}
            disabled={acting !== null}
            className="btn btn-danger"
            style={BUTTON_STYLE}
          >
            {acting === "reject" ? (
              <Icon icon="ph:spinner" width={12} className="animate-spin" aria-hidden="true" />
            ) : (
              "Confirm reject"
            )}
          </button>
          <button
            onClick={() => setConfirmingReject(false)}
            disabled={acting !== null}
            className="btn btn-ghost"
            style={BUTTON_STYLE}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => handleAction("approve")}
            disabled={acting !== null}
            className="btn btn-primary"
            style={BUTTON_STYLE}
          >
            {acting === "approve" ? (
              <Icon icon="ph:spinner" width={12} className="animate-spin" aria-hidden="true" />
            ) : (
              "Approve"
            )}
          </button>
          <button
            onClick={() => setConfirmingReject(true)}
            disabled={acting !== null}
            className="btn btn-danger"
            style={BUTTON_STYLE}
          >
            Reject
          </button>
        </div>
      )}

      {error && (
        <span
          role="alert"
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--alert)" }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
