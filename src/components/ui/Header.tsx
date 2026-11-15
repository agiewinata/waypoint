"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";

interface HeaderProps {
  variant?: "paper" | "ink";
  userName?: string;
  userInitials?: string;
  notifCount?: number;
}

export function Header({
  variant = "paper",
  userName,
  userInitials,
  notifCount = 0,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isInk = variant === "ink";

  return (
    <header
      style={{
        background: isInk ? "var(--ink)" : "var(--paper)",
        borderBottom: `1px solid ${isInk ? "rgba(255,255,255,0.15)" : "var(--ink)"}`,
      }}
      className="sticky top-0 z-50"
    >
      <div className="page-container">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 no-underline">
            {/* Pin mark — a square dot */}
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <rect
                x="6"
                y="2"
                width="8"
                height="8"
                fill="var(--accent)"
              />
              <polygon
                points="10,18 7,12 13,12"
                fill="var(--accent)"
              />
            </svg>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 18,
                letterSpacing: "-0.03em",
                color: isInk ? "#fff" : "var(--ink)",
              }}
            >
              WAYPOINT
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: isInk ? "rgba(255,255,255,0.75)" : "var(--slate)",
                textDecoration: "none",
              }}
              className="hover:opacity-100 transition-opacity"
            >
              Browse
            </Link>
            <Link
              href="/dashboard"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: isInk ? "rgba(255,255,255,0.75)" : "var(--slate)",
                textDecoration: "none",
              }}
              className="hover:opacity-100 transition-opacity"
            >
              Dashboard
            </Link>

            {/* Notifications bell */}
            <Link
              href="/notifications"
              className="relative flex items-center"
              aria-label="Notifications"
            >
              <Icon
                icon="ph:bell"
                width={20}
                style={{ color: isInk ? "rgba(255,255,255,0.75)" : "var(--slate)" }}
              />
              {notifCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    background: "var(--wait)",
                    color: "#fff",
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    width: 14,
                    height: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {notifCount}
                </span>
              )}
            </Link>

            {/* Account chip */}
            {userInitials ? (
              <Link
                href="/account"
                style={{
                  width: 32,
                  height: 32,
                  border: `1px solid ${isInk ? "rgba(255,255,255,0.4)" : "var(--ink)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 600,
                  color: isInk ? "#fff" : "var(--ink)",
                  textDecoration: "none",
                  letterSpacing: "0.06em",
                }}
                aria-label={`Account: ${userName}`}
              >
                {userInitials}
              </Link>
            ) : (
              <Link
                href="/auth/signin"
                className="btn btn-primary"
                style={{ padding: "6px 14px", fontSize: 10 }}
              >
                Sign in
              </Link>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-9 h-9"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <Icon
              icon={menuOpen ? "ph:x" : "ph:list"}
              width={22}
              style={{ color: isInk ? "#fff" : "var(--ink)" }}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              overflow: "hidden",
              borderTop: `1px solid ${isInk ? "rgba(255,255,255,0.1)" : "var(--line)"}`,
              background: isInk ? "var(--ink)" : "var(--paper)",
            }}
          >
            <div className="page-container py-4 flex flex-col gap-4">
              <Link
                href="/"
                className="kicker"
                style={{ color: isInk ? "rgba(255,255,255,0.75)" : "var(--slate)" }}
                onClick={() => setMenuOpen(false)}
              >
                Browse
              </Link>
              <Link
                href="/dashboard"
                className="kicker"
                style={{ color: isInk ? "rgba(255,255,255,0.75)" : "var(--slate)" }}
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/notifications"
                className="kicker"
                style={{ color: isInk ? "rgba(255,255,255,0.75)" : "var(--slate)" }}
                onClick={() => setMenuOpen(false)}
              >
                Notifications {notifCount > 0 && `(${notifCount})`}
              </Link>
              {userInitials ? (
                <Link
                  href="/account"
                  className="kicker"
                  style={{ color: isInk ? "rgba(255,255,255,0.75)" : "var(--slate)" }}
                  onClick={() => setMenuOpen(false)}
                >
                  Account
                </Link>
              ) : (
                <Link href="/auth/signin" className="btn btn-primary" style={{ width: "fit-content" }}>
                  Sign in
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
