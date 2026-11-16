import Link from "next/link";
import { Icon } from "@iconify/react";
import { requireUserPage } from "@/server/authz";
import { SiteHeader } from "@/components/ui/SiteHeader";
import type { VerificationStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

// Map verification status values to design-token colours
const STATUS_COLOR: Record<VerificationStatus, string> = {
  Unverified: "var(--slate)",
  Pending: "var(--wait)",
  Verified: "var(--ok)",
  Rejected: "var(--alert)",
};

function StatusTag({ status }: { status: VerificationStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <span
      className="tag"
      style={{
        color,
        border: `1px solid ${color}`,
        padding: "2px 8px",
        marginLeft: 8,
      }}
    >
      <span className="dot" style={{ background: color }} />
      {status}
    </span>
  );
}

export default async function DashboardPage() {
  const actor = await requireUserPage();
  const { user, renter, rentee, admin } = actor;

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <SiteHeader />

      <div
        style={{
          maxWidth: 600,
          margin: "0 auto",
          padding: "48px 24px",
        }}
      >
        {/* User greeting */}
        <div style={{ marginBottom: 36 }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.025em",
              color: "var(--ink)",
              marginBottom: 6,
            }}
          >
            {user.name || "Dashboard"}
          </h1>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.08em",
              color: "var(--slate)",
            }}
          >
            {user.email}
          </p>
        </div>

        {/* Profile cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(240px,100%), 1fr))",
            gap: 16,
          }}
        >
          {/* List my car card */}
          {renter ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Link
                href="/dashboard/owner"
                className="card-hover"
                style={{
                  flex: 1,
                  padding: "24px 20px",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <Icon icon="ph:car" width={24} style={{ color: "var(--ink)" }} aria-hidden="true" />
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 15,
                      fontWeight: 700,
                      color: "var(--ink)",
                      marginBottom: 4,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    List my car
                    <StatusTag status={renter.verificationStatus} />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--slate)", lineHeight: 1.5 }}>
                    Manage listings, earnings, and requests.
                  </div>
                </div>
                <Icon
                  icon="ph:arrow-right"
                  width={14}
                  style={{ color: "var(--slate)", marginTop: "auto" }}
                  aria-hidden="true"
                />
              </Link>
              {renter.verificationStatus !== "Verified" && (
                <Link
                  href="/dashboard/owner/verify"
                  className="kicker"
                  style={{ color: "var(--accent)", textDecoration: "none", padding: "0 4px" }}
                >
                  Verify identity →
                </Link>
              )}
            </div>
          ) : (
            <Link
              href="/dashboard/owner/new"
              className="card-hover"
              style={{
                padding: "24px 20px",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <Icon icon="ph:car" width={24} style={{ color: "var(--slate)" }} aria-hidden="true" />
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--ink)",
                    marginBottom: 4,
                  }}
                >
                  List my car
                </div>
                <div style={{ fontSize: 12, color: "var(--slate)", lineHeight: 1.5 }}>
                  Enable this to list your car and start earning.
                </div>
              </div>
              <Icon
                icon="ph:plus"
                width={14}
                style={{ color: "var(--accent)", marginTop: "auto" }}
                aria-hidden="true"
              />
            </Link>
          )}

          {/* Rent a car card */}
          {rentee ? (
            <Link
              href="/dashboard/customer"
              className="card-hover"
              style={{
                padding: "24px 20px",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <Icon icon="ph:user" width={24} style={{ color: "var(--ink)" }} aria-hidden="true" />
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--ink)",
                    marginBottom: 4,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  Rent a car
                  <StatusTag status={rentee.verificationStatus} />
                </div>
                <div style={{ fontSize: 12, color: "var(--slate)", lineHeight: 1.5 }}>
                  View trips, bookings, and verification.
                </div>
              </div>
              <Icon
                icon="ph:arrow-right"
                width={14}
                style={{ color: "var(--slate)", marginTop: "auto" }}
                aria-hidden="true"
              />
            </Link>
          ) : (
            <Link
              href="/dashboard/customer/new"
              className="card-hover"
              style={{
                padding: "24px 20px",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <Icon icon="ph:user" width={24} style={{ color: "var(--slate)" }} aria-hidden="true" />
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--ink)",
                    marginBottom: 4,
                  }}
                >
                  Rent a car
                </div>
                <div style={{ fontSize: 12, color: "var(--slate)", lineHeight: 1.5 }}>
                  Enable this to browse and book available cars.
                </div>
              </div>
              <Icon
                icon="ph:plus"
                width={14}
                style={{ color: "var(--accent)", marginTop: "auto" }}
                aria-hidden="true"
              />
            </Link>
          )}

          {/* Admin card — only shown when the user has an admin profile */}
          {admin && (
            <Link
              href="/dashboard/admin"
              className="card-hover"
              style={{
                padding: "24px 20px",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <Icon
                icon="ph:shield-star"
                width={24}
                style={{ color: "var(--ink)" }}
                aria-hidden="true"
              />
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--ink)",
                    marginBottom: 4,
                  }}
                >
                  Admin
                </div>
                <div style={{ fontSize: 12, color: "var(--slate)", lineHeight: 1.5 }}>
                  Verifications, approvals, and disputes.
                </div>
              </div>
              <Icon
                icon="ph:arrow-right"
                width={14}
                style={{ color: "var(--slate)", marginTop: "auto" }}
                aria-hidden="true"
              />
            </Link>
          )}
        </div>

        {/* Back link */}
        <div style={{ marginTop: 36 }}>
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--slate)",
              letterSpacing: "0.07em",
              textDecoration: "none",
            }}
          >
            ← Back to browse
          </Link>
        </div>
      </div>
    </div>
  );
}
