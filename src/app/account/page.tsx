"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { Header } from "@/components/ui/Header";

type Section = "profile" | "security" | "notifications" | "danger";

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: "profile",       label: "Profile",       icon: "ph:user" },
  { id: "security",      label: "Security",      icon: "ph:lock" },
  { id: "notifications", label: "Notifications", icon: "ph:bell" },
  { id: "danger",        label: "Danger zone",   icon: "ph:warning" },
];

export default function AccountSettingsPage() {
  const [activeSection, setActiveSection] = useState<Section>("profile");
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [profile, setProfile] = useState({
    firstName: "Andi",
    lastName: "Pratama",
    email: "andi.pratama@email.com",
    phone: "+62 812-3456-7890",
    city: "Jakarta",
    bio: "",
  });

  const [notifPrefs, setNotifPrefs] = useState({
    bookingUpdates: true,
    paymentAlerts: true,
    newMessages: true,
    promotions: false,
    weeklyDigest: false,
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await new Promise((r) => setTimeout(r, 600));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function toggleNotif(key: keyof typeof notifPrefs) {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <>
      <Header userName="Andi Pratama" userInitials="AP" />

      <main style={{ padding: "36px 0 80px" }}>
        <div
          className="page-container"
          style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 32, alignItems: "start" }}
        >
          {/* Sidebar nav */}
          <div style={{ position: "sticky", top: 24 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--slate)",
                marginBottom: 10,
                paddingBottom: 8,
                borderBottom: "1px solid var(--line)",
              }}
            >
              Settings
            </div>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: activeSection === s.id ? "var(--ink)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  color: activeSection === s.id ? "var(--paper)" : s.id === "danger" ? "var(--alert)" : "var(--slate)",
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  fontWeight: activeSection === s.id ? 500 : 400,
                  marginBottom: 2,
                  transition: "all .12s",
                }}
              >
                <Icon icon={s.icon} width={14} aria-hidden="true" />
                {s.label}
              </button>
            ))}
          </div>

          {/* Content area */}
          <AnimatePresence mode="wait">
            {activeSection === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 24,
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    color: "var(--ink)",
                    marginBottom: 24,
                    paddingBottom: 16,
                    borderBottom: "1px solid var(--ink)",
                  }}
                >
                  Profile
                </h1>

                <form onSubmit={handleSave}>
                  {/* Avatar */}
                  <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        border: "1px solid var(--ink)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-mono)",
                        fontSize: 16,
                        fontWeight: 600,
                        background: "var(--ink)",
                        color: "var(--paper)",
                        flexShrink: 0,
                      }}
                      aria-hidden="true"
                    >
                      AP
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", marginBottom: 2 }}>
                        {profile.firstName} {profile.lastName}
                      </div>
                      <div className="kicker">Customer · Jakarta</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label className="field-label" htmlFor="firstName">First name</label>
                      <input
                        id="firstName"
                        type="text"
                        className="input"
                        value={profile.firstName}
                        onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="lastName">Last name</label>
                      <input
                        id="lastName"
                        type="text"
                        className="input"
                        value={profile.lastName}
                        onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label className="field-label" htmlFor="email">Email address</label>
                    <input
                      id="email"
                      type="email"
                      className="input"
                      value={profile.email}
                      onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label className="field-label" htmlFor="phone">Phone number</label>
                    <input
                      id="phone"
                      type="tel"
                      className="input"
                      value={profile.phone}
                      onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label className="field-label" htmlFor="city">City</label>
                    <select
                      id="city"
                      className="select"
                      value={profile.city}
                      onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
                    >
                      {["Jakarta","Surabaya","Bandung","Medan","Makassar","Semarang","Bogor","Depok","Tangerang"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label className="field-label" htmlFor="bio">Bio (optional)</label>
                    <textarea
                      id="bio"
                      rows={3}
                      className="input"
                      placeholder="Tell owners or customers a little about yourself…"
                      value={profile.bio}
                      onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                      style={{ resize: "none" }}
                    />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button type="submit" className="btn btn-primary" style={{ height: 44 }}>
                      <Icon icon="ph:floppy-disk" width={14} aria-hidden="true" />
                      Save changes
                    </button>
                    <AnimatePresence>
                      {saved && (
                        <motion.span
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ok)", letterSpacing: "0.06em" }}
                        >
                          <Icon icon="ph:check" width={12} style={{ display: "inline", marginRight: 4 }} aria-hidden="true" />
                          Saved
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </form>
              </motion.div>
            )}

            {activeSection === "security" && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 24,
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    color: "var(--ink)",
                    marginBottom: 24,
                    paddingBottom: 16,
                    borderBottom: "1px solid var(--ink)",
                  }}
                >
                  Security
                </h1>

                {/* Change password */}
                <div style={{ border: "1px solid var(--line)", marginBottom: 20 }}>
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", background: "var(--hover)" }}>
                    <span className="kicker">Change password</span>
                  </div>
                  <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <label className="field-label" htmlFor="currentPw">Current password</label>
                      <input id="currentPw" type="password" className="input" placeholder="••••••••" />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="newPw">New password</label>
                      <input id="newPw" type="password" className="input" placeholder="••••••••" />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="confirmPw">Confirm new password</label>
                      <input id="confirmPw" type="password" className="input" placeholder="••••••••" />
                    </div>
                    <button className="btn btn-primary" style={{ height: 42, alignSelf: "flex-start" }}>
                      Update password
                    </button>
                  </div>
                </div>

                {/* Sessions */}
                <div style={{ border: "1px solid var(--line)" }}>
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", background: "var(--hover)" }}>
                    <span className="kicker">Active sessions</span>
                  </div>
                  {[
                    { device: "Chrome on Windows", location: "Jakarta, ID", current: true,  time: "Now" },
                    { device: "Safari on iPhone",  location: "Jakarta, ID", current: false, time: "2 hours ago" },
                  ].map((s, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "14px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottom: i === 0 ? "1px solid var(--line)" : "none",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <Icon icon="ph:desktop" width={16} style={{ color: "var(--slate)" }} aria-hidden="true" />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{s.device}</div>
                          <div className="kicker" style={{ marginTop: 2 }}>{s.location} · {s.time}</div>
                        </div>
                      </div>
                      {s.current ? (
                        <span className="tag" style={{ color: "var(--ok)" }}>
                          <span className="dot" style={{ background: "var(--ok)" }} />
                          Current
                        </span>
                      ) : (
                        <button className="btn btn-ghost" style={{ fontSize: 11 }}>Revoke</button>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeSection === "notifications" && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 24,
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    color: "var(--ink)",
                    marginBottom: 24,
                    paddingBottom: 16,
                    borderBottom: "1px solid var(--ink)",
                  }}
                >
                  Notifications
                </h1>

                <div style={{ border: "1px solid var(--line)" }}>
                  {(
                    [
                      { key: "bookingUpdates" as const, label: "Booking updates",   desc: "Confirmations, cancellations, and reminders." },
                      { key: "paymentAlerts"  as const, label: "Payment alerts",    desc: "Escrow holds, releases, and payouts." },
                      { key: "newMessages"    as const, label: "New messages",      desc: "Messages from owners or customers." },
                      { key: "promotions"     as const, label: "Promotions",        desc: "Special offers and featured vehicles." },
                      { key: "weeklyDigest"   as const, label: "Weekly digest",     desc: "A summary of your activity each week." },
                    ] as const
                  ).map((item, i, arr) => (
                    <div
                      key={item.key}
                      style={{
                        padding: "16px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none",
                        gap: 16,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", marginBottom: 2 }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--slate)" }}>{item.desc}</div>
                      </div>
                      {/* Toggle */}
                      <button
                        onClick={() => toggleNotif(item.key)}
                        role="switch"
                        aria-checked={notifPrefs[item.key]}
                        aria-label={`Toggle ${item.label}`}
                        style={{
                          width: 42,
                          height: 24,
                          background: notifPrefs[item.key] ? "var(--accent)" : "var(--thumb)",
                          border: "1px solid " + (notifPrefs[item.key] ? "var(--accent)" : "var(--line)"),
                          cursor: "pointer",
                          position: "relative",
                          flexShrink: 0,
                          transition: "background .15s, border-color .15s",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: 3,
                            left: notifPrefs[item.key] ? 20 : 3,
                            width: 16,
                            height: 16,
                            background: "var(--paper)",
                            transition: "left .15s",
                          }}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeSection === "danger" && (
              <motion.div
                key="danger"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 24,
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    color: "var(--alert)",
                    marginBottom: 24,
                    paddingBottom: 16,
                    borderBottom: "1px solid var(--alert)",
                  }}
                >
                  Danger zone
                </h1>

                {/* Delete account */}
                <div style={{ border: "1px solid var(--alert)" }}>
                  <div
                    style={{
                      padding: "14px 16px",
                      borderBottom: "1px solid var(--alert)",
                      background: "rgba(166,55,42,0.05)",
                    }}
                  >
                    <span className="kicker" style={{ color: "var(--alert)" }}>Delete account</span>
                  </div>
                  <div style={{ padding: "20px 16px" }}>
                    <p style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.6, marginBottom: 20 }}>
                      Permanently delete your account and all associated data. This action cannot be undone.
                      Any active bookings must be completed or cancelled first.
                    </p>

                    <AnimatePresence>
                      {!showDeleteConfirm ? (
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="btn btn-danger"
                          style={{ height: 44 }}
                        >
                          <Icon icon="ph:trash" width={14} aria-hidden="true" />
                          Delete my account
                        </button>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                        >
                          <div
                            style={{
                              border: "1px solid var(--alert)",
                              padding: "14px 16px",
                              marginBottom: 16,
                              background: "rgba(166,55,42,0.05)",
                            }}
                          >
                            <p style={{ fontSize: 13, color: "var(--alert)", lineHeight: 1.6, margin: 0 }}>
                              <Icon icon="ph:warning" width={13} style={{ display: "inline", marginRight: 6 }} aria-hidden="true" />
                              Are you sure? This will permanently delete your account, trip history, and all data.
                            </p>
                          </div>
                          <div style={{ display: "flex", gap: 10 }}>
                            <button className="btn btn-danger" style={{ height: 44 }}>
                              Yes, delete permanently
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(false)}
                              className="btn btn-ghost"
                              style={{ height: 44 }}
                            >
                              Cancel
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}
