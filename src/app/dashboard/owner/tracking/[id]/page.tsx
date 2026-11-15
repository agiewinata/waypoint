"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { Header } from "@/components/ui/Header";
import { SideNav } from "@/components/ui/SideNav";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { StatusTag } from "@/components/ui/StatusTag";

export const dynamic = "force-dynamic";

const NAV_ITEMS = [
  { label: "Overview",   href: "/dashboard/owner",           icon: "ph:squares-four" },
  { label: "My Cars",    href: "/dashboard/owner/cars",       icon: "ph:car" },
  { label: "Requests",   href: "/dashboard/owner/bookings",   icon: "ph:clipboard-text", badge: 2 },
  { label: "Tracking",   href: "/dashboard/owner/tracking",   icon: "ph:map-pin" },
  { label: "Earnings",   href: "/dashboard/owner/earnings",   icon: "ph:currency-circle-dollar" },
  { label: "Messages",   href: "/messages",                   icon: "ph:chat-dots" },
  { label: "Account",    href: "/account",                    icon: "ph:user" },
];

const BOOKING = {
  id: "BK-1182",
  vehicle: "2022 Toyota Avanza",
  listingCode: "WP-7731",
  customer: "Andi Pratama",
  startDate: "2026-11-10",
  endDate: "2026-11-13",
  status: "Active",
  isOverdue: false,
};

// Simulate location moving around Jakarta
const BASE_LAT = -6.2088;
const BASE_LNG = 106.8456;

