import { db } from "@/lib/db";
import { HttpError } from "@/server/http";
import { notify, notifyAdmins } from "@/server/notifications";
import type { Actor } from "@/server/authz";
import type { DisputeCreateInputType } from "@/lib/validation/dispute";

// ---------------------------------------------------------------------------
// D1: raise a dispute on a booking
// Actor may be either a Rentee (customer) or Renter (owner) party to the booking.
// The function determines which role the actor holds via ID comparison.
// ---------------------------------------------------------------------------

export async function raiseDispute(
  actor: Actor,
  input: DisputeCreateInputType
): Promise<{ id: string }> {
  const booking = await db.booking.findUnique({
    where: { bookingID: input.bookingId },
    select: {
      bookingID: true,
      renteeID: true,
      status: true,
      vehicle: {
        select: {
          renterID: true,
          renter: { select: { userID: true } },
        },
      },
      rentee: { select: { userID: true } },
    },
  });

  if (!booking) throw new HttpError(404, "Booking not found");

  // Determine which party is raising the dispute and who the counterpart is.
  let raisedBy: "Rentee" | "Renter";
  let counterpartUserID: string | null | undefined;

  if (actor.rentee && booking.renteeID === actor.rentee.renteeID) {
    raisedBy = "Rentee";
    // Notify the vehicle owner (Renter)
    counterpartUserID = booking.vehicle.renter.userID;
  } else if (
    actor.renter &&
    booking.vehicle.renterID === actor.renter.renterID
  ) {
    raisedBy = "Renter";
    // Notify the customer (Rentee)
    counterpartUserID = booking.rentee.userID;
  } else {
    // Actor is not a party to this booking
    throw new HttpError(404, "Booking not found");
  }

  // Disputes may only be raised on bookings that are in progress or completed.
  if (
    booking.status !== "Confirmed" &&
    booking.status !== "Active" &&
    booking.status !== "Completed"
  ) {
    throw new HttpError(
      409,
      "Dispute can only be raised on a Confirmed, Active, or Completed booking"
    );
  }

  // Prevent duplicate open disputes on the same booking.
  const existingDispute = await db.dispute.findFirst({
    where: {
      bookingID: input.bookingId,
      status: { in: ["Open", "UnderReview"] },
    },
    select: { disputeID: true },
  });
  if (existingDispute) {
    throw new HttpError(
      409,
      "An open or under-review dispute already exists for this booking"
    );
  }

  // Create the dispute and send notifications in one atomic transaction.
  const dispute = await db.$transaction(async (tx) => {
    const created = await tx.dispute.create({
      data: {
        bookingID: input.bookingId,
        raisedBy,
        description: input.description,
        status: "Open",
      },
    });

    // Notify the other party
    await notify(tx, {
      userID: counterpartUserID,
      type: "dispute_opened",
      title: "New dispute raised",
      body: "A dispute has been raised on one of your bookings.",
      href: "/dashboard",
    });

    // Notify all admins so they can review
    await notifyAdmins(tx, {
      type: "dispute_opened",
      title: "New dispute",
      body: `A new dispute has been opened on booking ${input.bookingId}.`,
      href: "/dashboard/admin#disputes",
    });

    return created;
  });

  return { id: dispute.disputeID };
}
