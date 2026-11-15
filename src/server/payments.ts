import { db } from "@/lib/db";
import { HttpError } from "@/server/http";
import { notify } from "@/server/notifications";
import { toRupiah, ownerPayout } from "@/lib/money";
import type { Actor } from "@/server/authz";
import type { PaymentCreateInput } from "@/lib/validation/payment";

// ---------------------------------------------------------------------------
// DTOs — safe subsets sent to callers (no raw Prisma models)
// ---------------------------------------------------------------------------

export interface PaymentDTO {
  id: string;
  status: string;
  amount: number;
  method: string;
  paidAt: string | null;
  escrowReleaseDate: string | null;
  ownerPayout?: number;
}

export interface PayoutRow {
  bookingId: string;
  listingCode: string;
  make: string;
  model: string;
  amount: number;
  payout: number;
  releasedAt: string;
}

export interface EarningsSummary {
  heldTotal: number;
  releasedGross: number;
  fee: number;
  net: number;
  payouts: PayoutRow[];
}

// ---------------------------------------------------------------------------
// createPayment — customer initiates escrow for a Confirmed booking
// ---------------------------------------------------------------------------

export async function createPayment(
  renteeID: string,
  input: PaymentCreateInput
): Promise<{ id: string; status: string; amount: number }> {
  // 1. Find booking by id where renteeID matches → 404
  const booking = await db.booking.findFirst({
    where: { bookingID: input.bookingId, renteeID },
    include: {
      vehicle: {
        include: {
          renter: { select: { userID: true } },
        },
      },
    },
  });
  if (!booking) throw new HttpError(404, "Booking not found");

  // 2. 409 if booking is not Confirmed
  if (booking.status !== "Confirmed") {
    throw new HttpError(409, "Booking must be in Confirmed status");
  }

  // 3. Customer must have both Verified KTP and Verified SIM
  const verifiedDocs = await db.document.findMany({
    where: {
      renteeID,
      type: { in: ["KTP", "SIM"] },
      verificationStatus: "Verified",
    },
    select: { type: true },
  });
  const hasKTP = verifiedDocs.some((d) => d.type === "KTP");
  const hasSIM = verifiedDocs.some((d) => d.type === "SIM");
  if (!hasKTP || !hasSIM) {
    throw new HttpError(409, "Customer must have Verified KTP and SIM documents");
  }

  // 4. 409 if a Held or Released payment already exists for this booking
  const existing = await db.payment.findFirst({
    where: {
      bookingID: input.bookingId,
      status: { in: ["Held", "Released"] },
    },
    select: { paymentID: true },
  });
  if (existing) {
    throw new HttpError(409, "A payment already exists for this booking");
  }

  // 5. Create the payment in Held (escrow) status
  const payment = await db.payment.create({
    data: {
      bookingID: input.bookingId,
      amount: booking.totalPrice,
      method: input.method,
      status: "Held",
      paidAt: new Date(),
    },
  });

  // 6. Notify the vehicle owner that funds are held
  await notify(db, {
    userID: booking.vehicle.renter.userID,
    type: "payment_held",
    title: "Payment held in escrow",
    body: `A payment of ${toRupiah(payment.amount).toLocaleString("id-ID")} has been held for booking ${booking.bookingID}.`,
    href: `/dashboard/owner/bookings/${booking.bookingID}`,
  });

  return {
    id: payment.paymentID,
    status: "Held",
    amount: toRupiah(payment.amount),
  };
}

// ---------------------------------------------------------------------------
// transitionPayment — Admin or Owner releases; Admin fails
// ---------------------------------------------------------------------------

