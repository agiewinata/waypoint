import { db } from "@/lib/db";
import { HttpError } from "@/server/http";
import { notify } from "@/server/notifications";

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export interface VerificationItem {
  id: string;
  type: string;
  renteeID: string;
  customerName: string;
  createdAt: string;
}

export interface VehicleQueueItem {
  listingCode: string;
  make: string;
  model: string;
  year: number;
  type: string;
  city: string;
  ownerName: string;
  docIds: string[];
}

export interface DisputeQueueItem {
  id: string;
  bookingId: string;
  raisedBy: string;
  description: string;
  status: string;
  createdAt: string;
  customerName: string;
  ownerName: string;
}

export interface AdminStats {
  pendingVerifications: number;
  pendingVehicles: number;
  openDisputes: number;
  activeBookings: number;
}

export interface VehicleReviewDoc {
  documentID: string;
  type: string;
  verificationStatus: string;
}

export interface VehicleReviewDetail {
  VIN: string;
  listingCode: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  type: string;
  city: string;
  pricePerDay: number;
  status: string;
  createdAt: string;
  ownerName: string;
  docs: VehicleReviewDoc[];
}

export interface DisputeReviewDetail {
  id: string;
  bookingId: string;
  raisedBy: string;
  description: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  customerName: string;
  ownerName: string;
  booking: {
    startDate: string;
    endDate: string;
    totalPrice: number;
    paymentStatus: string | null;
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getAdminStats(): Promise<AdminStats> {
  const [pendingVerifications, pendingVehicles, openDisputes, activeBookings] =
    await Promise.all([
      db.document.count({
        where: {
          verificationStatus: "Pending",
          renteeID: { not: null },
          type: { in: ["KTP", "SIM"] },
        },
      }),
      db.vehicle.count({ where: { status: "Pending" } }),
      db.dispute.count({ where: { status: { in: ["Open", "UnderReview"] } } }),
      db.booking.count({ where: { status: "Active" } }),
    ]);

  return { pendingVerifications, pendingVehicles, openDisputes, activeBookings };
}

/** Pending KTP/SIM documents belonging to a Rentee, oldest first. */
export async function listPendingVerifications(): Promise<VerificationItem[]> {
  const docs = await db.document.findMany({
    where: {
      verificationStatus: "Pending",
      renteeID: { not: null },
      type: { in: ["KTP", "SIM"] },
    },
    orderBy: { createdAt: "asc" },
    include: {
      rentee: { select: { name: true } },
    },
  });

  return docs.map((doc) => ({
    id: doc.documentID,
    type: doc.type,
    renteeID: doc.renteeID!,
    customerName: doc.rentee?.name ?? "Unknown",
    createdAt: doc.createdAt.toISOString(),
  }));
}

/** Vehicles awaiting admin approval, oldest first. */
export async function listPendingVehicles(): Promise<VehicleQueueItem[]> {
  const vehicles = await db.vehicle.findMany({
    where: { status: "Pending" },
    orderBy: { createdAt: "asc" },
    include: {
      renter: { select: { name: true } },
      documents: { select: { documentID: true } },
    },
  });

  return vehicles.map((v) => ({
    listingCode: v.listingCode,
    make: v.make,
    model: v.model,
    year: v.year,
    type: v.type,
    city: v.city,
    ownerName: v.renter.name,
    docIds: v.documents.map((d) => d.documentID),
  }));
}

/** Disputes with status Open or UnderReview, oldest first. */
export async function listOpenDisputes(): Promise<DisputeQueueItem[]> {
  const disputes = await db.dispute.findMany({
    where: { status: { in: ["Open", "UnderReview"] } },
    orderBy: { createdAt: "asc" },
    include: {
      booking: {
        include: {
          rentee: { select: { name: true } },
          vehicle: {
            include: { renter: { select: { name: true } } },
          },
        },
      },
    },
  });

  return disputes.map((d) => ({
    id: d.disputeID,
    bookingId: d.bookingID,
    raisedBy: d.raisedBy,
    description: d.description,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
    customerName: d.booking.rentee.name,
    ownerName: d.booking.vehicle.renter.name,
  }));
}

/** Full vehicle detail for the admin review screen; null if not found. */
export async function getVehicleForReview(
  listingCode: string
): Promise<VehicleReviewDetail | null> {
  const vehicle = await db.vehicle.findUnique({
    where: { listingCode },
    include: {
      renter: { select: { name: true } },
      documents: {
        select: { documentID: true, type: true, verificationStatus: true },
      },
    },
  });

  if (!vehicle) return null;

  return {
    VIN: vehicle.VIN,
    listingCode: vehicle.listingCode,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    plateNumber: vehicle.plateNumber,
    type: vehicle.type,
    city: vehicle.city,
    pricePerDay: Number(vehicle.pricePerDay),
    status: vehicle.status,
    createdAt: vehicle.createdAt.toISOString(),
    ownerName: vehicle.renter.name,
    docs: vehicle.documents.map((d) => ({
      documentID: d.documentID,
      type: d.type,
      verificationStatus: d.verificationStatus,
    })),
  };
}

/** Full dispute detail for the admin review screen; null if not found. */
export async function getDisputeForReview(
  disputeId: string
): Promise<DisputeReviewDetail | null> {
  const dispute = await db.dispute.findUnique({
    where: { disputeID: disputeId },
    include: {
      booking: {
        include: {
          rentee: { select: { name: true } },
          vehicle: {
            include: { renter: { select: { name: true } } },
          },
          payments: {
            select: { status: true },
            orderBy: { paidAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!dispute) return null;

  const payment = dispute.booking.payments[0] ?? null;

  return {
    id: dispute.disputeID,
    bookingId: dispute.bookingID,
    raisedBy: dispute.raisedBy,
    description: dispute.description,
    status: dispute.status,
    createdAt: dispute.createdAt.toISOString(),
    resolvedAt: dispute.resolvedAt?.toISOString() ?? null,
    customerName: dispute.booking.rentee.name,
    ownerName: dispute.booking.vehicle.renter.name,
    booking: {
      startDate: dispute.booking.startDate.toISOString(),
      endDate: dispute.booking.endDate.toISOString(),
      totalPrice: Number(dispute.booking.totalPrice),
      paymentStatus: payment?.status ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Verify or reject a document. If the document belongs to a Rentee,
 * recomputes the Rentee's overall verificationStatus based on their KTP + SIM.
 * Notifies the document owner on completion.
 */
export async function verifyDocument(
  adminID: string,
  documentId: string,
  action: "verify" | "reject"
): Promise<{ id: string; status: string }> {
  const doc = await db.document.findUnique({
    where: { documentID: documentId },
    include: {
      rentee: { select: { renteeID: true, userID: true } },
      renter: { select: { userID: true } },
    },
  });

  if (!doc) throw new HttpError(404, "Document not found");
  if (doc.verificationStatus !== "Pending") {
    throw new HttpError(409, "Document is not in Pending status");
  }

  const newStatus = action === "verify" ? "Verified" : "Rejected";
  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.document.update({
      where: { documentID: documentId },
      data: {
        verificationStatus: newStatus,
        verifiedByAdminID: adminID,
        verifiedAt: now,
      },
    });

    if (doc.renteeID) {
      // Recompute rentee verification status from all their KTP + SIM docs
      const allDocs = await tx.document.findMany({
        where: { renteeID: doc.renteeID, type: { in: ["KTP", "SIM"] } },
        select: { documentID: true, type: true, verificationStatus: true },
      });

      // Apply the update we just made in memory so the check is consistent
      const updatedDocs = allDocs.map((d) =>
        d.documentID === documentId
          ? { ...d, verificationStatus: newStatus }
          : d
      );

      const hasRejected = updatedDocs.some(
        (d) => d.verificationStatus === "Rejected"
      );
      const ktp = updatedDocs.find((d) => d.type === "KTP");
      const sim = updatedDocs.find((d) => d.type === "SIM");
      const bothVerified =
        ktp?.verificationStatus === "Verified" &&
        sim?.verificationStatus === "Verified";

      const renteeStatus = bothVerified
        ? "Verified"
        : hasRejected
          ? "Rejected"
          : "Pending";

      await tx.rentee.update({
        where: { renteeID: doc.renteeID },
        data: { verificationStatus: renteeStatus },
      });

      await notify(tx, {
        userID: doc.rentee?.userID,
        type: action === "verify" ? "document_verified" : "document_rejected",
        title: action === "verify" ? "Document Verified" : "Document Rejected",
        body:
          action === "verify"
            ? `Your ${doc.type} document has been verified.`
            : `Your ${doc.type} document has been rejected. Please resubmit.`,
        href: "/dashboard/customer/documents",
      });
    } else if (doc.renterID) {
      await notify(tx, {
        userID: doc.renter?.userID,
        type: action === "verify" ? "document_verified" : "document_rejected",
        title: action === "verify" ? "Document Verified" : "Document Rejected",
        body:
          action === "verify"
            ? `Your ${doc.type} document has been verified.`
            : `Your ${doc.type} document has been rejected. Please resubmit.`,
        href: "/dashboard/owner/documents",
      });
    }
  });

  return { id: documentId, status: newStatus };
}

/**
 * Approve or reject a vehicle listing. Requires STNK and Insurance documents.
 * Marks all Pending vehicle docs to Verified/Rejected accordingly.
 * Notifies the vehicle owner on completion.
 */
export async function approveVehicle(
  adminID: string,
  listingCode: string,
  action: "approve" | "reject"
): Promise<{ listingCode: string; status: string }> {
  const vehicle = await db.vehicle.findUnique({
    where: { listingCode },
    include: {
      renter: { select: { userID: true } },
      documents: {
        select: { documentID: true, type: true, verificationStatus: true },
      },
    },
  });

  if (!vehicle) throw new HttpError(404, "Vehicle not found");
  if (vehicle.status !== "Pending") {
    throw new HttpError(409, "Vehicle is not in Pending status");
  }

  const hasStnk = vehicle.documents.some((d) => d.type === "STNK");
  const hasInsurance = vehicle.documents.some((d) => d.type === "Insurance");
  if (!hasStnk || !hasInsurance) {
    throw new HttpError(
      409,
      "Vehicle is missing required STNK or Insurance document"
    );
  }

  if (action === "approve" && Number(vehicle.pricePerDay) <= 0) {
    throw new HttpError(409, "Price must be greater than 0");
  }

  const newStatus: "Approved" | "Rejected" =
    action === "approve" ? "Approved" : "Rejected";
  const docStatus: "Verified" | "Rejected" =
    action === "approve" ? "Verified" : "Rejected";
  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.vehicle.update({
      where: { VIN: vehicle.VIN },
      data: { status: newStatus },
    });

    const pendingDocIds = vehicle.documents
      .filter((d) => d.verificationStatus === "Pending")
      .map((d) => d.documentID);

    if (pendingDocIds.length > 0) {
      await tx.document.updateMany({
        where: { documentID: { in: pendingDocIds } },
        data: {
          verificationStatus: docStatus,
          verifiedByAdminID: adminID,
          verifiedAt: now,
        },
      });
    }

    await notify(tx, {
      userID: vehicle.renter.userID,
      type: action === "approve" ? "vehicle_approved" : "vehicle_rejected",
      title:
        action === "approve" ? "Vehicle Approved" : "Vehicle Rejected",
      body:
        action === "approve"
          ? `Your vehicle ${vehicle.make} ${vehicle.model} (${listingCode}) has been approved and is now listed.`
          : `Your vehicle ${vehicle.make} ${vehicle.model} (${listingCode}) has been rejected.`,
      href: `/dashboard/owner/vehicles/${listingCode}`,
    });
  });

  return { listingCode, status: newStatus };
}

/** Valid dispute status transitions keyed by action. */
const DISPUTE_TRANSITIONS: Record<
  "review" | "resolve" | "reject",
  string[]
> = {
  review: ["Open"],
  resolve: ["Open", "UnderReview"],
  reject: ["Open", "UnderReview"],
};

/** Target status for each dispute action. */
const DISPUTE_STATUS_MAP = {
  review: "UnderReview",
  resolve: "Resolved",
  reject: "Rejected",
} as const;

/**
 * Transition a dispute: review (Open → UnderReview), resolve, or reject.
 * Notifies both parties when resolved or rejected.
 */
export async function resolveDispute(
  adminID: string,
  disputeId: string,
  action: "review" | "resolve" | "reject"
): Promise<{ id: string; status: string }> {
  const dispute = await db.dispute.findUnique({
    where: { disputeID: disputeId },
    include: {
      booking: {
        include: {
          rentee: { select: { userID: true } },
          vehicle: {
            include: { renter: { select: { userID: true } } },
          },
        },
      },
    },
  });

  if (!dispute) throw new HttpError(404, "Dispute not found");

  if (!DISPUTE_TRANSITIONS[action].includes(dispute.status as string)) {
    throw new HttpError(
      409,
      `Cannot ${action} a dispute with status ${dispute.status}`
    );
  }

  const newStatus = DISPUTE_STATUS_MAP[action];
  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.dispute.update({
      where: { disputeID: disputeId },
      data: {
        status: newStatus,
        // Only set resolved fields when actually closing the dispute
        ...(action !== "review"
          ? { resolvedByAdminID: adminID, resolvedAt: now }
          : {}),
      },
    });

    if (action === "resolve" || action === "reject") {
      const type =
        action === "resolve" ? "dispute_resolved" : "dispute_rejected";
      const title =
        action === "resolve" ? "Dispute Resolved" : "Dispute Rejected";
      const body =
        action === "resolve"
          ? "Your dispute has been resolved by an admin."
          : "Your dispute has been reviewed and rejected by an admin.";

      const customerUserID = dispute.booking.rentee.userID;
      const ownerUserID = dispute.booking.vehicle.renter.userID;

      await notify(tx, {
        userID: customerUserID,
        type,
        title,
        body,
        href: `/dashboard/customer/bookings/${dispute.bookingID}`,
      });
      await notify(tx, {
        userID: ownerUserID,
        type,
        title,
        body,
        href: `/dashboard/owner/bookings/${dispute.bookingID}`,
      });
    }
  });

  return { id: disputeId, status: newStatus };
}
