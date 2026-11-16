export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { RaiseDisputeForm } from "@/components/disputes/RaiseDisputeForm";
import { requireUserPage } from "@/server/authz";
import { getBookingDetail } from "@/server/bookings";

const DISPUTABLE_STATUSES = ["Confirmed", "Active", "Completed"] as const;

export default async function RaiseDisputePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireUserPage();
  const { id } = await params;
  const booking = await getBookingDetail(actor, id);
  if (!booking) notFound();

  // Cannot raise a dispute on a Pending, Declined, or Cancelled booking
  if (!(DISPUTABLE_STATUSES as readonly string[]).includes(booking.status)) {
    redirect(`/trips/${id}`);
  }

  return (
    <>
      <SiteHeader variant="default" />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container" style={{ maxWidth: 640 }}>
          <Breadcrumb
            crumbs={[
              { label: "Dashboard", href: booking.viewerRole === "owner" ? "/dashboard/owner" : "/dashboard/customer" },
              { label: `Trip ${booking.id}`, href: `/trips/${booking.id}` },
              { label: "Raise dispute" },
            ]}
          />

          <div
            style={{
              borderBottom: "1px solid var(--ink)",
              paddingBottom: 16,
              marginBottom: 32,
            }}
          >
            <span
              className="kicker"
              style={{ marginBottom: 6, display: "block", color: "var(--alert)" }}
            >
              Dispute · {booking.id}
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
              Raise a dispute
            </h1>
            <p
              style={{
                color: "var(--slate)",
                fontSize: 14,
                marginTop: 8,
                lineHeight: 1.6,
              }}
            >
              For booking{" "}
              <strong style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
                {booking.id}
              </strong>{" "}
              · {booking.vehicleYear} {booking.make} {booking.model}. Waypoint
              will review and mediate.
            </p>
          </div>

          <RaiseDisputeForm bookingId={id} />
        </div>
      </main>
    </>
  );
}
