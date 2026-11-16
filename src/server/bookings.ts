import { db } from "@/lib/db";
import { Prisma, BookingStatus } from "@/generated/prisma/client";
import { HttpError } from "@/server/http";
import { notify, notifyAdmins } from "@/server/notifications";
import { todayJakarta, parseDateOnly } from "@/lib/dates";
import { toRupiah } from "@/lib/money";
import { links } from "@/lib/links";
import { validateBookingDates, BookingDateError } from "@/lib/validation/booking";
import type { Actor } from "@/server/authz";

// ---------------------------------------------------------------------------
// DTOs — safe serialisable shapes sent to the client.
// No Prisma models, no Decimal, no Date objects.
// ---------------------------------------------------------------------------

export interface BookingSummary {
  id: string;
  listingCode: string;
  make: string;
  model: string;
  startDate: string;
  endDate: string;
  status: string;
  totalPrice: number;
  createdAt: string;
  viewerRole: "owner" | "customer";
  adminApproved: boolean;
}

export interface BookingDetail extends BookingSummary {
  vehicleCity: string;
  vehicleType: string;
  vehicleYear: number;
  customerName: string;
  customerVerificationStatus: string;
  paymentId: string | null;
  paymentStatus: string | null;
  paymentAmount: number | null;
  hasOpenDispute: boolean;
  overdue: boolean;
  locationConsent: boolean;
  canCancel: boolean;
}

