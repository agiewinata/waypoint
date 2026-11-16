"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import type { OwnerVehicle } from "@/server/vehicles";

// ── Types ────────────────────────────────────────────────────────────────────

type Editable = "all" | "price" | "none";

export interface EditVehicleFormProps {
  vehicle: OwnerVehicle;
  editable: Editable;
  cities: readonly string[];
  vehicleTypes: readonly string[];
}

interface EditableFields {
  make: string;
  model: string;
  year: string;
  type: string;
  city: string;
  plateNumber: string;
  pricePerDay: string;
}

type FieldKey = keyof EditableFields;

const FIELD_KEYS: readonly FieldKey[] = [
  "make",
  "model",
  "year",
  "type",
  "city",
  "plateNumber",
  "pricePerDay",
];

const NUMERIC_FIELDS: readonly FieldKey[] = ["year", "pricePerDay"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function toFormFields(v: OwnerVehicle): EditableFields {
  return {
    make: v.make,
    model: v.model,
    year: String(v.year),
    type: v.type,
    city: v.city,
    plateNumber: v.plateNumber,
    pricePerDay: String(v.pricePerDay),
  };
}

async function readErrorBody(
  res: Response
): Promise<{ error: string; fields: Partial<Record<FieldKey, string>> }> {
  const fallback = `Request failed with status ${res.status}`;
  try {
    const json = (await res.json()) as {
      error?: unknown;
      fields?: Record<string, unknown>;
    };
    const error = typeof json.error === "string" && json.error.length > 0 ? json.error : fallback;
    const fields: Partial<Record<FieldKey, string>> = {};
    for (const [key, messages] of Object.entries(json.fields ?? {})) {
      if (Array.isArray(messages) && typeof messages[0] === "string") {
        fields[key as FieldKey] = messages[0];
      }
    }
    return { error, fields };
  } catch {
    return { error: fallback, fields: {} };
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

export function EditVehicleForm({ vehicle, editable, cities, vehicleTypes }: EditVehicleFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<EditableFields>(() => toFormFields(vehicle));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const initial = toFormFields(vehicle);

  function isDisabled(field: FieldKey): boolean {
    if (saving || editable === "none") return true;
    if (editable === "price") return field !== "pricePerDay";
    return false;
  }

  function updateField(field: FieldKey, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setNotice(null);

    const body: Record<string, string | number> = { action: "update" };
    for (const key of FIELD_KEYS) {
      const value = form[key].trim();
      if (value === initial[key]) continue;
      body[key] = NUMERIC_FIELDS.includes(key) ? Number(value) : value;
    }

    if (Object.keys(body).length === 1) {
      setNotice("No changes to save.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicle.listingCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const parsed = await readErrorBody(res);
        setError(parsed.error);
        setFieldErrors(parsed.fields);
        return;
      }
      setNotice("Changes saved.");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const noteText =
    editable === "price"
      ? "Price changes apply to new bookings only."
      : editable === "none"
      ? "Under review"
      : null;

  function fieldError(field: FieldKey) {
    const msg = fieldErrors[field];
    if (!msg) return null;
    return <p style={{ fontSize: 12, color: "var(--alert)", marginTop: 6 }}>{msg}</p>;
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} style={{ border: "1px solid var(--line)", padding: "20px 22px" }}>
      {noteText && (
        <div
          style={{
            marginBottom: 20,
            padding: "12px 14px",
            border: "1px solid var(--line)",
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <Icon
            icon="ph:info"
            width={14}
            style={{ color: "var(--slate)", flexShrink: 0, marginTop: 1 }}
            aria-hidden="true"
          />
          <p style={{ fontSize: 13, color: "var(--slate)", lineHeight: 1.6 }}>{noteText}</p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 20,
            padding: "12px 14px",
            border: "1px solid var(--alert)",
            color: "var(--alert)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {notice && !error && (
        <div
          role="status"
          style={{
            marginBottom: 20,
            padding: "12px 14px",
            border: "1px solid var(--ok)",
            color: "var(--ok)",
            fontSize: 13,
          }}
        >
          {notice}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div>
          <label className="field-label" htmlFor="edit-make">Make</label>
          <input
            id="edit-make"
            className="input"
            value={form.make}
            disabled={isDisabled("make")}
            onChange={(e) => updateField("make", e.target.value)}
          />
          {fieldError("make")}
        </div>
        <div>
          <label className="field-label" htmlFor="edit-model">Model</label>
          <input
            id="edit-model"
            className="input"
            value={form.model}
            disabled={isDisabled("model")}
            onChange={(e) => updateField("model", e.target.value)}
          />
          {fieldError("model")}
        </div>
        <div>
          <label className="field-label" htmlFor="edit-year">Year</label>
          <input
            id="edit-year"
            type="number"
            className="input"
            value={form.year}
            disabled={isDisabled("year")}
            onChange={(e) => updateField("year", e.target.value)}
          />
          {fieldError("year")}
        </div>
        <div>
          <label className="field-label" htmlFor="edit-type">Type</label>
          <select
            id="edit-type"
            className="input select"
            value={form.type}
            disabled={isDisabled("type")}
            onChange={(e) => updateField("type", e.target.value)}
          >
            {vehicleTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          {fieldError("type")}
        </div>
        <div>
          <label className="field-label" htmlFor="edit-city">City</label>
          <select
            id="edit-city"
            className="input select"
            value={form.city}
            disabled={isDisabled("city")}
            onChange={(e) => updateField("city", e.target.value)}
          >
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {fieldError("city")}
        </div>
        <div>
          <label className="field-label" htmlFor="edit-plate">Plate number</label>
          <input
            id="edit-plate"
            className="input"
            value={form.plateNumber}
            disabled={isDisabled("plateNumber")}
            onChange={(e) => updateField("plateNumber", e.target.value)}
          />
          {fieldError("plateNumber")}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label className="field-label" htmlFor="edit-vin">VIN</label>
        <input id="edit-vin" className="input" value={vehicle.vin} readOnly />
      </div>

      <div>
        <label className="field-label" htmlFor="edit-price">Price per day (IDR)</label>
        <input
          id="edit-price"
          type="number"
          min={50000}
          className="input"
          value={form.pricePerDay}
          disabled={isDisabled("pricePerDay")}
          onChange={(e) => updateField("pricePerDay", e.target.value)}
        />
        {fieldError("pricePerDay")}
      </div>

      {editable !== "none" && (
        <div style={{ marginTop: 32, display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ fontSize: 11 }}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}
    </form>
  );
}