export default function LiveTrackingPage() {
  const [loc, setLoc] = useState({ lat: BASE_LAT, lng: BASE_LNG, speed: 42, accuracy: 15 });
  const [lastSeen, setLastSeen] = useState("Just now");

  // Animate location slightly every few seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLoc((prev) => ({
        lat: prev.lat + (Math.random() - 0.5) * 0.001,
        lng: prev.lng + (Math.random() - 0.5) * 0.001,
        speed: Math.round(20 + Math.random() * 60),
        accuracy: Math.round(10 + Math.random() * 20),
      }));
      setLastSeen("Just now");
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Convert lat/lng to SVG coordinates (simple mercator-ish projection)
  const mapW = 600, mapH = 400;
  const latRange = 0.05, lngRange = 0.07;
  const markerX = ((loc.lng - (BASE_LNG - lngRange / 2)) / lngRange) * mapW;
  const markerY = ((loc.lat - (BASE_LAT - latRange / 2)) / latRange) * mapH;

  return (
    <>
      <Header userName="Dimas Raharjo" userInitials="DR" />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container">
          <div className="dashboard-layout">
            <div className="dashboard-sidebar">
              <SideNav
                items={NAV_ITEMS}
                userName="Dimas Raharjo"
                userRole="Owner"
                userInitials="DR"
                switchRoleHref="/dashboard/customer"
              />
            </div>

            <div className="dashboard-content">
              <Breadcrumb
                crumbs={[
                  { label: "Owner dashboard", href: "/dashboard/owner" },
                  { label: "Live tracking" },
                ]}
              />

              <div
                style={{
                  borderBottom: "1px solid var(--ink)",
                  paddingBottom: 16,
                  marginBottom: 28,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <span className="kicker" style={{ marginBottom: 6, display: "block" }}>
                    {BOOKING.id} · {BOOKING.vehicle}
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
                    Live tracking
                  </h1>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <StatusTag status={BOOKING.status} />
                  <span className="tag" style={{ color: "var(--ok)" }}>
                    <span className="dot animate-pulse-dot" style={{ background: "var(--ok)" }} />
                    Live
                  </span>
                </div>
              </div>

              {/* Map */}
              <div
                style={{
                  border: "1px solid var(--line)",
                  marginBottom: 24,
                  position: "relative",
                  overflow: "hidden",
                  background: "var(--thumb)",
                }}
              >
                {/* SVG flat map */}
                <svg
                  width="100%"
                  viewBox={`0 0 ${mapW} ${mapH}`}
                  style={{ display: "block" }}
                  aria-label="Live location map"
                  role="img"
                >
                  {/* Background */}
                  <rect width={mapW} height={mapH} fill="var(--thumb)" />

                  {/* Road grid */}
                  {[0,1,2,3,4,5,6,7].map((i) => (
                    <line key={`h${i}`} x1={0} y1={50*i+5} x2={mapW} y2={50*i+5} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                  ))}
                  {[0,1,2,3,4,5,6,7,8,9,10,11].map((i) => (
                    <line key={`v${i}`} x1={50*i+5} y1={0} x2={50*i+5} y2={mapH} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                  ))}

                  {/* Major roads (thicker) */}
                  <line x1={0} y1={mapH/2} x2={mapW} y2={mapH/2} stroke="rgba(255,255,255,0.65)" strokeWidth="3" />
                  <line x1={mapW/2} y1={0} x2={mapW/2} y2={mapH} stroke="rgba(255,255,255,0.65)" strokeWidth="3" />

                  {/* Park area */}
                  <rect x={80} y={60} width={100} height={80} fill="rgba(14,85,64,0.12)" />
                  <rect x={400} y={260} width={80} height={60} fill="rgba(14,85,64,0.12)" />

                  {/* Vehicle trail (last positions faded) */}
                  <circle cx={markerX - 15} cy={markerY - 8} r={4} fill="var(--accent)" opacity={0.2} />
                  <circle cx={markerX - 8} cy={markerY - 4} r={5} fill="var(--accent)" opacity={0.35} />

                  {/* Ping ring */}
                  <motion.rect
                    x={markerX - 20}
                    y={markerY - 20}
                    width={40}
                    height={40}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="1.5"
                    initial={{ scale: 0.4, opacity: 0.7 }}
                    animate={{ scale: 2.0, opacity: 0 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                    style={{ transformOrigin: `${markerX}px ${markerY}px` }}
                  />

                  {/* Square marker */}
                  <rect x={markerX - 6} y={markerY - 6} width={12} height={12} fill="var(--accent)" />
                  <rect x={markerX - 8} y={markerY - 8} width={16} height={16} fill="none" stroke="white" strokeWidth="1.5" />

                  {/* Speed label */}
                  <rect x={markerX + 10} y={markerY - 18} width={56} height={16} fill="var(--paper)" />
                  <text x={markerX + 13} y={markerY - 6} style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "var(--ink)" }}>
                    {loc.speed} km/h
                  </text>
                </svg>

                {/* Map overlay — location coords */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 10,
                    left: 12,
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--slate)",
                    letterSpacing: "0.06em",
                    background: "rgba(245,243,237,0.9)",
                    padding: "3px 7px",
                  }}
                >
                  {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)} · ±{loc.accuracy}m
                </div>

                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 12,
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--ok)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    background: "rgba(245,243,237,0.9)",
                    padding: "3px 7px",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <span className="dot animate-pulse-dot" style={{ background: "var(--ok)", width: 6, height: 6, display: "inline-block" }} />
                  Live — {lastSeen}
                </div>
              </div>

              {/* Info cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(160px,100%), 1fr))",
                  gap: 1,
                  background: "var(--line)",
                  border: "1px solid var(--line)",
                  marginBottom: 24,
                }}
              >
                {[
                  { label: "Customer",    value: BOOKING.customer,                     icon: "ph:user" },
                  { label: "Return date", value: BOOKING.endDate,                      icon: "ph:calendar" },
                  { label: "Speed",       value: `${loc.speed} km/h`,                 icon: "ph:speedometer" },
                  { label: "Accuracy",    value: `±${loc.accuracy} m`,                icon: "ph:crosshair-simple" },
                ].map((info) => (
                  <div
                    key={info.label}
                    style={{
                      background: "var(--surface)",
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Icon icon={info.icon} width={16} style={{ color: "var(--slate)", flexShrink: 0 }} aria-hidden="true" />
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--ink)",
                        }}
                      >
                        {info.value}
                      </div>
                      <div className="kicker" style={{ marginTop: 2 }}>{info.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Consent notice */}
              <div
                style={{
                  border: "1px solid var(--line)",
                  padding: "12px 16px",
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <Icon icon="ph:lock" width={14} style={{ color: "var(--slate)", flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                <p style={{ fontSize: 13, color: "var(--slate)", lineHeight: 1.6 }}>
                  Location tracking is <strong>consent-based</strong>. The customer granted permission at booking time. Tracking stops when the booking ends. Data is never shared with third parties.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
