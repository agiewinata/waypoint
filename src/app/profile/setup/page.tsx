"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import Link from "next/link";

type Role = "customer" | "owner" | null;

export default function ProfileSetupPage() {
  const [step, setStep] = useState<"role" | "details" | "done">("role");
  const [role, setRole] = useState<Role>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    city: "",
  });

  function handleRoleSelect(r: Role) {
    setRole(r);
  }

  function handleNext() {
    if (step === "role" && role) setStep("details");
    else if (step === "details") setStep("done");
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  const detailsValid = form.firstName && form.lastName && form.phone && form.city;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          borderBottom: "1px solid var(--ink)",
          padding: "0 24px",
          height: 57,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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
          }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="20" height="20" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="11" cy="11" r="3" fill="currentColor"/>
            <line x1="11" y1="1" x2="11" y2="8" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          Waypoint
        </div>

        {/* Step indicator */}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--slate)",
          }}
        >
          {step === "role" ? "Step 1 of 2" : step === "details" ? "Step 2 of 2" : "Done"}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 540 }}>
          <AnimatePresence mode="wait">
            {/* Step: Role selection */}
            {step === "role" && (
              <motion.div
                key="role"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <span className="kicker" style={{ marginBottom: 8, display: "block" }}>Profile setup</span>
                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 32,
                    fontWeight: 700,
                    letterSpacing: "-0.03em",
                    color: "var(--ink)",
                    marginBottom: 8,
                  }}
                >
                  How will you use Waypoint?
                </h1>
                <p style={{ fontSize: 14, color: "var(--slate)", lineHeight: 1.6, marginBottom: 32 }}>
                  Choose your primary role. You can always switch later or use both.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
                  {/* Customer card */}
                  <button
                    onClick={() => handleRoleSelect("customer")}
                    style={{
                      padding: "24px 20px",
                      border: `2px solid ${role === "customer" ? "var(--ink)" : "var(--line)"}`,
                      background: role === "customer" ? "var(--ink)" : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all .15s",
                    }}
                  >
                    <Icon
                      icon="ph:user"
                      width={28}
                      style={{ color: role === "customer" ? "var(--paper)" : "var(--ink)", marginBottom: 12, display: "block" }}
                      aria-hidden="true"
                    />
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 17,
                        fontWeight: 700,
                        color: role === "customer" ? "var(--paper)" : "var(--ink)",
                        marginBottom: 6,
                      }}
                    >
                      Customer
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        color: role === "customer" ? "rgba(245,243,237,0.7)" : "var(--slate)",
                        lineHeight: 1.5,
                        margin: 0,
                      }}
                    >
                      Rent vehicles from owners around your city.
                    </p>
                    {role === "customer" && (
                      <div style={{ marginTop: 14 }}>
                        <Icon icon="ph:check-circle" width={16} style={{ color: "var(--paper)" }} aria-hidden="true" />
                      </div>
                    )}
                  </button>

                  {/* Owner card */}
                  <button
                    onClick={() => handleRoleSelect("owner")}
                    style={{
                      padding: "24px 20px",
                      border: `2px solid ${role === "owner" ? "var(--ink)" : "var(--line)"}`,
                      background: role === "owner" ? "var(--ink)" : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all .15s",
                    }}
                  >
                    <Icon
                      icon="ph:car"
                      width={28}
                      style={{ color: role === "owner" ? "var(--paper)" : "var(--ink)", marginBottom: 12, display: "block" }}
                      aria-hidden="true"
                    />
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 17,
                        fontWeight: 700,
                        color: role === "owner" ? "var(--paper)" : "var(--ink)",
                        marginBottom: 6,
                      }}
                    >
                      Owner
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        color: role === "owner" ? "rgba(245,243,237,0.7)" : "var(--slate)",
                        lineHeight: 1.5,
                        margin: 0,
                      }}
                    >
                      List your car and earn when it&apos;s not in use.
                    </p>
                    {role === "owner" && (
                      <div style={{ marginTop: 14 }}>
                        <Icon icon="ph:check-circle" width={16} style={{ color: "var(--paper)" }} aria-hidden="true" />
                      </div>
                    )}
                  </button>
                </div>

                <button
                  onClick={handleNext}
                  disabled={!role}
                  className="btn btn-primary"
                  style={{ height: 48, width: "100%", fontSize: 15 }}
                >
                  Continue
                  <Icon icon="ph:arrow-right" width={16} aria-hidden="true" />
                </button>
              </motion.div>
            )}

            {/* Step: Details */}
            {step === "details" && (
              <motion.div
                key="details"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <button
                  onClick={() => setStep("role")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: "var(--slate)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    marginBottom: 20,
                    padding: 0,
                  }}
                >
                  <Icon icon="ph:arrow-left" width={12} aria-hidden="true" />
                  Back
                </button>

                <span className="kicker" style={{ marginBottom: 8, display: "block" }}>Profile setup</span>
                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 32,
                    fontWeight: 700,
                    letterSpacing: "-0.03em",
                    color: "var(--ink)",
                    marginBottom: 8,
                  }}
                >
                  Your details
                </h1>
                <p style={{ fontSize: 14, color: "var(--slate)", lineHeight: 1.6, marginBottom: 32 }}>
                  Setting up as{" "}
                  <strong style={{ color: "var(--ink)" }}>
                    {role === "customer" ? "Customer" : "Owner"}
                  </strong>
                  . You can update this anytime.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label className="field-label" htmlFor="firstName">First name</label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      className="input"
                      placeholder="Andi"
                      value={form.firstName}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="lastName">Last name</label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      className="input"
                      placeholder="Pratama"
                      value={form.lastName}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="field-label" htmlFor="phone">Phone number</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    className="input"
                    placeholder="+62 812-3456-7890"
                    value={form.phone}
                    onChange={handleChange}
                  />
                </div>

                <div style={{ marginBottom: 28 }}>
                  <label className="field-label" htmlFor="city">City</label>
                  <select
                    id="city"
                    name="city"
                    className="select"
                    value={form.city}
                    onChange={handleChange}
                  >
                    <option value="">Select your city</option>
                    <option value="Jakarta">Jakarta</option>
                    <option value="Surabaya">Surabaya</option>
                    <option value="Bandung">Bandung</option>
                    <option value="Medan">Medan</option>
                    <option value="Makassar">Makassar</option>
                    <option value="Semarang">Semarang</option>
                    <option value="Palembang">Palembang</option>
                    <option value="Bogor">Bogor</option>
                    <option value="Depok">Depok</option>
                    <option value="Tangerang">Tangerang</option>
                  </select>
                </div>

                <button
                  onClick={handleNext}
                  disabled={!detailsValid}
                  className="btn btn-primary"
                  style={{ height: 48, width: "100%", fontSize: 15 }}
                >
                  Finish setup
                  <Icon icon="ph:arrow-right" width={16} aria-hidden="true" />
                </button>
              </motion.div>
            )}

            {/* Step: Done */}
            {step === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                style={{ textAlign: "center", padding: "20px 0" }}
              >
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
                  style={{
                    width: 64,
                    height: 64,
                    border: "2px solid var(--ok)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 24px",
                  }}
                  aria-hidden="true"
                >
                  <Icon icon="ph:check" width={30} style={{ color: "var(--ok)" }} />
                </motion.div>

                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 32,
                    fontWeight: 700,
                    letterSpacing: "-0.03em",
                    color: "var(--ink)",
                    marginBottom: 12,
                  }}
                >
                  You&apos;re all set!
                </h1>
                <p
                  style={{
                    fontSize: 15,
                    color: "var(--slate)",
                    lineHeight: 1.6,
                    marginBottom: 36,
                    maxWidth: 380,
                    margin: "0 auto 36px",
                  }}
                >
                  Welcome to Waypoint, {form.firstName}. Your{" "}
                  <strong style={{ color: "var(--ink)" }}>
                    {role === "customer" ? "Customer" : "Owner"}
                  </strong>{" "}
                  profile is ready.
                </p>

                <Link
                  href={role === "customer" ? "/dashboard/customer" : "/dashboard/owner"}
                  className="btn btn-primary"
                  style={{ height: 48, padding: "0 32px", fontSize: 15, display: "inline-flex" }}
                >
                  Go to dashboard
                  <Icon icon="ph:arrow-right" width={16} aria-hidden="true" />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