export interface ApprovalQueueItem {
  id: string;
  listingCode: string;
  make: string;
  model: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  customerName: string;
  customerVerificationStatus: string;
  ownerName: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Internal DTO helpers
// ---------------------------------------------------------------------------

/** Minimal shape returned from the list queries — only the fields we need. */
interface RawSummary {
  bookingID: string;
  startDate: Date;
  endDate: Date;
  status: string;
  totalPrice: Prisma.Decimal;
  createdAt: Date;
  approvedByAdminID: string | null;
  vehicle: { listingCode: string; make: string; model: string };
}

function toSummary(b: RawSummary, viewerRole: "owner" | "customer"): BookingSummary {
  return {
    id: b.bookingID,
    listingCode: b.vehicle.listingCode,
    make: b.vehicle.make,
    model: b.vehicle.model,
    startDate: b.startDate.toISOString(),
    endDate: b.endDate.toISOString(),
    status: b.status,
    totalPrice: toRupiah(b.totalPrice),
    createdAt: b.createdAt.toISOString(),
    viewerRole,
    adminApproved: !!b.approvedByAdminID,
  };
}

// ---------------------------------------------------------------------------
// createBooking — B2
// Creates a new booking for a customer (rentee).
// Returns the new booking ID and computed total price in rupiah.
// ---------------------------------------------------------------------------

export async function createBooking(
  renteeID: string,
  userId: string,
  listingCode: string,
  startDate: string,
  endDate: string,
  locationConsent: boolean
): Promise<{ id: string; totalPrice: number }> {
  const startDateObj = parseDateOnly(startDate);
  const endDateObj = parseDateOnly(endDate);

  // All date range validation (past, nights, 180-day cap)
  try {
    validateBookingDates(startDateObj, endDateObj);
  } catch (err) {
    if (err instanceof BookingDateError) throw new HttpError(400, err.message);
    throw err;
  }

  // Find vehicle — must be Approved with a positive price
  const vehicle = await db.vehicle.findUnique({
    where: { listingCode },
    include: { renter: { select: { userID: true } } },
  });

  if (
    !vehicle ||
    vehicle.status !== "Approved" ||
    vehicle.pricePerDay.lte(0)
  ) {
    throw new HttpError(404, "Vehicle not found or not available for booking");
  }

  // Prevent booking your own vehicle
  if (vehicle.renter.userID === userId) {
    throw new HttpError(403, "Cannot book your own vehicle");
  }

  const nights = Math.floor(
    (endDateObj.getTime() - startDateObj.getTime()) / 86_400_000
  );
  const totalPrice = new Prisma.Decimal(nights).mul(vehicle.pricePerDay);

  const booking = await db.$transaction(async (tx) => {
    // Row-level lock to serialise concurrent booking attempts for the same vehicle
    await tx.$queryRaw<Array<{ VIN: string }>>`SELECT VIN FROM Vehicle WHERE VIN = ${vehicle.VIN} FOR UPDATE`;

    // Check for overlapping active/pending bookings
    const overlapping = await tx.booking.findFirst({
      where: {
        vehicleVIN: vehicle.VIN,
        status: { notIn: ["Declined", "Cancelled"] },
        startDate: { lt: endDateObj },
        endDate: { gt: startDateObj },
      },
    });
    if (overlapping) {
      throw new HttpError(409, "Booking dates conflict with an existing booking");
    }

    const b = await tx.booking.create({
      data: {
        vehicleVIN: vehicle.VIN,
        renteeID,
        startDate: startDateObj,
        endDate: endDateObj,
        totalPrice,
        status: "Pending",
        locationConsentAt: locationConsent ? new Date() : null,
      },
    });

    await notify(tx, {
      userID: vehicle.renter.userID,
      type: "booking_created",
      title: "New booking request",
      body: `New booking request for ${vehicle.make} ${vehicle.model} from ${startDate} to ${endDate}`,
      href: links.ownerBooking(b.bookingID),
    });

    return b;
  });

  return { id: booking.bookingID, totalPrice: toRupiah(totalPrice) };
}

// ---------------------------------------------------------------------------
// listBookingsForOwner — B1 (as=owner)
// ---------------------------------------------------------------------------

export async function listBookingsForOwner(
  renterID: string,
  status?: BookingStatus
): Promise<{ items: BookingSummary[] }> {
  const bookings = await db.booking.findMany({
    where: {
      vehicle: { renterID },
      ...(status ? { status } : {}),
    },
    include: {
      vehicle: { select: { listingCode: true, make: true, model: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return { items: bookings.map((b) => toSummary(b, "owner")) };
}

// ---------------------------------------------------------------------------
// listBookingsForCustomer — B1 (as=customer)
// ---------------------------------------------------------------------------

export async function listBookingsForCustomer(
  renteeID: string,
  status?: BookingStatus
): Promise<{ items: BookingSummary[] }> {
  const bookings = await db.booking.findMany({
    where: {
      renteeID,
      ...(status ? { status } : {}),
    },
    include: {
      vehicle: { select: { listingCode: true, make: true, model: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return { items: bookings.map((b) => toSummary(b, "customer")) };
}

// ---------------------------------------------------------------------------
// getBookingDetail
// Returns the full booking detail if the actor is the vehicle owner or the
// booking customer; otherwise returns null (caller maps to 404).
// ---------------------------------------------------------------------------

export async function getBookingDetail(
  actor: Actor,
  bookingId: string
): Promise<BookingDetail | null> {
  const booking = await db.booking.findUnique({
    where: { bookingID: bookingId },
    include: {
      vehicle: true,
      rentee: true,
      payments: { orderBy: { paymentID: "desc" } },
      disputes: {
        where: { status: { in: ["Open", "UnderReview"] } },
        select: { disputeID: true },
      },
    },
  });
  if (!booking) return null;

  let viewerRole: "owner" | "customer" | null = null;
  if (actor.renter && booking.vehicle.renterID === actor.renter.renterID) {
    viewerRole = "owner";
  } else if (actor.rentee && booking.renteeID === actor.rentee.renteeID) {
    viewerRole = "customer";
  }
  if (!viewerRole) return null;

  const payment = booking.payments[0] ?? null;
  const hasHeldOrReleasedPayment = booking.payments.some(
    (p) => p.status === "Held" || p.status === "Released"
  );

  return {
    ...toSummary(booking, viewerRole),
    vehicleCity: booking.vehicle.city,
    vehicleType: booking.vehicle.type,
    vehicleYear: booking.vehicle.year,
    customerName: booking.rentee.name,
    customerVerificationStatus: booking.rentee.verificationStatus,
    paymentId: payment?.paymentID ?? null,
    paymentStatus: payment?.status ?? null,
    paymentAmount: payment ? toRupiah(payment.amount) : null,
    hasOpenDispute: booking.disputes.length > 0,
    overdue: booking.status === "Active" && booking.endDate < todayJakarta(),
    locationConsent: booking.locationConsentAt !== null,
    canCancel:
      viewerRole === "customer" &&
      (booking.status === "Pending" ||
        (booking.status === "Confirmed" && !hasHeldOrReleasedPayment)),
  };
}

// ---------------------------------------------------------------------------
// listBookingsAwaitingApproval — AD7
// Confirmed bookings the Owner accepted but no Admin has approved yet.
// ---------------------------------------------------------------------------

export async function listBookingsAwaitingApproval(): Promise<ApprovalQueueItem[]> {
  const bookings = await db.booking.findMany({
    where: { status: "Confirmed", approvedByAdminID: null },
    include: {
      vehicle: {
        select: {
          listingCode: true,
          make: true,
          model: true,
          renter: { select: { name: true } },
        },
      },
      rentee: { select: { name: true, verificationStatus: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return bookings.map((b) => ({
    id: b.bookingID,
    listingCode: b.vehicle.listingCode,
    make: b.vehicle.make,
    model: b.vehicle.model,
    startDate: b.startDate.toISOString(),
    endDate: b.endDate.toISOString(),
    totalPrice: toRupiah(b.totalPrice),
    customerName: b.rentee.name,
    customerVerificationStatus: b.rentee.verificationStatus,
    ownerName: b.vehicle.renter.name,
    createdAt: b.createdAt.toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// transitionBooking — B3
// Owner-side state machine transitions for a booking.
// ---------------------------------------------------------------------------

export async function transitionBooking(
  renterID: string,
  bookingId: string,
  action: "confirm" | "decline" | "start" | "complete"
): Promise<{ id: string; status: string }> {
  const booking = await db.booking.findFirst({
    where: {
      bookingID: bookingId,
      vehicle: { renterID },
    },
    include: {
      rentee: { select: { userID: true } },
      vehicle: { select: { make: true, model: true } },
      payments: true,
    },
  });
  if (!booking) throw new HttpError(404, "Booking not found");

  const vehicleLabel = `${booking.vehicle.make} ${booking.vehicle.model}`;
  const customerHref = links.customerTrip(bookingId);

  type Transition = {
    requiredStatus: string;
    nextStatus: BookingStatus;
    notifyTitle: string;
    notifyBody: string;
    notifyType: Parameters<typeof notify>[1]["type"];
  };

  const transitions: Record<typeof action, Transition> = {
    confirm: {
      requiredStatus: "Pending",
      nextStatus: "Confirmed",
      notifyType: "booking_confirmed",
      notifyTitle: "Booking confirmed",
      notifyBody: `Your booking for ${vehicleLabel} has been confirmed`,
    },
    decline: {
      requiredStatus: "Pending",
      nextStatus: "Declined",
      notifyType: "booking_declined",
      notifyTitle: "Booking declined",
      notifyBody: `Your booking for ${vehicleLabel} has been declined`,
    },
    start: {
      requiredStatus: "Confirmed",
      nextStatus: "Active",
      notifyType: "booking_started",
      notifyTitle: "Your rental has started",
      notifyBody: `Your rental of ${vehicleLabel} is now active`,
    },
    complete: {
      requiredStatus: "Active",
      nextStatus: "Completed",
      notifyType: "booking_completed",
      notifyTitle: "Rental completed",
      notifyBody: `Your rental of ${vehicleLabel} has been completed`,
    },
  };

  const t = transitions[action];

  if (booking.status !== t.requiredStatus) {
    throw new HttpError(
      409,
      `Cannot ${action} booking in status ${booking.status}`
    );
  }

  // Extra preconditions for starting a booking
  if (action === "start") {
    const heldPayment = booking.payments.find((p) => p.status === "Held");
    if (!heldPayment) {
      throw new HttpError(409, "Payment must be held before starting the booking");
    }
    const today = todayJakarta();
    if (today < booking.startDate) {
      throw new HttpError(409, "Cannot start booking before the start date");
    }
  }

  const updated = await db.$transaction(async (tx) => {
    const b = await tx.booking.update({
      where: { bookingID: bookingId },
      data: { status: t.nextStatus },
    });
    await notify(tx, {
      userID: booking.rentee.userID,
      type: t.notifyType,
      title: t.notifyTitle,
      body: t.notifyBody,
      href: customerHref,
    });
    if (action === "confirm") {
      await notifyAdmins(tx, {
        type: "booking_awaiting_approval",
        title: "Booking awaiting approval",
        body: `A confirmed booking for ${vehicleLabel} needs admin approval before payment`,
        href: links.adminQueue("bookings"),
      });
    }
    return b;
  });

  return { id: updated.bookingID, status: updated.status };
}

// ---------------------------------------------------------------------------
// cancelBooking — B3 (cancel, Customer side)
// Allowed while Pending, or Confirmed with no Held or Released payment.
// The booking row lock serialises this with createPayment (§4.17).
// ---------------------------------------------------------------------------

export async function cancelBooking(
  renteeID: string,
  id: string
): Promise<{ id: string; status: BookingStatus }> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT bookingID FROM Booking WHERE bookingID = ${id} FOR UPDATE`;

    const booking = await tx.booking.findUnique({
      where: { bookingID: id },
      include: {
        payments: { select: { status: true } },
        vehicle: {
          select: {
            make: true,
            model: true,
            renter: { select: { userID: true } },
          },
        },
      },
    });
    if (!booking || booking.renteeID !== renteeID) {
      throw new HttpError(404, "Booking not found");
    }

    if (booking.status !== "Pending" && booking.status !== "Confirmed") {
      throw new HttpError(409, `Cannot cancel booking in status ${booking.status}`);
    }

    const paid = booking.payments.some(
      (p) => p.status === "Held" || p.status === "Released"
    );
    if (paid) {
      throw new HttpError(
        409,
        "Paid bookings can't be cancelled. Raise a dispute so an admin can refund."
      );
    }

    const updated = await tx.booking.update({
      where: { bookingID: id },
      data: { status: "Cancelled" },
    });

    await notify(tx, {
      userID: booking.vehicle.renter.userID,
      type: "booking_cancelled",
      title: "Booking cancelled",
      body: `The customer cancelled their booking for ${booking.vehicle.make} ${booking.vehicle.model}`,
      href: links.ownerBooking(id),
    });

    return { id: updated.bookingID, status: updated.status };
  });
}

// ---------------------------------------------------------------------------
// reviewBookingAsAdmin — AD8
// Approve a Confirmed booking (sets approvedByAdminID) or reject it (Cancelled).
// The Admin may not review a booking they are a party to.
// ---------------------------------------------------------------------------

export async function reviewBookingAsAdmin(
  admin: { adminID: string; userID: string },
  id: string,
  action: "approve" | "reject"
): Promise<{ id: string; status: BookingStatus; approved: boolean }> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT bookingID FROM Booking WHERE bookingID = ${id} FOR UPDATE`;

    const booking = await tx.booking.findUnique({
      where: { bookingID: id },
      include: {
        vehicle: {
          select: {
            make: true,
            model: true,
            renter: { select: { userID: true } },
          },
        },
        rentee: { select: { userID: true } },
      },
    });
    if (!booking) throw new HttpError(404, "Booking not found");

    if (
      admin.userID === booking.rentee.userID ||
      admin.userID === booking.vehicle.renter.userID
    ) {
      throw new HttpError(403, "Admins cannot review their own bookings");
    }

    if (booking.status !== "Confirmed" || booking.approvedByAdminID !== null) {
      throw new HttpError(409, "Booking is not awaiting admin approval");
    }

    const vehicleLabel = `${booking.vehicle.make} ${booking.vehicle.model}`;
    const ownerUserID = booking.vehicle.renter.userID;
    const customerUserID = booking.rentee.userID;

    if (action === "approve") {
      const updated = await tx.booking.update({
        where: { bookingID: id },
        data: { approvedByAdminID: admin.adminID },
      });
      await notify(tx, {
        userID: customerUserID,
        type: "booking_approved",
        title: "Booking approved",
        body: `Your booking for ${vehicleLabel} has been approved. You can pay now.`,
        href: links.customerCheckout(id),
      });
      await notify(tx, {
        userID: ownerUserID,
        type: "booking_approved",
        title: "Booking approved",
        body: `The booking for ${vehicleLabel} has been approved by Waypoint.`,
        href: links.ownerBooking(id),
      });
      return { id: updated.bookingID, status: updated.status, approved: true };
    }

    const updated = await tx.booking.update({
      where: { bookingID: id },
      data: { status: "Cancelled" },
    });
    await notify(tx, {
      userID: customerUserID,
      type: "booking_rejected",
      title: "Booking not approved",
      body: `Your booking for ${vehicleLabel} was not approved by Waypoint and has been cancelled.`,
      href: links.customerCheckout(id),
    });
    await notify(tx, {
      userID: ownerUserID,
      type: "booking_rejected",
      title: "Booking not approved",
      body: `The booking for ${vehicleLabel} was not approved by Waypoint and has been cancelled.`,
      href: links.ownerBooking(id),
    });
    return { id: updated.bookingID, status: updated.status, approved: false };
  });
}