export async function transitionPayment(
  actor: Actor,
  paymentId: string,
  action: "release" | "fail"
): Promise<{ id: string; status: string; ownerPayout?: number }> {
  const payment = await db.payment.findUnique({
    where: { paymentID: paymentId },
    include: {
      booking: {
        include: {
          vehicle: {
            include: {
              renter: { select: { renterID: true, userID: true } },
            },
          },
          rentee: { select: { userID: true } },
          disputes: {
            where: { status: { in: ["Open", "UnderReview"] } },
            select: { disputeID: true },
          },
        },
      },
    },
  });
  if (!payment) throw new HttpError(404, "Payment not found");

  // Must be in Held status to transition
  if (payment.status !== "Held") {
    throw new HttpError(409, "Payment is not in Held status");
  }

  if (action === "release") {
    // Only Admin or the booking's vehicle owner may release
    const isAdmin = !!actor.admin;
    const isOwner =
      !!actor.renter &&
      actor.renter.renterID === payment.booking.vehicle.renter.renterID;
    if (!isAdmin && !isOwner) {
      throw new HttpError(403, "Forbidden");
    }

    // Booking must be Completed before releasing funds
    if (payment.booking.status !== "Completed") {
      throw new HttpError(409, "Booking must be in Completed status to release payment");
    }

    // No open disputes may exist
    if (payment.booking.disputes.length > 0) {
      throw new HttpError(409, "Cannot release payment while a dispute is Open or UnderReview");
    }

    const { payout } = ownerPayout(payment.amount);

    const updated = await db.payment.update({
      where: { paymentID: paymentId },
      data: { status: "Released", escrowReleaseDate: new Date() },
    });

    await notify(db, {
      userID: payment.booking.vehicle.renter.userID,
      type: "payment_released",
      title: "Escrow released",
      body: `Payment of ${toRupiah(payment.amount).toLocaleString("id-ID")} has been released. Your payout: ${payout.toLocaleString("id-ID")}.`,
      href: `/dashboard/owner/bookings/${payment.booking.bookingID}`,
    });
    await notify(db, {
      userID: payment.booking.rentee.userID,
      type: "payment_released",
      title: "Payment released",
      body: `Your payment for booking ${payment.booking.bookingID} has been released to the owner.`,
      href: `/dashboard/customer/bookings/${payment.booking.bookingID}`,
    });

    return { id: updated.paymentID, status: "Released", ownerPayout: payout };
  }

  // action === "fail"
  if (!actor.admin) {
    throw new HttpError(403, "Admin access required");
  }

  const updated = await db.payment.update({
    where: { paymentID: paymentId },
    data: { status: "Failed" },
  });

  await notify(db, {
    userID: payment.booking.vehicle.renter.userID,
    type: "payment_failed",
    title: "Payment failed",
    body: `A payment for booking ${payment.booking.bookingID} has been marked as failed.`,
    href: `/dashboard/owner/bookings/${payment.booking.bookingID}`,
  });
  await notify(db, {
    userID: payment.booking.rentee.userID,
    type: "payment_failed",
    title: "Payment failed",
    body: `Your payment for booking ${payment.booking.bookingID} has failed.`,
    href: `/dashboard/customer/bookings/${payment.booking.bookingID}`,
  });

  return { id: updated.paymentID, status: "Failed" };
}

// ---------------------------------------------------------------------------
// getOwnerEarnings — aggregate Released and Held payments for an owner
// ---------------------------------------------------------------------------

export async function getOwnerEarnings(renterID: string): Promise<EarningsSummary> {
  const payments = await db.payment.findMany({
    where: {
      booking: {
        vehicle: { renterID },
      },
      status: { in: ["Held", "Released"] },
    },
    include: {
      booking: {
        include: {
          vehicle: {
            select: { listingCode: true, make: true, model: true },
          },
        },
      },
    },
  });

  let heldTotal = 0;
  let releasedGross = 0;
  let totalFee = 0;
  let totalNet = 0;
  const payouts: PayoutRow[] = [];

  for (const p of payments) {
    const amount = toRupiah(p.amount);
    if (p.status === "Held") {
      heldTotal += amount;
    } else if (p.status === "Released") {
      const { fee, payout } = ownerPayout(p.amount);
      releasedGross += amount;
      totalFee += fee;
      totalNet += payout;
      payouts.push({
        bookingId: p.bookingID,
        listingCode: p.booking.vehicle.listingCode,
        make: p.booking.vehicle.make,
        model: p.booking.vehicle.model,
        amount,
        payout,
        releasedAt: (p.escrowReleaseDate ?? new Date(0)).toISOString(),
      });
    }
  }

  return {
    heldTotal,
    releasedGross,
    fee: totalFee,
    net: totalNet,
    payouts,
  };
}
