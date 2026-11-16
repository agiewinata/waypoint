"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { StatusTag } from "@/components/ui/StatusTag";
import { authClient } from "@/lib/auth-client";
import type { AccountOverview } from "@/server/profiles";

type Section = "profile" | "roles" | "security";

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: "profile", label: "Profile", icon: "ph:user" },
  { id: "roles", label: "Roles", icon: "ph:identification-card" },
  { id: "security", label: "Security", icon: "ph:lock" },
];

interface ProfileFieldErrors {
  name?: string[];
  phone?: string[];
  address?: string[];
}

const labelStyle = { fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--ink)" } as const;
const bodyStyle = { fontSize: 14, color: "var(--slate)", lineHeight: 1.6 } as const;

export function AccountSettings({ overview }: { overview: AccountOverview }) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>("profile");

  return (
    <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
      <nav aria-label="Account sections" style={{ width: 200, flexShrink: 0 }}>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveSection(s.id)}
            className={`sidenav-item${activeSection === s.id ? " active" : ""}`}
            style={{ width: "100%", border: "none", background: "transparent", cursor: "pointer" }}
            aria-current={activeSection === s.id ? "page" : undefined}
          >
            <Icon icon={s.icon} width={14} aria-hidden="true" />
            {s.label}
          </button>
        ))}
      </nav>

      <div style={{ flex: 1, minWidth: 0, maxWidth: 560 }}>
        {activeSection === "profile" && (
          <ProfileSection
            overview={overview}
            onSaved={() => router.refresh()}
          />
        )}
        {activeSection === "roles" && <RolesSection overview={overview} />}
        {activeSection === "security" && <SecuritySection hasPassword={overview.hasPassword} />}
      </div>
    </div>
  );
}

function ProfileSection({ overview, onSaved }: { overview: AccountOverview; onSaved: () => void }) {
  const [name, setName] = useState(overview.name);
  const [phone, setPhone] = useState(overview.phone ?? "");
  const [address, setAddress] = useState(overview.address ?? "");
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const dirty =
    name.trim() !== overview.name ||
    phone.trim() !== (overview.phone ?? "") ||
    address.trim() !== (overview.address ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, string> = {};
    if (name.trim() !== overview.name) payload.name = name.trim();
    if (phone.trim() !== (overview.phone ?? "")) payload.phone = phone.trim();
    if (address.trim() !== (overview.address ?? "")) payload.address = address.trim();
    if (Object.keys(payload).length === 0) return;

    setFieldErrors({});
    setGlobalError(null);
    setSaved(false);
    setSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        setSaved(true);
        onSaved();
        return;
      }

      if (res.status === 400 && data.fields) {
        setFieldErrors(data.fields);
        return;
      }

      setGlobalError(data.error ?? "Something went wrong");
    } catch {
      setGlobalError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2 style={{ ...labelStyle, fontSize: 20, letterSpacing: "-0.02em", marginBottom: 6 }}>Profile</h2>
      <p style={{ ...bodyStyle, marginBottom: 24 }}>Your details are shared across your Owner and Customer roles.</p>

      <div style={{ marginBottom: 16 }}>
        <label className="field-label" htmlFor="account-name">Name</label>
        <input
          id="account-name"
          name="name"
          type="text"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <FieldError messages={fieldErrors.name} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label className="field-label" htmlFor="account-email">Email</label>
        <input
          id="account-email"
          name="email"
          type="email"
          className="input"
          value={overview.email}
          readOnly
          aria-readonly="true"
          style={{ color: "var(--slate)" }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label className="field-label" htmlFor="account-phone">Phone number</label>
        <input
          id="account-phone"
          name="phone"
          type="tel"
          className="input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <FieldError messages={fieldErrors.phone} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label className="field-label" htmlFor="account-address">Address</label>
        <textarea
          id="account-address"
          name="address"
          className="input"
          rows={3}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <FieldError messages={fieldErrors.address} />
      </div>

      {globalError && (
        <p role="alert" style={{ fontSize: 13, color: "var(--alert)", marginBottom: 12 }}>
          {globalError}
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button type="submit" className="btn btn-primary" disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && (
          <span role="status" style={{ fontSize: 13, color: "var(--ok)" }}>
            Saved
          </span>
        )}
      </div>
    </form>
  );
}

function RolesSection({ overview }: { overview: AccountOverview }) {
  const { owner, customer, admin } = overview.roles;

  return (
    <div>
      <h2 style={{ ...labelStyle, fontSize: 20, letterSpacing: "-0.02em", marginBottom: 6 }}>Roles</h2>
      <p style={{ ...bodyStyle, marginBottom: 24 }}>Owners list cars. Customers rent them.</p>

      <div className="card" style={{ padding: 20, marginBottom: 12 }}>
        <RoleRow
          title="Owner"
          status={owner?.status ?? null}
          enableHref="/dashboard/owner/new"
          verifyHref="/dashboard/owner/verify"
        />
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 12 }}>
        <RoleRow
          title="Customer"
          status={customer?.status ?? null}
          enableHref="/dashboard/customer/new"
          verifyHref="/dashboard/customer/verify"
        />
      </div>

      {admin && (
        <div className="card" style={{ padding: 20 }}>
          <span className="tag">Admin</span>
        </div>
      )}
    </div>
  );
}

function RoleRow({
  title,
  status,
  enableHref,
  verifyHref,
}: {
  title: string;
  status: string | null;
  enableHref: string;
  verifyHref: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={labelStyle}>{title}</span>
        {status && <StatusTag status={status} />}
      </div>
      {status === null ? (
        <Link href={enableHref} className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: 10 }}>
          Enable {title.toLowerCase()}
        </Link>
      ) : status !== "Verified" ? (
        <Link href={verifyHref} className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: 10 }}>
          Verify identity
        </Link>
      ) : null}
    </div>
  );
}

function SecuritySection({ hasPassword }: { hasPassword: boolean }) {
  return (
    <div>
      <h2 style={{ ...labelStyle, fontSize: 20, letterSpacing: "-0.02em", marginBottom: 6 }}>Security</h2>
      <p style={{ ...bodyStyle, marginBottom: 24 }}>Manage how you sign in to Waypoint.</p>

      {hasPassword ? <ChangePasswordForm /> : (
        <p style={bodyStyle}>You sign in with Google; there is no password to change.</p>
      )}
    </div>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);

    if (newPassword.length < 10) {
      setError("New password must be at least 10 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSaving(true);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    setSaving(false);

    if (error) {
      setError(error.message ?? "Could not change password");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setDone(true);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ marginBottom: 16 }}>
        <label className="field-label" htmlFor="current-password">Current password</label>
        <input
          id="current-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          className="input"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label className="field-label" htmlFor="new-password">New password</label>
        <input
          id="new-password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          className="input"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label className="field-label" htmlFor="confirm-password">Confirm new password</label>
        <input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="input"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" style={{ fontSize: 13, color: "var(--alert)", marginBottom: 12 }}>
          {error}
        </p>
      )}
      {done && (
        <p role="status" style={{ fontSize: 13, color: "var(--ok)", marginBottom: 12 }}>
          Password changed. Other sessions have been signed out.
        </p>
      )}

      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? "Updating…" : "Change password"}
      </button>
    </form>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p role="alert" style={{ fontSize: 12, color: "var(--alert)", marginTop: 6 }}>
      {messages[0]}
    </p>
  );
}
