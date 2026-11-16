"use client";

import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import Link from "next/link";

interface SuccessViewProps {
  bookingId: string;
  make: string;
  model: string;
  startDate: string;
  endDate: string;
  totalPrice: string;
}

export function SuccessView({
  bookingId,
  make,
  model,
  startDate,
  endDate,
  totalPrice,
}: SuccessViewProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--font-display)",
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: "-0.025em",
          color: "var(--ink)",
          marginBottom: 48,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <rect x="1" y="1" width="20" height="20" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="11" cy="11" r="3" fill="currentColor"/>
          <line x1="11" y1="1" x2="11" y2="8" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
        Waypoint
      </div>

      {/* Animated success icon */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 18 }}
        style={{
          width: 72,
          height: 72,
          border: "2px solid var(--ok)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 28,
        }}
        aria-hidden="true"
      >
        <Icon icon="ph:lock-simple-key" width={32} style={{ color: "var(--ok)" }} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "var(--ink)",
            marginBottom: 10,
          }}
        >
          Booking requested!
        </h1>

        <p
          style={{
            fontSize: 15,
            color: "var(--slate)",
            lineHeight: 1.6,
            maxWidth: 400,
            margin: "0 auto 28px",
          }}
        >
          Your booking is pending owner confirmation. Your payment will be held
          securely in escrow once confirmed.
        </p>

        {/* Summary card */}
        <div
          style={{
            border: "1px solid var(--ok)",
            padding: "18px 24px",
            maxWidth: 380,
            margin: "0 auto 32px",
            background: "rgba(28,107,70,0.04)",
          }}
        >
          {[
            { label: "Booking ID", value: bookingId },
            { label: "Vehicle",    value: `${make} ${model}` },
            { label: "Start",      value: startDate },
            { label: "End",        value: endDate },
            { label: "Total",      value: totalPrice },
          ].map((r, i, arr) => (
            <div
              key={r.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: i < arr.length - 1 ? "1px solid rgba(28,107,70,0.15)" : "none",
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ok)" }}>
                {r.label}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                {r.value}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href={`/trips/${bookingId}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 46,
              padding: "0 24px",
              background: "var(--ink)",
              color: "var(--paper)",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
              border: "1px solid var(--ink)",
            }}
          >
            <Icon icon="ph:map-trifold" width={15} aria-hidden="true" />
            View trip details
          </Link>
          <Link
            href="/dashboard/customer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 46,
              padding: "0 24px",
              background: "transparent",
              color: "var(--ink)",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
              border: "1px solid var(--line)",
            }}
          >
            Go to dashboard
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
