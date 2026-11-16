"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { StatusTag } from "@/components/ui/StatusTag";

interface DisputeReviewActionsProps {
  disputeId: string;
  currentStatus: string;
}

/** Actions available for each dispute status. */
const AVAILABLE_ACTIONS: Record<string, { action: "review" | "resolve" | "reject"; label: string; variant: string }[]> = {
  Open: [
    { action: "review",  label: "Mark Under Review", variant: "btn-primary" },
    { action: "resolve", label: "Resolve",           variant: "btn-primary" },
    { action: "reject",  label: "Reject",            variant: "btn-danger" },
  ],
  UnderReview: [
    { action: "resolve", label: "Resolve", variant: "btn-primary" },
    { action: "reject",  label: "Reject",  variant: "btn-danger" },
  ],
};

export function DisputeReviewActions({
  disputeId,
  currentStatus,
}: DisputeReviewActionsProps) {
  const [status, setStatus] = useState(currentStatus);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actions = AVAILABLE_ACTIONS[status] ?? [];
  const isFinal = actions.length === 0;

  async function handleAction(action: "review" | "resolve" | "reject") {
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}`, {
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
      if (data.status) setStatus(data.status);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActing(false);
    }
  }

  return (
    <div style={{ border: "1px solid var(--ink)", background: "var(--surface)" }}>
      <div style={{ borderBottom: "1px solid var(--ink)", padding: "14px 18px" }}>
        <span className="kicker">Admin resolution</span>
      </div>
      <div style={{ padding: "20px 18px" }}>
        <div style={{ marginBottom: 16 }}>
          <div className="kicker" style={{ marginBottom: 6 }}>Current status</div>
          <StatusTag status={status} />
        </div>

        {isFinal ? (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div
              style={{
                width: 44,
                height: 44,
                border: `1px solid ${status === "Resolved" ? "var(--ok)" : "var(--done)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}
            >
              <Icon
                icon={status === "Resolved" ? "ph:check" : "ph:x"}
                width={22}
                style={{ color: status === "Resolved" ? "var(--ok)" : "var(--done)" }}
              />
            </div>
            <p style={{ color: "var(--slate)", fontSize: 13, lineHeight: 1.6 }}>
              {status === "Resolved"
                ? "Dispute resolved. Both parties have been notified."
                : "Dispute rejected. Escrow will be released normally."}
            </p>
          </div>
        ) : (
          <>
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
              {actions.map((item) => (
                <button
                  key={item.action}
                  onClick={() => handleAction(item.action)}
                  disabled={acting}
                  className={`btn ${item.variant}`}
                  style={{ height: 44, width: "100%" }}
                >
                  {acting ? (
                    <Icon icon="ph:spinner" width={16} className="animate-spin" />
                  ) : (
                    item.label
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
