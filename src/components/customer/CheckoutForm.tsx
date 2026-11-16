"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { formatIDR } from "@/lib/format";

type PaymentMethod = "BankTransfer" | "EWallet" | "Card";

interface Props {
  bookingId: string;
  totalPrice: number;
  canPay: boolean;
  /** Human-readable explanation shown when canPay is false. */
  reason: string | null;
  /** Booking summary card — rendered by the page server component and passed here as a slot. */
  children: React.ReactNode;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: "BankTransfer", label: "Bank transfer", icon: "ph:bank" },
  { id: "EWallet", label: "E-wallet", icon: "ph:device-mobile" },
  { id: "Card", label: "Credit / debit card", icon: "ph:credit-card" },
];

export function CheckoutForm({ bookingId, totalPrice, canPay, reason, children }: Props) {
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>("BankTransfer");
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!canPay || paying) return;

    setPaying(true);
    setError(null);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: window.location.origin,
        },
        body: JSON.stringify({ bookingId, method }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Payment failed. Please try again.");
        setPaying(false);
        return;
      }

      setPaid(true);
      router.push(`/trips/${bookingId}`);
    } catch {
      setError("Network error. Please try again.");
      setPaying(false);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {paid ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            border: "1px solid var(--ok)",
            padding: "44px 32px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              border: "1px solid var(--ok)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon icon="ph:lock-key" width={30} style={{ color: "var(--ok)" }} />
          </div>
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 26,
                fontWeight: 700,
                color: "var(--ink)",
                marginBottom: 10,
              }}
            >
              {formatIDR(totalPrice)} secured
            </h2>
            <p
              style={{
                color: "var(--slate)",
                fontSize: 14,
                lineHeight: 1.6,
                maxWidth: 400,
                margin: "0 auto",
              }}
            >
              Your payment is held safely. It will be released to the owner after safe
              return of the vehicle, minus a 5% platform fee.
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr min(320px,100%)",
            gap: 32,
            alignItems: "start",
          }}
        >
          {/* Left — payment form */}
          <form onSubmit={handlePay}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--ink)",
                marginBottom: 16,
              }}
            >
              Payment method
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
              {PAYMENT_METHODS.map((pm) => (
                <label
                  key={pm.id}
                  htmlFor={`pm-${pm.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 16px",
                    border: `1px solid ${method === pm.id ? "var(--ink)" : "var(--line)"}`,
                    background: method === pm.id ? "var(--hover)" : "var(--surface)",
                    cursor: canPay ? "pointer" : "default",
                    transition: "border-color .15s, background .15s",
                    opacity: canPay ? 1 : 0.6,
                  }}
                >
                  <input
                    id={`pm-${pm.id}`}
                    type="radio"
                    name="payment-method"
                    value={pm.id}
                    checked={method === pm.id}
                    disabled={!canPay}
                    onChange={() => setMethod(pm.id)}
                    style={{ accentColor: "var(--ink)" }}
                  />
                  <Icon
                    icon={pm.icon}
                    width={18}
                    style={{ color: "var(--slate)" }}
                    aria-hidden="true"
                  />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink)" }}>
                    {pm.label}
                  </span>
                </label>
              ))}
            </div>

            {/* Escrow explanation */}
            <div
              style={{
                border: "1px solid var(--active)",
                padding: "14px 16px",
                marginBottom: 24,
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <Icon
                icon="ph:lock-key"
                width={16}
                style={{ color: "var(--active)", marginTop: 1, flexShrink: 0 }}
                aria-hidden="true"
              />
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    color: "var(--active)",
                    marginBottom: 4,
                  }}
                >
                  Escrow protection
                </div>
                <p style={{ fontSize: 13, color: "var(--slate)", lineHeight: 1.6 }}>
                  Your payment is held until the car is safely returned. If anything goes
                  wrong, Waypoint mediates and can refund.
                </p>
              </div>
            </div>

            {/* Precondition failure notice */}
            {!canPay && reason && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "12px 14px",
                  border: "1px solid var(--wait)",
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <Icon
                  icon="ph:warning"
                  width={14}
                  style={{ color: "var(--wait)", marginTop: 1, flexShrink: 0 }}
                  aria-hidden="true"
                />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--wait)",
                    letterSpacing: "0.06em",
                  }}
                >
                  {reason}
                </span>
              </div>
            )}

            {error && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "12px 14px",
                  border: "1px solid var(--alert)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--alert)",
                  letterSpacing: "0.06em",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={paying || !canPay}
              className="btn btn-primary"
              style={{ height: 46, width: "100%" }}
            >
              {paying ? (
                <Icon icon="ph:spinner" width={18} className="animate-spin" />
              ) : (
                `Pay ${formatIDR(totalPrice)} into escrow`
              )}
            </button>
          </form>

          {/* Right — booking summary slot (server-rendered by parent page) */}
          <div>{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
