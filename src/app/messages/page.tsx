"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { Header } from "@/components/ui/Header";

const THREADS = [
  {
    id: "t1",
    name: "Dimas Raharjo",
    initials: "DR",
    role: "Owner",
    lastMsg: "Great, the car will be ready at 8am.",
    time: "10:45",
    unread: 1,
    booking: "BK-1182",
  },
  {
    id: "t2",
    name: "Waypoint Support",
    initials: "WP",
    role: "Support",
    lastMsg: "Your verification is under review.",
    time: "Yesterday",
    unread: 0,
    booking: null,
  },
  {
    id: "t3",
    name: "Rudi Santoso",
    initials: "RS",
    role: "Customer",
    lastMsg: "Can I extend by one more day?",
    time: "Mon",
    unread: 0,
    booking: "BK-1051",
  },
];

const MESSAGES_BY_THREAD: Record<string, { id: string; from: "me" | "them"; text: string; time: string }[]> = {
  t1: [
    { id: "m1", from: "them", text: "Hi! Just confirming you booked the Avanza for Nov 10–13.", time: "10:30" },
    { id: "m2", from: "me",   text: "Yes, that's correct. Can you confirm it's available?",    time: "10:32" },
    { id: "m3", from: "them", text: "Confirmed! The car will be ready at 8am at the pickup point.", time: "10:44" },
    { id: "m4", from: "them", text: "Great, the car will be ready at 8am.",                        time: "10:45" },
  ],
  t2: [
    { id: "m1", from: "them", text: "Thank you for submitting your documents.", time: "09:00" },
    { id: "m2", from: "them", text: "Your verification is under review.",       time: "09:01" },
  ],
  t3: [
    { id: "m1", from: "them", text: "Can I extend by one more day?", time: "Mon 15:20" },
    { id: "m2", from: "me",   text: "I'll check and get back to you.", time: "Mon 15:35" },
  ],
};

export default function MessagesPage() {
  const [activeThread, setActiveThread] = useState("t1");
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<Record<string, typeof MESSAGES_BY_THREAD["t1"]>>(MESSAGES_BY_THREAD);

  const thread = THREADS.find((t) => t.id === activeThread)!;
  const msgs = localMessages[activeThread] ?? [];

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setLocalMessages((prev) => ({
      ...prev,
      [activeThread]: [
        ...(prev[activeThread] ?? []),
        { id: `m${Date.now()}`, from: "me", text: input.trim(), time: "Now" },
      ],
    }));
    setInput("");
  }

  return (
    <>
      <Header userName="Andi Pratama" userInitials="AP" />

      <main style={{ height: "calc(100vh - 57px)", display: "flex", overflow: "hidden" }}>
        {/* Thread list */}
        <div
          style={{
            width: 280,
            flexShrink: 0,
            borderRight: "1px solid var(--line)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--ink)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--ink)",
              }}
            >
              Messages
            </span>
            <Icon icon="ph:pencil-simple" width={16} style={{ color: "var(--slate)" }} aria-label="New message" />
          </div>

          {/* Thread items */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {THREADS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveThread(t.id)}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderBottom: "1px solid var(--line)",
                  background: activeThread === t.id ? "var(--hover)" : "transparent",
                  borderLeft: activeThread === t.id ? "3px solid var(--accent)" : "3px solid transparent",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  textAlign: "left",
                  cursor: "pointer",
                  border: "none",
                  outline: "none",
                  transition: "background .12s",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    border: "1px solid var(--ink)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    fontWeight: 600,
                    flexShrink: 0,
                    background: activeThread === t.id ? "var(--ink)" : "transparent",
                    color: activeThread === t.id ? "var(--paper)" : "var(--ink)",
                  }}
                  aria-hidden="true"
                >
                  {t.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
                      {t.name}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--slate)" }}>{t.time}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--slate)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.lastMsg}
                  </div>
                  {t.booking && (
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", marginTop: 3, letterSpacing: "0.06em" }}>
                      {t.booking}
                    </div>
                  )}
                </div>
                {t.unread > 0 && (
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      background: "var(--wait)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      color: "#fff",
                      flexShrink: 0,
                    }}
                    aria-label={`${t.unread} unread`}
                  >
                    {t.unread}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Chat header */}
          <div
            style={{
              padding: "12px 20px",
              borderBottom: "1px solid var(--ink)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                border: "1px solid var(--ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 600,
              }}
              aria-hidden="true"
            >
              {thread.initials}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>
                {thread.name}
              </div>
              <div className="kicker">{thread.role}{thread.booking && ` · ${thread.booking}`}</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
            <AnimatePresence>
              {msgs.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    display: "flex",
                    justifyContent: m.from === "me" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "65%",
                      padding: "10px 14px",
                      background: m.from === "me" ? "var(--ink)" : "var(--surface)",
                      border: `1px solid ${m.from === "me" ? "var(--ink)" : "var(--line)"}`,
                      color: m.from === "me" ? "var(--paper)" : "var(--ink)",
                      fontSize: 14,
                      lineHeight: 1.55,
                    }}
                  >
                    {m.text}
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        marginTop: 4,
                        color: m.from === "me" ? "rgba(255,255,255,0.5)" : "var(--slate)",
                        textAlign: "right",
                      }}
                    >
                      {m.time}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            style={{
              borderTop: "1px solid var(--line)",
              padding: "14px 20px",
              display: "flex",
              gap: 10,
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              className="input"
              style={{ flex: 1 }}
              aria-label="Message input"
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: "0 16px", height: 42 }}
              aria-label="Send message"
            >
              <Icon icon="ph:paper-plane-tilt" width={16} />
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
