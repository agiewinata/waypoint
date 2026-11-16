export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { StatusTag } from "@/components/ui/StatusTag";
import { LocationReporter } from "@/components/trips/LocationReporter";
import { requireUserPage } from "@/server/authz";
import { getBookingDetail } from "@/server/bookings";
import { ownerPayout } from "@/lib/money";
import { formatIDR, formatDate } from "@/lib/format";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireUserPage();
  const { id } = await params;
  const booking = await getBookingDetail(actor, id);
  if (!booking) notFound();

  const { fee, payout } = ownerPayout(booking.totalPrice);

  const startDate = formatDate(booking.startDate);
  const endDate = formatDate(booking.endDate);
  const createdAt = formatDate(booking.createdAt);

  const isCustomer = booking.viewerRole === "customer";
  const isOwner = booking.viewerRole === "owner";

  const showDispute = ["Confirmed", "Active", "Completed"].includes(booking.status);
  const showLocation =
    isCustomer && booking.status === "Active" && booking.locationConsent;

  // Derive which timeline steps are complete from the current booking state
  const statusIn = (...s: string[]) => s.includes(booking.status);
  const paymentHeldOrReleased =
    booking.paymentStatus === "Held" || booking.paymentStatus === "Released";
  const escrowReleased = booking.paymentStatus === "Released";

  const steps = [
    {
      label: "Booking requested",
      date: createdAt,
      done: true,
    },
    {
      label: "Owner confirmed",
      date: statusIn("Confirmed", "Active", "Completed") ? "Confirmed" : "Awaiting owner",
      done: statusIn("Confirmed", "Active", "Completed"),
    },
    {
      label: "Payment into escrow",
      date: paymentHeldOrReleased ? "Payment held" : "Awaiting payment",
      done: paymentHeldOrReleased,
    },
    {
      label: "Trip started",
      date: statusIn("Active", "Completed") ? "Active" : `Expected ${startDate}`,
      done: statusIn("Active", "Completed"),
    },
    {
      label: "Safe return",
      date: statusIn("Completed") ? "Completed" : `Expected ${endDate}`,
      done: statusIn("Completed"),
    },
    {
      label: "Escrow released",
      date: escrowReleased ? "Released" : "On safe return",
      done: escrowReleased,
    },
  ];

  const dashboardHref = isOwner ? "/dashboard/owner" : "/dashboard/customer";

  return (
    <>
      <SiteHeader variant="default" />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container" style={{ maxWidth: 820 }}>
          <Breadcrumb
            crumbs={[
              { label: "Dashboard", href: dashboardHref },
              { label: `Trip ${booking.id}` },
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
              <span
                className="kicker"
                style={{ marginBottom: 6, display: "block" }}
              >
                Trip receipt · {booking.id}
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
                {booking.vehicleYear} {booking.make} {booking.model}
              </h1>
            </div>
            <StatusTag status={booking.status} />
          </div>

          {/* Overdue banner */}
          {booking.overdue && (
            <div
              style={{
                border: "1px solid var(--alert)",
                padding: "10px 16px",
                marginBottom: 24,
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <Icon
                icon="ph:warning"
                width={16}
                style={{ color: "var(--alert)", flexShrink: 0 }}
                aria-hidden="true"
              />
              <span style={{ fontSize: 13, color: "var(--alert)" }}>
                This booking is <strong>overdue</strong> — the return date has passed.
              </span>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr min(300px,100%)",
              gap: 32,
              alignItems: "start",
            }}
          >
            {/* Left col */}
            <div>
              {/* Booking timeline */}
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

                {steps.map((step, i) => (
                  <div
                    key={step.label}
                    style={{
                      display: "flex",
                      gap: 16,
                      paddingBottom: i < steps.length - 1 ? 20 : 0,
                      position: "relative",
                    }}
                  >
                    {/* Connector line */}
                    {i < steps.length - 1 && (
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
                      <div
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: 14,
                          fontWeight: 500,
                          color: step.done ? "var(--ink)" : "var(--slate)",
                        }}
                      >
                        {step.label}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--slate)",
                          marginTop: 2,
                        }}
                      >
                        {step.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Location tracking panel — customer only, Active + consent */}
              {showLocation && (
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
                    <LocationReporter bookingId={id} />
                  </div>
                  <div
                    style={{
                      padding: "12px 16px",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--slate)",
                      lineHeight: 1.6,
                    }}
                  >
                    Your location is being shared with the vehicle owner while your
                    trip is active.
                  </div>
                </div>
              )}

              {/* Dispute link */}
              {showDispute && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link
                    href={`/disputes/raise/${id}`}
                    className="btn btn-danger"
                    style={{ fontSize: 11 }}
                  >
                    <Icon icon="ph:flag" width={14} aria-hidden="true" />
                    Raise a dispute
                  </Link>
                </div>
              )}
            </div>

            {/* Right col — receipt */}
            <div>
              <div
                style={{
                  border: "1px solid var(--ink)",
                  background: "var(--surface)",
                }}
              >
                <div
                  style={{
                    padding: "16px 18px",
                    borderBottom: "1px solid var(--ink)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span className="kicker">Receipt</span>
                  {booking.paymentStatus && (
                    <StatusTag status={booking.paymentStatus} />
                  )}
                </div>

                <div style={{ padding: "16px 18px" }}>
                  {[
                    { label: "Booking",  value: booking.id },
                    { label: "Vehicle",  value: booking.listingCode },
                    { label: "City",     value: booking.vehicleCity },
                    { label: "Type",     value: booking.vehicleType },
                    { label: "Customer", value: booking.customerName },
                    { label: "Start",    value: startDate },
                    { label: "End",      value: endDate },
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
                    <span
                      className="spec-label"
                      style={{ color: "var(--ink)", fontWeight: 700 }}
                    >
                      Total
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 18,
                        fontWeight: 600,
                        color: "var(--ink)",
                      }}
                    >
                      {formatIDR(booking.totalPrice)}
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
                    <div className="kicker" style={{ marginBottom: 4 }}>
                      Escrow breakdown
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--slate)",
                        lineHeight: 1.8,
                      }}
                    >
                      Platform fee (5%): {formatIDR(fee)}
                      <br />
                      Owner receives: {formatIDR(payout)}
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
