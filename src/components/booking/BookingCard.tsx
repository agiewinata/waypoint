"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { formatIDR } from "@/lib/format";

export type ViewerState = "guest" | "no-profile" | "can-book";

interface BookingCardProps {
  listingCode: string;
  pricePerDay: number;
  todayMin: string;
  viewerState: ViewerState;
}

export function BookingCard({
  listingCode,
  pricePerDay,
  todayMin,
  viewerState,
}: BookingCardProps) {
  const router = useRouter();
  const tomorrow = (() => {
    const d = new Date(`${todayMin}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().split("T")[0];
  })();

  const [startDate, setStartDate] = useState(todayMin);
  const [endDate, setEndDate] = useState(tomorrow);
  const [locationConsent, setLocationConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nights = Math.max(
    0,
    Math.floor(
      (new Date(`${endDate}T00:00:00.000Z`).getTime() -
        new Date(`${startDate}T00:00:00.000Z`).getTime()) /
        86_400_000
    )
  );
  const totalPrice = nights * pricePerDay;

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (nights <= 0) {
      setError("End date must be after start date.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingCode, startDate, endDate, locationConsent }),
      });

      if (res.status === 201) {
        const data = (await res.json()) as { id: string };
        router.push(`/booking/success?id=${data.id}`);
        return;
      }

      const body = (await res.json()) as { error?: string; message?: string };
      setError(body.error ?? body.message ?? "Something went wrong. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Guest: prompt to sign in ───────────────────────────────────────────
  if (viewerState === "guest") {
    return (
      <div style={{ border: "1px solid var(--ink)", background: "var(--surface)" }}>
        <div
          style={{
            borderBottom: "1px solid var(--ink)",
            padding: "18px 20px",
            display: "flex",
            alignItems: "baseline",
            gap: 8,
          }}
        >
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 600, color: "var(--ink)" }}>
            {formatIDR(pricePerDay)}
          </span>
          <span className="kicker">per day</span>
        </div>
        <div style={{ padding: "24px 20px", textAlign: "center" }}>
          <Icon
            icon="ph:lock-simple"
            width={28}
            style={{ color: "var(--slate)", marginBottom: 12 }}
            aria-hidden="true"
          />
          <p style={{ fontSize: 14, color: "var(--slate)", lineHeight: 1.6, marginBottom: 16 }}>
            Sign in to request a booking for this vehicle.
          </p>
          <Link href="/auth/signin" className="btn btn-primary" style={{ display: "inline-block", width: "100%", textAlign: "center", height: 44, lineHeight: "44px" }}>
            Sign in to book
          </Link>
        </div>
      </div>
    );
  }

  // ── No customer profile: prompt to create one ──────────────────────────
  if (viewerState === "no-profile") {
    return (
      <div style={{ border: "1px solid var(--ink)", background: "var(--surface)" }}>
        <div
          style={{
            borderBottom: "1px solid var(--ink)",
            padding: "18px 20px",
            display: "flex",
            alignItems: "baseline",
            gap: 8,
          }}
        >
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 600, color: "var(--ink)" }}>
            {formatIDR(pricePerDay)}
          </span>
          <span className="kicker">per day</span>
        </div>
        <div style={{ padding: "24px 20px", textAlign: "center" }}>
          <Icon
            icon="ph:identification-card"
            width={28}
            style={{ color: "var(--slate)", marginBottom: 12 }}
            aria-hidden="true"
          />
          <p style={{ fontSize: 14, color: "var(--slate)", lineHeight: 1.6, marginBottom: 16 }}>
            You need a Customer profile to book vehicles.
          </p>
          <Link href="/dashboard/customer/new" className="btn btn-primary" style={{ display: "inline-block", width: "100%", textAlign: "center", height: 44, lineHeight: "44px" }}>
            Create Customer profile
          </Link>
        </div>
      </div>
    );
  }

  // ── Can book: full booking form ────────────────────────────────────────
  return (
    <div style={{ border: "1px solid var(--ink)", background: "var(--surface)" }}>
      {/* Price header */}
      <div
        style={{
          borderBottom: "1px solid var(--ink)",
          padding: "18px 20px",
          display: "flex",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 600, color: "var(--ink)" }}>
          {formatIDR(pricePerDay)}
        </span>
        <span className="kicker">per day</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.form
          key="form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onSubmit={handleBook}
          style={{ padding: "20px" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="field-label" htmlFor="bc-start-date">Start date</label>
              <input
                id="bc-start-date"
                type="date"
                required
                value={startDate}
                min={todayMin}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="bc-end-date">End date</label>
              <input
                id="bc-end-date"
                type="date"
                required
                value={endDate}
                min={startDate || todayMin}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Price breakdown */}
          <div
            style={{
              marginTop: 20,
              borderTop: "1px solid var(--line)",
              paddingTop: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div className="spec-row" style={{ padding: "6px 0" }}>
              <span className="spec-label">Rate</span>
              <span className="spec-value">{formatIDR(pricePerDay)} × {nights}d</span>
            </div>
            <div className="spec-row" style={{ padding: "6px 0", borderBottom: "none" }}>
              <span className="spec-label" style={{ color: "var(--ink)", fontWeight: 600 }}>Total</span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "var(--ink)",
                  flex: 1,
                }}
              >
                {nights > 0 ? formatIDR(totalPrice) : "—"}
              </span>
            </div>
          </div>

          {/* Location consent */}
          <div
            style={{
              marginTop: 16,
              padding: "12px",
              border: "1px solid var(--line)",
              background: "var(--hover)",
              marginBottom: 16,
            }}
          >
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={locationConsent}
                onChange={(e) => setLocationConsent(e.target.checked)}
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--slate)", letterSpacing: "0.06em", lineHeight: 1.5 }}>
                I consent to sharing my location during the active rental period for safety purposes
              </span>
            </label>
          </div>

          {/* Escrow notice */}
          <div
            style={{
              padding: "10px 12px",
              border: "1px solid var(--line)",
              background: "var(--hover)",
              marginBottom: 16,
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--slate)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              <Icon icon="ph:lock" width={10} style={{ display: "inline", marginRight: 5 }} aria-hidden="true" />
              Held in escrow · released on safe return
            </span>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                border: "1px solid var(--alert)",
                background: "rgba(166,55,42,0.06)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--alert)",
                letterSpacing: "0.04em",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || nights <= 0}
            className="btn btn-primary"
            style={{ width: "100%", height: 44 }}
          >
            {submitting ? (
              <Icon icon="ph:spinner" width={16} className="animate-spin" aria-hidden="true" />
            ) : (
              "Request booking"
            )}
          </button>

          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--slate)", textAlign: "center", marginTop: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            You won&apos;t be charged yet
          </p>
        </motion.form>
      </AnimatePresence>
    </div>
  );
}
