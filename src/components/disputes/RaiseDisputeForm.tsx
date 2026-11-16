"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";

interface RaiseDisputeFormProps {
  bookingId: string;
}

const MIN_CHARS = 20;
const MAX_CHARS = 2000;

/**
 * Client form for raising a dispute on a booking.
 * POSTs to /api/disputes and shows a success state on 201.
 */
export function RaiseDisputeForm({ bookingId }: RaiseDisputeFormProps) {
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charCount = description.length;
  const isValid = charCount >= MIN_CHARS && charCount <= MAX_CHARS;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: window.location.origin,
        },
        body: JSON.stringify({ bookingId, description }),
      });

      if (res.status === 201) {
        setSubmitted(true);
        return;
      }

      // Parse error message from response body
      let message = "Something went wrong. Please try again.";
      try {
        const data: unknown = await res.json();
        if (
          data &&
          typeof data === "object" &&
          "message" in data &&
          typeof (data as { message: unknown }).message === "string"
        ) {
          message = (data as { message: string }).message;
        }
      } catch {
        // body was not JSON — keep the fallback message
      }
      setError(message);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {submitted ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            border: "1px solid var(--wait)",
            padding: "36px 28px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              border: "1px solid var(--wait)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon icon="ph:flag" width={26} style={{ color: "var(--wait)" }} />
          </div>
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                fontWeight: 700,
                color: "var(--ink)",
                marginBottom: 8,
              }}
            >
              Dispute raised
            </h2>
            <p style={{ color: "var(--slate)", fontSize: 14, lineHeight: 1.6 }}>
              Our team has been notified. We&apos;ll review and respond within 24
              hours. Escrow is frozen until resolved.
            </p>
          </div>
          <div
            style={{
              padding: "10px 14px",
              border: "1px solid var(--line)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--slate)",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            Status: Under review · Escrow frozen
          </div>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onSubmit={handleSubmit}
        >
          {/* Warning */}
          <div
            style={{
              border: "1px solid var(--alert)",
              padding: "12px 16px",
              display: "flex",
              gap: 10,
              marginBottom: 24,
            }}
          >
            <Icon
              icon="ph:warning"
              width={16}
              style={{ color: "var(--alert)", marginTop: 1, flexShrink: 0 }}
              aria-hidden="true"
            />
            <p style={{ fontSize: 13, color: "var(--alert)", lineHeight: 1.6 }}>
              Opening a dispute will pause escrow release. Only proceed if there
              is a genuine issue.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              style={{
                border: "1px solid var(--alert)",
                padding: "10px 14px",
                marginBottom: 20,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--alert)",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label className="field-label" htmlFor="dispute-desc">
                Describe the issue
              </label>
              <textarea
                id="dispute-desc"
                required
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what happened — be specific. Include dates, times, and any relevant details."
                className="input"
                style={{ resize: "vertical", lineHeight: 1.6 }}
                maxLength={MAX_CHARS}
              />
              <div
                style={{
                  marginTop: 4,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: charCount < MIN_CHARS ? "var(--alert)" : "var(--slate)",
                  textAlign: "right",
                }}
              >
                {charCount} / {MAX_CHARS}
                {charCount < MIN_CHARS && charCount > 0 && (
                  <span> (min {MIN_CHARS})</span>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 28,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              type="submit"
              disabled={!isValid || submitting}
              className="btn btn-danger"
              style={{ height: 44 }}
            >
              {submitting ? (
                <Icon
                  icon="ph:spinner"
                  width={16}
                  className="animate-spin"
                  aria-label="Submitting"
                />
              ) : (
                <>
                  <Icon icon="ph:flag" width={14} aria-hidden="true" />
                  Submit dispute
                </>
              )}
            </button>
            <a
              href={`/trips/${bookingId}`}
              className="btn btn-ghost"
              style={{ height: 44 }}
            >
              Cancel
            </a>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
