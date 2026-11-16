import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Icon } from "@iconify/react";
import { CheckoutForm } from "@/components/customer/CheckoutForm";
import { requireCustomerPage } from "@/server/authz";
import { getBookingDetail } from "@/server/bookings";
import { formatIDR, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const actor = await requireCustomerPage();
  const booking = await getBookingDetail(actor, id);

  // notFound if the booking doesn't exist or the actor isn't the customer
  if (!booking || booking.viewerRole !== "customer") {
    notFound();
  }

  // Preconditions for payment
  const isConfirmed = booking.status === "Confirmed";
  const isVerified = actor.rentee.verificationStatus === "Verified";
  const hasNoPriorPayment = booking.paymentStatus === null;

  const canPay = isConfirmed && isVerified && hasNoPriorPayment;

  // First failing precondition message shown to the customer
  let reason: string | null = null;
  if (!isConfirmed) {
    reason = "Booking must be in Confirmed status before payment.";
  } else if (!isVerified) {
    reason = "Your identity must be Verified before you can pay. Upload your KTP and SIM.";
  } else if (!hasNoPriorPayment) {
    reason = "A payment has already been recorded for this booking.";
  }

  const totalPrice = booking.paymentAmount ?? booking.totalPrice;
  const vehicleLabel = `${booking.vehicleYear} ${booking.make} ${booking.model}`;

  // Calculate duration in days from ISO date strings
  const durationDays = Math.round(
    (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) /
      86_400_000
  );

  return (
    <>
      <SiteHeader />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container" style={{ maxWidth: 760 }}>
          <Breadcrumb
            crumbs={[
              { label: "Dashboard", href: "/dashboard/customer" },
              { label: `Booking ${booking.id}` },
              { label: "Checkout" },
            ]}
          />

          <div
            style={{
              borderBottom: "1px solid var(--ink)",
              paddingBottom: 16,
              marginBottom: 32,
            }}
          >
            <span className="kicker" style={{ marginBottom: 6, display: "block" }}>
              Escrow payment · {booking.id}
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
              Pay into escrow
            </h1>
          </div>

          {/* CheckoutForm wraps the two-column layout (form + booking summary) */}
          <CheckoutForm
            bookingId={id}
            totalPrice={totalPrice}
            canPay={canPay}
            reason={reason}
          >
            {/* Booking summary — server-rendered, passed as a slot */}
            <div style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
              <div style={{ borderBottom: "1px solid var(--line)", padding: "14px 18px" }}>
                <div className="kicker" style={{ marginBottom: 4 }}>
                  Booking summary
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    color: "var(--accent)",
                    letterSpacing: "0.06em",
                  }}
                >
                  {booking.id}
                </div>
              </div>
              <div style={{ padding: "16px 18px" }}>
                {/* Vehicle photo placeholder */}
                <div
                  className="photo-placeholder"
                  style={{ height: 100, marginBottom: 14, border: "1px solid var(--line)" }}
                >
                  <Icon
                    icon="ph:car"
                    width={36}
                    style={{ color: "var(--slate)", opacity: 0.4 }}
                    aria-hidden="true"
                  />
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--ink)",
                    marginBottom: 4,
                  }}
                >
                  {vehicleLabel}
                </div>
                <div className="kicker" style={{ marginBottom: 16 }}>
                  <Icon
                    icon="ph:map-pin"
                    width={10}
                    style={{ display: "inline", marginRight: 4 }}
                    aria-hidden="true"
                  />
                  {booking.vehicleCity}
                </div>

                {/* Spec rows */}
                {[
                  { label: "Dates",    value: `${formatDate(booking.startDate)} → ${formatDate(booking.endDate)}` },
                  { label: "Duration", value: `${durationDays} day${durationDays !== 1 ? "s" : ""}` },
                  { label: "Status",   value: booking.status },
                ].map((r) => (
                  <div key={r.label} className="spec-row">
                    <span className="spec-label">{r.label}</span>
                    <span className="spec-value">{r.value}</span>
                  </div>
                ))}

                <div
                  style={{
                    borderTop: "1px solid var(--ink)",
                    paddingTop: 12,
                    marginTop: 4,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <span className="spec-label" style={{ color: "var(--ink)", fontWeight: 700 }}>
                    Total
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 16,
                      fontWeight: 600,
                      color: "var(--ink)",
                    }}
                  >
                    {formatIDR(totalPrice)}
                  </span>
                </div>
                <div className="kicker" style={{ marginTop: 6, textAlign: "right", color: "var(--done)" }}>
                  Platform fee 5% (deducted from owner payout)
                </div>
              </div>
            </div>
          </CheckoutForm>
        </div>
      </main>
    </>
  );
}
