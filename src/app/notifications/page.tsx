"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { Header } from "@/components/ui/Header";
import Link from "next/link";

type Notif = {
  id: string;
  type: "booking" | "payment" | "dispute" | "system" | "message";
  title: string;
  body: string;
  time: string;
  read: boolean;
  href?: string;
};

const INITIAL: Notif[] = [
  {
    id: "n1",
    type: "booking",
    title: "Booking confirmed",
    body: "Your booking BK-1182 for the Toyota Avanza has been confirmed by the owner.",
    time: "5 min ago",
    read: false,
    href: "/trips/BK-1182",
  },
  {
    id: "n2",
    type: "payment",
    title: "Payment held in escrow",
    body: "RP 1,350,000 has been placed in escrow for booking BK-1182. It will be released after the trip ends.",
    time: "5 min ago",
    read: false,
    href: "/trips/BK-1182",
  },
  {
    id: "n3",
    type: "message",
    title: "New message from Dimas Raharjo",
    body: "Great, the car will be ready at 8am at the pickup point.",
    time: "10 min ago",
    read: false,
    href: "/messages",
  },
  {
    id: "n4",
    type: "system",
    title: "Identity verification approved",
    body: "Your KTP and SIM have been verified. You can now book vehicles on Waypoint.",
    time: "2 hours ago",
    read: true,
    href: "/dashboard/customer/verify",
  },
  {
    id: "n5",
    type: "dispute",
    title: "Dispute DS-021 updated",
    body: "The admin has taken your dispute under review. You will be notified once a resolution is reached.",
    time: "Yesterday",
    read: true,
    href: "/disputes/DS-021",
  },
  {
    id: "n6",
    type: "booking",
    title: "New booking request",
    body: "A new booking request for your Toyota Avanza (WP-7731) from Rudi Santoso.",
    time: "2 days ago",
    read: true,
    href: "/dashboard/owner/bookings/BK-1051",
  },
];

const TYPE_ICON: Record<Notif["type"], string> = {
  booking: "ph:calendar-check",
  payment: "ph:currency-circle-dollar",
  dispute: "ph:scales",
  system: "ph:bell",
  message: "ph:chat-dots",
};

const TYPE_COLOR: Record<Notif["type"], string> = {
  booking: "var(--active)",
  payment: "var(--ok)",
  dispute: "var(--alert)",
  system: "var(--slate)",
  message: "var(--accent)",
};

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notif[]>(INITIAL);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifs.filter((n) => !n.read).length;
  const visible = filter === "unread" ? notifs.filter((n) => !n.read) : notifs;

  function markRead(id: string) {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <>
      <Header userName="Andi Pratama" userInitials="AP" notifCount={unreadCount} />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container" style={{ maxWidth: 680 }}>
          {/* Page header */}
          <div
            style={{
              borderBottom: "1px solid var(--ink)",
              paddingBottom: 16,
              marginBottom: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <span className="kicker" style={{ marginBottom: 6, display: "block" }}>Account</span>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  color: "var(--ink)",
                }}
              >
                Notifications
              </h1>
            </div>

            {unreadCount > 0 && (
              <button onClick={markAllRead} className="btn btn-ghost" style={{ fontSize: 12 }}>
                <Icon icon="ph:check-double" width={14} aria-hidden="true" />
                Mark all as read
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div
            style={{
              display: "flex",
              gap: 0,
              borderBottom: "1px solid var(--line)",
              marginBottom: 20,
            }}
          >
            {(["all", "unread"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                style={{
                  padding: "10px 20px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: filter === tab ? "var(--ink)" : "var(--slate)",
                  background: "none",
                  border: "none",
                  borderBottom: filter === tab ? "2px solid var(--ink)" : "2px solid transparent",
                  cursor: "pointer",
                  marginBottom: -1,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {tab}
                {tab === "unread" && unreadCount > 0 && (
                  <span
                    style={{
                      background: "var(--wait)",
                      color: "#fff",
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      padding: "1px 5px",
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Notification list */}
          <AnimatePresence>
            {visible.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ textAlign: "center", padding: "60px 0", color: "var(--slate)" }}
              >
                <Icon icon="ph:bell-slash" width={40} style={{ opacity: 0.3, marginBottom: 12 }} aria-hidden="true" />
                <div style={{ fontFamily: "var(--font-body)", fontSize: 14 }}>No unread notifications</div>
              </motion.div>
            ) : (
              <div style={{ border: "1px solid var(--line)" }}>
                {visible.map((n, i) => {
                  const inner = (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => markRead(n.id)}
                      style={{
                        padding: "16px 20px",
                        borderBottom: i < visible.length - 1 ? "1px solid var(--line)" : "none",
                        display: "flex",
                        gap: 14,
                        alignItems: "flex-start",
                        background: n.read ? "transparent" : "var(--surface)",
                        cursor: n.href ? "pointer" : "default",
                        textDecoration: "none",
                        position: "relative",
                      }}
                    >
                      {/* Unread bar */}
                      {!n.read && (
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 3,
                            background: "var(--accent)",
                          }}
                          aria-hidden="true"
                        />
                      )}

                      {/* Icon */}
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          border: `1px solid ${n.read ? "var(--line)" : TYPE_COLOR[n.type]}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                        aria-hidden="true"
                      >
                        <Icon
                          icon={TYPE_ICON[n.type]}
                          width={16}
                          style={{ color: n.read ? "var(--slate)" : TYPE_COLOR[n.type] }}
                        />
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 8,
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-body)",
                              fontSize: 14,
                              fontWeight: n.read ? 400 : 500,
                              color: "var(--ink)",
                            }}
                          >
                            {n.title}
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 10,
                              color: "var(--slate)",
                              flexShrink: 0,
                            }}
                          >
                            {n.time}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, color: "var(--slate)", lineHeight: 1.55, margin: 0 }}>
                          {n.body}
                        </p>
                      </div>
                    </motion.div>
                  );

                  return n.href ? (
                    <Link key={n.id} href={n.href} style={{ display: "block", textDecoration: "none" }}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={n.id}>{inner}</div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}
