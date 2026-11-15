"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { SignOutButton } from "@/components/auth/SignOutButton";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

interface SideNavProps {
  items: NavItem[];
  userName?: string;
  userRole?: string;
  userInitials?: string;
  keyFigure?: string;
  keyFigureLabel?: string;
  switchRoleHref?: string;
}

export function SideNav({
  items,
  userName,
  userRole,
  userInitials,
  keyFigure,
  keyFigureLabel,
  switchRoleHref,
}: SideNavProps) {
  const pathname = usePathname();

  return (
    <aside
      className="side"
      style={{
        width: 210,
        border: "1px solid var(--line)",
        background: "var(--surface)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Nav items */}
      <nav className="flex flex-col py-2">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidenav-item ${isActive ? "active" : ""}`}
            >
              <Icon icon={item.icon} width={15} aria-hidden="true" />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    padding: "1px 5px",
                    border: "1px solid var(--wait)",
                    color: "var(--wait)",
                    background: "transparent",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--line)", marginTop: "auto" }} />

      {/* Account footer */}
      <div style={{ padding: "14px 14px 12px" }}>
        <div className="flex items-center gap-10 mb-10">
          {/* Avatar square */}
          <div
            style={{
              width: 32,
              height: 32,
              border: "1px solid var(--ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--ink)",
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            {userInitials ?? "??"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--ink)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {userName ?? "—"}
            </div>
            <div className="kicker" style={{ marginTop: 2 }}>
              {userRole ?? "—"}
            </div>
          </div>
        </div>

        {keyFigure && (
          <div style={{ marginBottom: 10 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 16,
                fontWeight: 600,
                color: "var(--ink)",
              }}
            >
              {keyFigure}
            </div>
            {keyFigureLabel && (
              <div className="kicker" style={{ marginTop: 2 }}>
                {keyFigureLabel}
              </div>
            )}
          </div>
        )}

        {switchRoleHref && (
          <Link
            href={switchRoleHref}
            className="kicker"
            style={{
              color: "var(--accent)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginBottom: 10,
            }}
          >
            <Icon icon="ph:arrow-square-out" width={12} aria-hidden="true" />
            Switch role
          </Link>
        )}

        <SignOutButton variant="ghost" />
      </div>
    </aside>
  );
}
