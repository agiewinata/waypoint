import { Header } from "@/components/ui/Header";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { StatusTag } from "@/components/ui/StatusTag";
import { Icon } from "@iconify/react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TRIP = {
  id: "BK-1182",
  vehicle: "2022 Toyota Avanza",
  listingCode: "WP-7731",
  city: "Jakarta",
  owner: "Dimas Raharjo",
  startDate: "2026-11-10",
  endDate: "2026-11-13",
  days: 3,
  pricePerDay: 320000,
  total: 960000,
  platformFee: 48000,
  ownerPayout: 912000,
  status: "Active",
  paymentStatus: "Held",
  locationConsent: true,
  lat: -6.2088,
  lng: 106.8456,
};

function formatIDR(n: number) {
  return `RP ${n.toLocaleString("id-ID")}`;
}

export default function TripDetailPage() {
  const isActive = TRIP.status === "Active";

  return (
    <>
      <Header userName="Andi Pratama" userInitials="AP" />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container" style={{ maxWidth: 820 }}>
          <Breadcrumb
            crumbs={[
              { label: "Dashboard", href: "/dashboard/customer" },
              { label: `Trip ${TRIP.id}` },
            ]}
          />

          {/* Title row */}
          <div
            style={{
              borderBottom: "1px solid var(--ink)",
              paddingBottom: 16,
              marginBottom: 32,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <span className="kicker" style={{ marginBottom: 6, display: "block" }}>
                Trip receipt · {TRIP.id}
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
                {TRIP.vehicle}
              </h1>
            </div>
            <StatusTag status={TRIP.status} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr min(300px,100%)", gap: 32, alignItems: "start" }}>
            {/* Left col */}
            <div>
              {/* Timeline / status steps */}
              <div style={{ marginBottom: 36 }}>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 17,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: "var(--ink)",
                    marginBottom: 16,
                    borderTop: "1px solid var(--ink)",
                    paddingTop: 16,
                  }}
                >
                  Booking timeline
                </h2>
                {[
                  { label: "Booking requested",   date: "2026-11-08 · 09:12", done: true  },
                  { label: "Owner confirmed",      date: "2026-11-08 · 10:45", done: true  },
                  { label: "Payment into escrow",  date: "2026-11-09 · 14:00", done: true  },
                  { label: "Trip started",         date: "2026-11-10 · 08:30", done: true  },
                  { label: "Safe return",          date: "Expected 2026-11-13", done: false },
                  { label: "Escrow released",      date: "On safe return",     done: false },
                ].map((step, i) => (
                  <div
                    key={step.label}
                    style={{
                      display: "flex",
                      gap: 16,
                      paddingBottom: i < 5 ? 20 : 0,
                      position: "relative",
                    }}
                  >
                    {/* Connector line */}
                    {i < 5 && (
                      <div
                        style={{
                          position: "absolute",
                          left: 7,
                          top: 20,
                          bottom: 0,
                          width: 1,
                          background: step.done ? "var(--ok)" : "var(--line)",
                        }}
                        aria-hidden="true"
                      />
                    )}
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        background: step.done ? "var(--ok)" : "var(--line)",
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                      aria-hidden="true"
                    />
                    <div>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500, color: step.done ? "var(--ink)" : "var(--slate)" }}>
                        {step.label}
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--slate)", marginTop: 2 }}>
                        {step.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Location tracking panel */}
              <div style={{ border: "1px solid var(--line)", marginBottom: 28 }}>
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--line)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--slate)",
                    }}
                  >
                    Location tracking
                  </span>
                  {TRIP.locationConsent ? (
                    <span className="tag" style={{ color: "var(--ok)" }}>
                      <span className="dot animate-pulse-dot" style={{ background: "var(--ok)" }} />
                      Consent active
                    </span>
                  ) : (
                    <span className="tag" style={{ color: "var(--done)" }}>
                      <span className="dot" style={{ background: "var(--done)" }} />
                      Disabled
                    </span>
                  )}
                </div>
                {/* Map placeholder */}
                <div
                  style={{
                    height: 180,
                    background: "var(--thumb)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* SVG flat map */}
                  <svg width="100%" height="100%" style={{ opacity: 0.6 }}>
                    {/* Road grid */}
                    {[0,1,2,3,4,5].map((i) => (
                      <line key={`h${i}`} x1="0" y1={30*i+10} x2="100%" y2={30*i+10} stroke="var(--line)" strokeWidth="1" />
                    ))}
                    {[0,1,2,3,4,5,6,7,8,9].map((i) => (
                      <line key={`v${i}`} x1={60*i+10} y1="0" x2={60*i+10} y2="100%" stroke="var(--line)" strokeWidth="1" />
                    ))}
                  </svg>
                  {/* Location marker */}
                  {isActive && TRIP.locationConsent && (
                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                      }}
                    >
                      {/* Ping ring */}
                      <div
                        className="animate-ping-radar"
                        style={{
                          position: "absolute",
                          width: 36,
                          height: 36,
                          border: "1.5px solid var(--accent)",
                        }}
                        aria-hidden="true"
                      />
                      {/* Square marker */}
                      <div
                        style={{
                          position: "absolute",
                          width: 10,
                          height: 10,
                          background: "var(--accent)",
                          transform: "translate(-50%, -50%)",
                        }}
                        aria-label="Current vehicle location"
                        role="img"
                      />
                    </div>
                  )}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 8,
                      left: 10,
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--slate)",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {TRIP.lat.toFixed(4)}, {TRIP.lng.toFixed(4)}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {isActive && (
                  <Link
                    href={`/disputes/raise/${TRIP.id}`}
                    className="btn btn-danger"
                    style={{ fontSize: 11 }}
                  >
                    <Icon icon="ph:flag" width={14} aria-hidden="true" />
                    Raise a dispute
                  </Link>
                )}
                <button className="btn btn-ghost" style={{ fontSize: 11 }}>
                  <Icon icon="ph:download-simple" width={14} aria-hidden="true" />
                  Download receipt
                </button>
              </div>
            </div>

            {/* Right col — receipt */}
            <div>
              <div style={{ border: "1px solid var(--ink)", background: "var(--surface)" }}>
                <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="kicker">Receipt</span>
                  <StatusTag status={TRIP.paymentStatus} />
                </div>
                <div style={{ padding: "16px 18px" }}>
                  {[
                    { label: "Booking",    value: TRIP.id },
                    { label: "Vehicle",    value: TRIP.listingCode },
                    { label: "Owner",      value: TRIP.owner },
                    { label: "Start",      value: TRIP.startDate },
                    { label: "End",        value: TRIP.endDate },
                    { label: "Duration",   value: `${TRIP.days} days` },
                    { label: "Rate",       value: formatIDR(TRIP.pricePerDay) + "/d" },
                  ].map((r) => (
                    <div key={r.label} className="spec-row">
                      <span className="spec-label">{r.label}</span>
                      <span className="spec-value">{r.value}</span>
                    </div>
                  ))}
                  <div
                    style={{
                      borderTop: "2px solid var(--ink)",
                      marginTop: 8,
                      paddingTop: 12,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <span className="spec-label" style={{ color: "var(--ink)", fontWeight: 700 }}>Total paid</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>
                      {formatIDR(TRIP.total)}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      padding: "8px 10px",
                      background: "var(--hover)",
                      border: "1px solid var(--line)",
                    }}
                  >
                    <div className="kicker" style={{ marginBottom: 4 }}>Escrow breakdown</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--slate)", lineHeight: 1.8 }}>
                      Platform fee (5%): {formatIDR(TRIP.platformFee)}<br />
                      Owner receives: {formatIDR(TRIP.ownerPayout)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
