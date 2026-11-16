"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { formatIDR } from "@/lib/format";
import { uploadDocumentClient } from "@/lib/upload-client";
import Link from "next/link";

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const STEPS = ["Vehicle info", "STNK", "Insurance", "Review & submit"] as const;

// ── Types ────────────────────────────────────────────────────────────────────

export interface ListCarFormProps {
  renterID: string;
  cities: readonly string[];
  vehicleTypes: readonly string[];
}

interface VehicleFormState {
  make: string;
  model: string;
  year: string;
  type: string;
  city: string;
  plateNumber: string;
  vin: string;
  pricePerDay: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function validateFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return "File must be JPEG, PNG, or PDF";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "File must be 5 MB or smaller";
  }
  return null;
}

async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as Record<string, unknown>;
    const msg = json["error"] ?? json["message"];
    if (typeof msg === "string" && msg.length > 0) return msg;
  } catch {
    // ignore JSON parse failure — fall through to generic message
  }
  return `Request failed with status ${res.status}`;
}

// ── FileUploadSlot ────────────────────────────────────────────────────────────

interface FileUploadSlotProps {
  id: string;
  label: string;
  hint: string;
  file: File | null;
  onFileChange: (f: File | null) => void;
  uploaded: boolean;
}

function FileUploadSlot({ id, label, hint, file, onFileChange, uploaded }: FileUploadSlotProps) {
  return (
    <div style={{ marginBottom: 16, border: "1px solid var(--line)", padding: 16 }}>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 15,
          fontWeight: 700,
          color: "var(--ink)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, color: "var(--slate)", marginBottom: 12 }}>{hint}</div>

      {uploaded ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            border: "1px solid var(--ok)",
            color: "var(--ok)",
          }}
        >
          <Icon icon="ph:check-circle" width={14} aria-hidden="true" />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.07em", textTransform: "uppercase" }}>
            Uploaded
          </span>
        </div>
      ) : (
        <>
          <label
            htmlFor={id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 14px",
              border: "1px dashed var(--line)",
              cursor: "pointer",
              background: "var(--hover)",
            }}
          >
            <Icon
              icon={file ? "ph:file-text" : "ph:upload-simple"}
              width={16}
              style={{ color: "var(--slate)" }}
              aria-hidden="true"
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "var(--slate)",
              }}
            >
              {file ? file.name : `Upload ${label.split(" ")[0]}`}
            </span>
          </label>
          <input
            id={id}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            style={{ display: "none" }}
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />
          <p style={{ fontSize: 12, color: "var(--done)", marginTop: 6 }}>
            JPEG, PNG, or PDF · max 5 MB · encrypted at rest
          </p>
        </>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ListCarForm({ cities, vehicleTypes }: ListCarFormProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<VehicleFormState>({
    make: "",
    model: "",
    year: "",
    type: vehicleTypes[0] ?? "SUV",
    city: "",
    plateNumber: "",
    vin: "",
    pricePerDay: "",
  });
  const [stnkFile, setStnkFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);

  // Track completed API calls so Retry never repeats a succeeded request
  const [listingCode, setListingCode] = useState<string | null>(null);
  const [vehicleCreated, setVehicleCreated] = useState(false);
  const [stnkUploaded, setStnkUploaded] = useState(false);
  const [insuranceUploaded, setInsuranceUploaded] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function updateForm(field: keyof VehicleFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  function goToStep(i: number) {
    if (i < step) {
      setError(null);
      setStep(i);
    }
  }

  // ── API calls ───────────────────────────────────────────────────────────────

  async function apiCreateVehicle(): Promise<boolean> {
    if (vehicleCreated) return true;
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vin: form.vin,
        make: form.make,
        model: form.model,
        year: parseInt(form.year, 10),
        plateNumber: form.plateNumber,
        type: form.type,
        city: form.city,
        pricePerDay: parseInt(form.pricePerDay, 10),
      }),
    });
    if (!res.ok) {
      setError(await extractErrorMessage(res));
      return false;
    }
    const data = (await res.json()) as { listingCode: string };
    setListingCode(data.listingCode);
    setVehicleCreated(true);
    return true;
  }

  async function apiUploadDocument(
    type: "STNK" | "Insurance",
    file: File,
    code: string
  ): Promise<boolean> {
    const result = await uploadDocumentClient(file, { type, listingCode: code });
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    return true;
  }

  async function apiSubmitVehicle(code: string): Promise<boolean> {
    const res = await fetch(`/api/vehicles/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit" }),
    });
    if (!res.ok) {
      setError(await extractErrorMessage(res));
      return false;
    }
    return true;
  }

  // ── Step action (Next / Submit / Retry) ─────────────────────────────────────

  async function handleStepAction() {
    setError(null);

    // Client-side file validation before async work
    if (step === 1 && !stnkUploaded) {
      if (!stnkFile) { setError("Please select a STNK file"); return; }
      const fileErr = validateFile(stnkFile);
      if (fileErr) { setError(fileErr); return; }
    } else if (step === 2 && !insuranceUploaded) {
      if (!insuranceFile) { setError("Please select an Insurance file"); return; }
      const fileErr = validateFile(insuranceFile);
      if (fileErr) { setError(fileErr); return; }
    }

    setLoading(true);
    try {
      if (step === 0) {
        const ok = await apiCreateVehicle();
        if (ok) setStep(1);
      } else if (step === 1) {
        // listingCode is guaranteed non-null: vehicleCreated is true before we can be on step 1
        const code = listingCode!;
        if (!stnkUploaded) {
          const ok = await apiUploadDocument("STNK", stnkFile!, code);
          if (!ok) return;
          setStnkUploaded(true);
        }
        setStep(2);
      } else if (step === 2) {
        const code = listingCode!;
        if (!insuranceUploaded) {
          const ok = await apiUploadDocument("Insurance", insuranceFile!, code);
          if (!ok) return;
          setInsuranceUploaded(true);
        }
        setStep(3);
      } else if (step === 3) {
        const code = listingCode!;
        const ok = await apiSubmitVehicle(code);
        if (ok) setDone(true);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Payout preview ──────────────────────────────────────────────────────────

  const priceNum = parseInt(form.pricePerDay, 10);
  const payout = !isNaN(priceNum) && priceNum > 0 ? Math.round(priceNum * 0.95) : null;

  // ── Success screen ──────────────────────────────────────────────────────────

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          border: "1px solid var(--ok)",
          padding: "44px 32px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            border: "1px solid var(--ok)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon icon="ph:check" width={28} style={{ color: "var(--ok)" }} />
        </div>
        <div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 24,
              fontWeight: 700,
              color: "var(--ink)",
              marginBottom: 8,
            }}
          >
            Listed!
          </h2>
          <p
            style={{
              color: "var(--slate)",
              fontSize: 14,
              lineHeight: 1.6,
              maxWidth: 380,
              margin: "0 auto",
            }}
          >
            Your vehicle is now <strong>Pending</strong> review. An admin will approve it after
            verifying your documents. Usually within 24 hours.
          </p>
        </div>
        <Link href="/dashboard/owner/cars" className="btn btn-ghost" style={{ marginTop: 8 }}>
          View in My Cars
        </Link>
      </motion.div>
    );
  }

  // ── Multi-step form ─────────────────────────────────────────────────────────

  return (
    <>
      <Breadcrumb
        crumbs={[
          { label: "Owner dashboard", href: "/dashboard/owner" },
          { label: "My cars", href: "/dashboard/owner/cars" },
          { label: "List a car" },
        ]}
      />

      <div style={{ borderBottom: "1px solid var(--ink)", paddingBottom: 16, marginBottom: 32 }}>
        <span className="kicker" style={{ marginBottom: 6, display: "block" }}>
          Owner · New listing
        </span>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.025em",
            color: "var(--ink)",
          }}
        >
          List a car
        </h1>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", marginBottom: 36, border: "1px solid var(--line)" }}>
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => goToStep(i)}
            style={{
              flex: 1,
              padding: "12px 8px",
              border: "none",
              borderRight: i < STEPS.length - 1 ? "1px solid var(--line)" : "none",
              background: i === step ? "var(--ink)" : i < step ? "var(--hover)" : "transparent",
              cursor: i < step ? "pointer" : "default",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              outline: "none",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color:
                  i === step
                    ? "rgba(255,255,255,0.6)"
                    : i < step
                    ? "var(--accent)"
                    : "var(--done)",
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: i === step ? "#fff" : i < step ? "var(--ink)" : "var(--slate)",
              }}
            >
              {s}
            </span>
          </button>
        ))}
      </div>

      {/* Error banner with Retry */}
      {error && (
        <div
          style={{
            marginBottom: 20,
            padding: "12px 14px",
            border: "1px solid var(--alert)",
            color: "var(--alert)",
            fontSize: 13,
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
          role="alert"
        >
          <Icon
            icon="ph:warning"
            width={14}
            style={{ flexShrink: 0, marginTop: 1 }}
            aria-hidden="true"
          />
          <span style={{ flex: 1 }}>{error}</span>
          <button
            type="button"
            onClick={() => void handleStepAction()}
            disabled={loading}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: "var(--alert)",
              background: "none",
              border: "1px solid var(--alert)",
              padding: "3px 8px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleStepAction();
        }}
      >
        <AnimatePresence mode="wait">
          {/* ── Step 0: Vehicle details ── */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}
              >
                <div>
                  <label className="field-label" htmlFor="car-make">Make</label>
                  <input
                    id="car-make"
                    required
                    className="input"
                    placeholder="Toyota"
                    value={form.make}
                    onChange={(e) => updateForm("make", e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="car-model">Model</label>
                  <input
                    id="car-model"
                    required
                    className="input"
                    placeholder="Avanza"
                    value={form.model}
                    onChange={(e) => updateForm("model", e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="car-year">Year</label>
                  <input
                    id="car-year"
                    required
                    type="number"
                    min={1990}
                    max={new Date().getFullYear() + 1}
                    className="input"
                    placeholder="2022"
                    value={form.year}
                    onChange={(e) => updateForm("year", e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="car-type">Type</label>
                  <select
                    id="car-type"
                    className="input select"
                    value={form.type}
                    onChange={(e) => updateForm("type", e.target.value)}
                  >
                    {vehicleTypes.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="car-city">City</label>
                  <select
                    id="car-city"
                    required
                    className="input select"
                    value={form.city}
                    onChange={(e) => updateForm("city", e.target.value)}
                  >
                    <option value="">Select city</option>
                    {cities.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="car-plate">Plate number</label>
                  <input
                    id="car-plate"
                    required
                    className="input"
                    placeholder="B 1234 ABC"
                    value={form.plateNumber}
                    onChange={(e) => updateForm("plateNumber", e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="field-label" htmlFor="car-vin">VIN</label>
                <input
                  id="car-vin"
                  required
                  className="input"
                  placeholder="17-character VIN"
                  maxLength={17}
                  value={form.vin}
                  onChange={(e) => updateForm("vin", e.target.value)}
                />
              </div>

              <div>
                <label className="field-label" htmlFor="car-price">Price per day (IDR)</label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--slate)",
                    }}
                  >
                    RP
                  </span>
                  <input
                    id="car-price"
                    required
                    type="number"
                    min={50000}
                    className="input"
                    style={{ paddingLeft: 36 }}
                    placeholder="320000"
                    value={form.pricePerDay}
                    onChange={(e) => updateForm("pricePerDay", e.target.value)}
                  />
                </div>
                <p style={{ fontSize: 13, color: "var(--slate)", marginTop: 8, lineHeight: 1.6 }}>
                  You receive 95% of each booking. Waypoint takes a 5% platform fee.
                </p>
                {payout !== null && (
                  <div
                    style={{
                      marginTop: 12,
                      border: "1px solid var(--line)",
                      padding: "12px 14px",
                    }}
                  >
                    <div className="spec-row">
                      <span className="spec-label">Listed price</span>
                      <span className="spec-value">{formatIDR(priceNum)}/day</span>
                    </div>
                    <div className="spec-row" style={{ borderBottom: "none" }}>
                      <span className="spec-label">You receive</span>
                      <span className="spec-value" style={{ color: "var(--ok)" }}>
                        {formatIDR(payout)}/day
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Step 1: STNK ── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <p style={{ fontSize: 14, color: "var(--slate)", marginBottom: 20, lineHeight: 1.6 }}>
                Upload your STNK (vehicle registration card). Files are AES-256-GCM encrypted at
                rest.
              </p>
              <FileUploadSlot
                id="doc-stnk"
                label="STNK (vehicle registration)"
                hint="Front side of your STNK document"
                file={stnkFile}
                onFileChange={setStnkFile}
                uploaded={stnkUploaded}
              />
            </motion.div>
          )}

          {/* ── Step 2: Insurance ── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <p style={{ fontSize: 14, color: "var(--slate)", marginBottom: 20, lineHeight: 1.6 }}>
                Upload your insurance certificate. Files are AES-256-GCM encrypted at rest.
              </p>
              <FileUploadSlot
                id="doc-insurance"
                label="Insurance certificate"
                hint="Valid insurance coverage document"
                file={insuranceFile}
                onFileChange={setInsuranceFile}
                uploaded={insuranceUploaded}
              />
            </motion.div>
          )}

          {/* ── Step 3: Review & submit ── */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div
                style={{
                  border: "1px solid var(--line)",
                  padding: "20px 22px",
                  marginBottom: 24,
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 17,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: "var(--ink)",
                    marginBottom: 12,
                  }}
                >
                  Review your listing
                </h3>
                {[
                  { label: "Vehicle", value: `${form.year} ${form.make} ${form.model}` },
                  { label: "Type", value: form.type },
                  { label: "City", value: form.city || "—" },
                  { label: "Plate", value: form.plateNumber || "—" },
                  { label: "VIN", value: form.vin || "—" },
                  {
                    label: "Price/day",
                    value:
                      form.pricePerDay && !isNaN(parseInt(form.pricePerDay, 10))
                        ? formatIDR(parseInt(form.pricePerDay, 10))
                        : "—",
                  },
                  { label: "STNK", value: stnkFile ? stnkFile.name : "—" },
                  { label: "Insurance", value: insuranceFile ? insuranceFile.name : "—" },
                ].map((r) => (
                  <div key={r.label} className="spec-row">
                    <span className="spec-label">{r.label}</span>
                    <span className="spec-value">{r.value}</span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  border: "1px solid var(--line)",
                  padding: "12px 14px",
                  marginBottom: 20,
                  display: "flex",
                  gap: 10,
                }}
              >
                <Icon
                  icon="ph:info"
                  width={14}
                  style={{ color: "var(--slate)", flexShrink: 0, marginTop: 1 }}
                  aria-hidden="true"
                />
                <p style={{ fontSize: 13, color: "var(--slate)", lineHeight: 1.6 }}>
                  Your listing will be in <strong>Pending</strong> status. An admin will review your
                  documents and approve or reject the listing. Only approved listings are visible to
                  customers.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation buttons */}
        <div style={{ marginTop: 32, display: "flex", gap: 12, justifyContent: "space-between" }}>
          {step > 0 ? (
            <button
              type="button"
              onClick={goBack}
              className="btn btn-ghost"
              style={{ fontSize: 11 }}
            >
              ← Previous
            </button>
          ) : (
            <div />
          )}
          {step < 3 ? (
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ fontSize: 11 }}
            >
              {loading ? "Please wait…" : "Next →"}
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ fontSize: 11 }}
            >
              <Icon icon="ph:paper-plane-tilt" width={14} aria-hidden="true" />
              {loading ? "Submitting…" : "Submit listing"}
            </button>
          )}
        </div>
      </form>
    </>
  );
}
