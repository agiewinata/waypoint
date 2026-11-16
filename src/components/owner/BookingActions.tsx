"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import Link from "next/link";

interface BookingActionsProps {
  bookingId: string;
  paymentId: string | null;
  status: string;
  paymentStatus: string | null;
  hasOpenDispute: boolean;
  startDate: string; // ISO string — compared date-portion only for UI disable
}

export function BookingActions({
  bookingId,
  paymentId,
  status,
  paymentStatus,
  hasOpenDispute,
  startDate,
}: BookingActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compare date portions only; server enforces the real check
  const todayPart = new Date().toISOString().slice(0, 10);
  const startPart = startDate.slice(0, 10);
  const beforeStart = todayPart < startPart;

  async function handleBookingAction(action: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "An error occurred. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReleasePayout() {
    if (!paymentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "release" }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "An error occurred. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Determine which buttons apply
  const showConfirmDecline = status === "Pending";
  const showStart = status === "Confirmed" && paymentStatus === "Held";
  const showComplete = status === "Active";
  const showRelease =
    status === "Completed" &&
    paymentStatus === "Held" &&
    !hasOpenDispute &&
    paymentId !== null;

  const hasActions = showConfirmDecline || showStart || showComplete || showRelease;

  return (
    <div style={{ border: "1px solid var(--ink)", background: "var(--surface)" }}>
      <div style={{ borderBottom: "1px solid var(--ink)", padding: "14px 18px" }}>
        <span className="kicker">Actions</span>
      </div>

      <div style={{ padding: "20px 18px" }}>
        {error && (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--alert)",
              marginBottom: 14,
              padding: "8px 10px",
              border: "1px solid var(--alert)",
              background: "transparent",
            }}
          >
            {error}
          </p>
        )}

        {!hasActions && (
          <p style={{ fontSize: 13, color: "var(--slate)", lineHeight: 1.6 }}>
            No actions available for this booking.
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {showConfirmDecline && (
            <>
              <p style={{ fontSize: 13, color: "var(--slate)", lineHeight: 1.6, marginBottom: 6 }}>
                Confirm to allow the customer to proceed to payment. Decline if dates don&apos;t work.
              </p>
              <button
                onClick={() => handleBookingAction("confirm")}
                disabled={loading}
                className="btn btn-primary"
                style={{ height: 44, width: "100%" }}
              >
                {loading ? (
                  <Icon icon="ph:spinner" width={16} className="animate-spin" aria-hidden="true" />
                ) : (
                  <>
                    <Icon icon="ph:check" width={14} aria-hidden="true" />
                    Confirm booking
                  </>
                )}
              </button>
              <button
                onClick={() => handleBookingAction("decline")}
                disabled={loading}
                className="btn btn-danger"
                style={{ height: 44, width: "100%" }}
              >
                <Icon icon="ph:x" width={14} aria-hidden="true" />
                Decline
              </button>
            </>
          )}

          {showStart && (
            <>
              {beforeStart && (
                <p style={{ fontSize: 12, color: "var(--slate)", lineHeight: 1.5, marginBottom: 6 }}>
                  Rental start date has not been reached yet.
                </p>
              )}
              <button
                onClick={() => handleBookingAction("start")}
                disabled={loading || beforeStart}
                className="btn btn-primary"
                style={{ height: 44, width: "100%" }}
                title={beforeStart ? "Cannot start before the rental start date" : undefined}
              >
                {loading ? (
                  <Icon icon="ph:spinner" width={16} className="animate-spin" aria-hidden="true" />
                ) : (
                  <>
                    <Icon icon="ph:play" width={14} aria-hidden="true" />
                    Start rental
                  </>
                )}
              </button>
            </>
          )}

          {showComplete && (
            <button
              onClick={() => handleBookingAction("complete")}
              disabled={loading}
              className="btn btn-primary"
              style={{ height: 44, width: "100%" }}
            >
              {loading ? (
                <Icon icon="ph:spinner" width={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <>
                  <Icon icon="ph:flag-checkered" width={14} aria-hidden="true" />
                  Complete rental
                </>
              )}
            </button>
          )}

          {showRelease && (
            <>
              <p style={{ fontSize: 13, color: "var(--slate)", lineHeight: 1.6, marginBottom: 6 }}>
                Release escrow to receive 95% of the booking total.
              </p>
              <button
                onClick={handleReleasePayout}
                disabled={loading}
                className="btn btn-primary"
                style={{ height: 44, width: "100%" }}
              >
                {loading ? (
                  <Icon icon="ph:spinner" width={16} className="animate-spin" aria-hidden="true" />
                ) : (
                  <>
                    <Icon icon="ph:currency-circle-dollar" width={14} aria-hidden="true" />
                    Release payout
                  </>
                )}
              </button>
            </>
          )}

          {/* Links always shown */}
          <div style={{ marginTop: hasActions ? 10 : 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {status === "Active" && (
              <Link
                href={`/dashboard/owner/tracking/${bookingId}`}
                className="btn btn-ghost"
                style={{ height: 36, width: "100%", justifyContent: "center" }}
              >
                <Icon icon="ph:map-pin" width={14} aria-hidden="true" />
                View live tracking
              </Link>
            )}
            <Link
              href={`/disputes/raise/${bookingId}`}
              className="btn btn-ghost"
              style={{ height: 36, width: "100%", justifyContent: "center" }}
            >
              <Icon icon="ph:warning" width={14} aria-hidden="true" />
              Raise a dispute
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
