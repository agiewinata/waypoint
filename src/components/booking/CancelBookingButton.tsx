"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

interface CancelBookingButtonProps {
  bookingId: string;
}

export function CancelBookingButton({ bookingId }: CancelBookingButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    if (pending) return;

    setPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not cancel the booking. Please try again.");
        setPending(false);
        return;
      }

      setConfirming(false);
      setPending(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setPending(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {error && (
        <p
          role="alert"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--alert)",
            padding: "8px 10px",
            border: "1px solid var(--alert)",
          }}
        >
          {error}
        </p>
      )}

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={pending}
          className="btn btn-danger"
          style={{ fontSize: 11 }}
        >
          <Icon icon="ph:x" width={14} aria-hidden="true" />
          Cancel booking
        </button>
      ) : (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={handleCancel}
            disabled={pending}
            className="btn btn-danger"
            style={{ fontSize: 11 }}
          >
            {pending ? (
              <Icon icon="ph:spinner" width={14} className="animate-spin" aria-hidden="true" />
            ) : (
              "Yes, cancel"
            )}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="btn btn-ghost"
            style={{ fontSize: 11 }}
          >
            Keep booking
          </button>
        </div>
      )}
    </div>
  );
}
