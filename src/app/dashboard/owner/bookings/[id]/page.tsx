import { notFound } from "next/navigation";
import { requireOwnerPage } from "@/server/authz";
import { getBookingDetail } from "@/server/bookings";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { StatusTag } from "@/components/ui/StatusTag";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { BookingActions } from "@/components/owner/BookingActions";
import { formatIDR, formatDate } from "@/lib/format";
import { Icon } from "@iconify/react";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireOwnerPage();
  const { id } = await params;
  const detail = await getBookingDetail(actor, id);
  if (!detail) notFound();

  const ownerConfirmed = ["Confirmed", "Active", "Completed"].includes(detail.status);
  const customerVerified = detail.customerVerificationStatus === "Verified";
  const paymentHeld =
    detail.paymentStatus !== null &&
    ["Held", "Released"].includes(detail.paymentStatus);

  // The booking row records no actor for Cancelled, and Waypoint rejection also
  // sets Cancelled, so the wording covers both.
  const cancelled = detail.status === "Cancelled";

  const checklist = [
    { label: "Owner confirmed",   done: ownerConfirmed },
    { label: "Admin approved",    done: detail.adminApproved },
    { label: "Customer verified", done: customerVerified },
    { label: "Payment held",      done: paymentHeld },
  ];

  const nights = Math.round(
    (new Date(detail.endDate).getTime() - new Date(detail.startDate).getTime()) /
      86_400_000
  );

  return (
    <>
      <SiteHeader />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container" style={{ maxWidth: 760 }}>
          <Breadcrumb
            crumbs={[
              { label: "Owner dashboard", href: "/dashboard/owner" },
              { label: "Requests", href: "/dashboard/owner/bookings" },
              { label: detail.id },
            ]}
          />

          {/* Page heading */}
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
                Booking · {detail.id}
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
                {detail.make} {detail.model}
              </h1>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <StatusTag status={detail.status} />
              {cancelled && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    color: "var(--slate)",
                  }}
                >
                  Cancelled by customer or not approved by Waypoint
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr min(280px,100%)",
              gap: 32,
              alignItems: "start",
            }}
          >
            {/* Left column */}
            <div>
              {/* Booking details */}
              <div style={{ border: "1px solid var(--line)", marginBottom: 24 }}>
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--line)",
                    background: "var(--hover)",
                  }}
                >
                  <span className="kicker">Booking details</span>
                </div>
                <div style={{ padding: "0 16px" }}>
                  {[
                    { label: "Booking ID",  value: detail.id },
                    { label: "Vehicle",     value: `${detail.vehicleYear} ${detail.make} ${detail.model} · ${detail.listingCode}` },
                    { label: "City",        value: detail.vehicleCity },
                    { label: "Start date",  value: formatDate(detail.startDate) },
                    { label: "End date",    value: formatDate(detail.endDate) },
                    { label: "Duration",    value: `${nights} night${nights !== 1 ? "s" : ""}` },
                    { label: "Total",       value: formatIDR(detail.totalPrice) },
                    { label: "Requested",   value: formatDate(detail.createdAt) },
                    ...(detail.paymentStatus
                      ? [{ label: "Payment", value: detail.paymentStatus }]
                      : []),
                  ].map((r) => (
                    <div key={r.label} className="spec-row">
                      <span className="spec-label">{r.label}</span>
                      <span className="spec-value">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer card */}
              <div style={{ border: "1px solid var(--line)", marginBottom: 24 }}>
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--line)",
                    background: "var(--hover)",
                  }}
                >
                  <span className="kicker">Customer</span>
                </div>
                <div
                  style={{
                    padding: "16px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      border: "1px solid var(--ink)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    {detail.customerName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>
                      {detail.customerName}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <StatusTag status={detail.customerVerificationStatus} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Precondition checklist */}
              <div style={{ border: "1px solid var(--line)", marginBottom: 24 }}>
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--line)",
                    background: "var(--hover)",
                  }}
                >
                  <span className="kicker">Checklist</span>
                </div>
                <div style={{ padding: "12px 16px" }}>
                  {checklist.map((c, i) => (
                    <div
                      key={c.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 0",
                        borderBottom: i < checklist.length - 1 ? "1px solid var(--line)" : "none",
                      }}
                    >
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          border: `1px solid ${c.done ? "var(--ok)" : "var(--line)"}`,
                          background: c.done ? "var(--ok)" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                        aria-hidden="true"
                      >
                        {c.done && (
                          <Icon icon="ph:check" width={10} style={{ color: "#fff" }} />
                        )}
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          letterSpacing: "0.07em",
                          textTransform: "uppercase",
                          color: c.done ? "var(--ok)" : "var(--slate)",
                        }}
                      >
                        {c.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overdue warning */}
              {detail.overdue && (
                <div
                  style={{
                    border: "1px solid var(--alert)",
                    padding: "12px 16px",
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    marginBottom: 24,
                  }}
                >
                  <Icon
                    icon="ph:warning"
                    width={14}
                    style={{ color: "var(--alert)", flexShrink: 0, marginTop: 1 }}
                    aria-hidden="true"
                  />
                  <p style={{ fontSize: 13, color: "var(--alert)", lineHeight: 1.6 }}>
                    This rental is overdue. Please complete or raise a dispute.
                  </p>
                </div>
              )}

              {/* Open dispute warning */}
              {detail.hasOpenDispute && (
                <div
                  style={{
                    border: "1px solid var(--wait)",
                    padding: "12px 16px",
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    marginBottom: 24,
                  }}
                >
                  <Icon
                    icon="ph:scales"
                    width={14}
                    style={{ color: "var(--wait)", flexShrink: 0, marginTop: 1 }}
                    aria-hidden="true"
                  />
                  <p style={{ fontSize: 13, color: "var(--wait)", lineHeight: 1.6 }}>
                    An open dispute exists on this booking. Payout release is blocked until it is resolved.
                  </p>
                </div>
              )}
            </div>

            {/* Right column — actions */}
            <BookingActions
              bookingId={detail.id}
              paymentId={detail.paymentId}
              status={detail.status}
              paymentStatus={detail.paymentStatus}
              hasOpenDispute={detail.hasOpenDispute}
              startDate={detail.startDate}
            />
          </div>
        </div>
      </main>
    </>
  );
}
