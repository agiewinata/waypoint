import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SideNav } from "@/components/ui/SideNav";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { StatusTag } from "@/components/ui/StatusTag";
import { requireAdminPage } from "@/server/authz";
import { getDisputeForReview } from "@/server/admin";
import { formatDate, formatIDR } from "@/lib/format";
import { DisputeReviewActions } from "@/components/admin/DisputeReviewActions";

export const dynamic = "force-dynamic";

const NAV_ITEMS = [
  { label: "Overview",      href: "/dashboard/admin", icon: "ph:squares-four" },
  { label: "Verifications", href: "#verifications",   icon: "ph:identification-card" },
  { label: "Vehicles",      href: "#vehicles",        icon: "ph:car" },
  { label: "Disputes",      href: "#disputes",        icon: "ph:scales" },
];

/** Derives two-letter initials from a display name or email address. */
function getInitials(name: string, email: string): string {
  const trimmed = name.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return trimmed.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default async function AdminDisputeReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireAdminPage();
  const dispute = await getDisputeForReview(id);

  if (!dispute) notFound();

  const userInitials = getInitials(actor.user.name, actor.user.email);

  const caseDetails = [
    { label: "Dispute ID",      value: dispute.id },
    { label: "Booking ID",      value: dispute.bookingId },
    { label: "Customer",        value: dispute.customerName },
    { label: "Owner",           value: dispute.ownerName },
    { label: "Raised by",       value: dispute.raisedBy },
    { label: "Booking period",  value: `${formatDate(dispute.booking.startDate)} – ${formatDate(dispute.booking.endDate)}` },
    { label: "Booking total",   value: formatIDR(dispute.booking.totalPrice) },
    { label: "Payment status",  value: dispute.booking.paymentStatus ?? "—" },
    { label: "Opened",          value: formatDate(dispute.createdAt) },
    ...(dispute.resolvedAt
      ? [{ label: "Resolved", value: formatDate(dispute.resolvedAt) }]
      : []),
  ];

  return (
    <>
      <SiteHeader variant="ink" />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container">
          <div className="dashboard-layout">
            <div className="dashboard-sidebar">
              <SideNav
                items={NAV_ITEMS}
                userName={actor.user.name || actor.user.email}
                userRole="Administrator"
                userInitials={userInitials}
              />
            </div>

            <div className="dashboard-content">
              <Breadcrumb
                crumbs={[
                  { label: "Admin",    href: "/dashboard/admin" },
                  { label: "Disputes", href: "/dashboard/admin" + "#disputes" },
                  { label: dispute.id },
                ]}
              />

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
                    Dispute case · {dispute.id}
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
                    Dispute {dispute.id}
                  </h1>
                </div>
                <StatusTag status={dispute.status} />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr min(280px,100%)",
                  gap: 32,
                  alignItems: "start",
                }}
              >
                {/* Left — case details + description */}
                <div>
                  {/* Case details */}
                  <div style={{ border: "1px solid var(--line)", marginBottom: 24 }}>
                    <div
                      style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--line)",
                        background: "var(--hover)",
                      }}
                    >
                      <span className="kicker">Case details</span>
                    </div>
                    <div style={{ padding: "0 16px" }}>
                      {caseDetails.map((r) => (
                        <div key={r.label} className="spec-row">
                          <span className="spec-label">{r.label}</span>
                          <span className="spec-value">
                            {r.label === "Payment status" ? (
                              <StatusTag status={r.value} />
                            ) : (
                              r.value
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div style={{ border: "1px solid var(--line)", marginBottom: 24 }}>
                    <div
                      style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--line)",
                        background: "var(--hover)",
                      }}
                    >
                      <span className="kicker">Description</span>
                    </div>
                    <div style={{ padding: "16px 16px" }}>
                      <p style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.7 }}>
                        &ldquo;{dispute.description}&rdquo;
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right — resolution panel */}
                <DisputeReviewActions
                  disputeId={dispute.id}
                  currentStatus={dispute.status}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
