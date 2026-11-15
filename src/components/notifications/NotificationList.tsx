"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { formatDate } from "@/lib/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Dates are serialized to ISO strings by Next.js when passed from server
// components to client components, so we use string here rather than Date.
export interface NotifItem {
  notificationID: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListProps {
  initialItems: NotifItem[];
  initialUnread: number;
}

// ---------------------------------------------------------------------------
// Icon / colour mapping
// Maps NotificationType prefixes (from src/server/notifications.ts) to the
// ph:* icons and CSS custom properties used in the design.
// ---------------------------------------------------------------------------

function getTypeStyle(type: string): { icon: string; color: string } {
  if (type.startsWith("booking_")) {
    return { icon: "ph:calendar-check", color: "var(--active)" };
  }
  if (type.startsWith("payment_")) {
    return { icon: "ph:currency-circle-dollar", color: "var(--ok)" };
  }
  if (type.startsWith("dispute_")) {
    return { icon: "ph:scales", color: "var(--alert)" };
  }
  // document_*, vehicle_*, and anything unknown → bell / neutral
  return { icon: "ph:bell", color: "var(--slate)" };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationList({
  initialItems,
  initialUnread,
}: NotificationListProps) {
  const [items, setItems] = useState<NotifItem[]>(initialItems);
  const [unread, setUnread] = useState(initialUnread);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const router = useRouter();

  const visible =
    filter === "unread" ? items.filter((n) => n.readAt === null) : items;

  async function handleMarkAllRead() {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    if (!res.ok) return;

    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((n) => (n.readAt === null ? { ...n, readAt: now } : n))
    );
    setUnread(0);
  }

  async function handleClick(n: NotifItem) {
    if (n.readAt === null) {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.notificationID] }),
      });
      if (res.ok) {
        const now = new Date().toISOString();
        setItems((prev) =>
          prev.map((item) =>
            item.notificationID === n.notificationID
              ? { ...item, readAt: now }
              : item
          )
        );
        setUnread((prev) => Math.max(0, prev - 1));
      }
    }
    if (n.href) {
      router.push(n.href);
    }
  }

  return (
    <>
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
          <span
            className="kicker"
            style={{ marginBottom: 6, display: "block" }}
          >
            Account
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
            Notifications
          </h1>
        </div>

        {unread > 0 && (
          <button
            onClick={() => void handleMarkAllRead()}
            className="btn btn-ghost"
            style={{ fontSize: 12 }}
          >
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
              borderBottom:
                filter === tab
                  ? "2px solid var(--ink)"
                  : "2px solid transparent",
              cursor: "pointer",
              marginBottom: -1,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {tab}
            {tab === "unread" && unread > 0 && (
              <span
                style={{
                  background: "var(--wait)",
                  color: "#fff",
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  padding: "1px 5px",
                }}
              >
                {unread}
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
            style={{
              textAlign: "center",
              padding: "60px 0",
              color: "var(--slate)",
            }}
          >
            <Icon
              icon="ph:bell-slash"
              width={40}
              style={{ opacity: 0.3, marginBottom: 12 }}
              aria-hidden="true"
            />
            <div style={{ fontFamily: "var(--font-body)", fontSize: 14 }}>
              No notifications
            </div>
          </motion.div>
        ) : (
          <div style={{ border: "1px solid var(--line)" }}>
            {visible.map((n, i) => {
              const { icon, color } = getTypeStyle(n.type);
              const isRead = n.readAt !== null;

              return (
                <motion.div
                  key={n.notificationID}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => void handleClick(n)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") void handleClick(n);
                  }}
                  style={{
                    padding: "16px 20px",
                    borderBottom:
                      i < visible.length - 1
                        ? "1px solid var(--line)"
                        : "none",
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                    background: isRead ? "transparent" : "var(--surface)",
                    cursor: "pointer",
                    textDecoration: "none",
                    position: "relative",
                  }}
                >
                  {/* Unread accent bar */}
                  {!isRead && (
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

                  {/* Type icon */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      border: `1px solid ${isRead ? "var(--line)" : color}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    <Icon
                      icon={icon}
                      width={16}
                      style={{ color: isRead ? "var(--slate)" : color }}
                    />
                  </div>

                  {/* Text content */}
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
                          fontWeight: isRead ? 400 : 500,
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
                        {formatDate(n.createdAt)}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--slate)",
                        lineHeight: 1.55,
                        margin: 0,
                      }}
                    >
                      {n.body}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
