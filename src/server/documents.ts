import { db } from "@/lib/db";
import { encryptFile, decryptFile } from "@/lib/crypto/file-encryption";
import { sniffMime, resolveDocSubject } from "@/lib/validation/document";
import { HttpError } from "@/server/http";
import { recomputeRenteeStatus, recomputeRenterStatus } from "@/server/verification";
import type { Actor } from "@/server/authz";
import type { DocumentType, VerificationStatus } from "@/generated/prisma/client";
import type { DocumentUploadFields } from "@/lib/validation/document";

// ---------------------------------------------------------------------------
// DTOs — safe subsets returned to callers (no encrypted bytes)
// ---------------------------------------------------------------------------

export interface DocumentStatusDTO {
  id: string;
  type: DocumentType;
  status: VerificationStatus;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// assertDocumentParent — exactly one of the three parent fields must be set.
// Throws HttpError 400 if the invariant is violated.
// ---------------------------------------------------------------------------

function assertDocumentParent(
  vehicleVIN: string | null,
  renterID: string | null,
  renteeID: string | null
): void {
  const count = [vehicleVIN, renterID, renteeID].filter(
    (v) => v != null && v !== ""
  ).length;
  if (count !== 1) {
    throw new HttpError(
      400,
      `Document must have exactly one parent, got ${count}`
    );
  }
}

// ---------------------------------------------------------------------------
// uploadDocument — encrypt and persist a document file.
//
// Steps:
//   1. Resolve the subject (vehicle / owner / customer) and its parent
//   2. Verify no Pending/Verified doc of the same type exists for that parent
//   3. For STNK/Insurance: vehicle must be in Draft or Rejected status
//   4. In one transaction: insert the document and recompute the parent's
//      verificationStatus (vehicle documents have no status to recompute)
// ---------------------------------------------------------------------------

export async function uploadDocument(
  actor: Actor,
  fields: DocumentUploadFields,
  bytes: Buffer
): Promise<{ id: string; type: DocumentType; status: "Pending" }> {
  const subject = resolveDocSubject(fields);

  let vehicleVIN: string | null = null;
  let renterID: string | null = null;
  let renteeID: string | null = null;

  if (subject === "vehicle") {
    // Caller must have an Owner profile (enforced in the route, but guard again)
    if (!actor.renter) {
      throw new HttpError(403, "Owner profile required");
    }

    // listingCode is validated as required by DocumentUploadFields, but guard anyway
    if (!fields.listingCode) {
      throw new HttpError(400, "listingCode is required for STNK and Insurance");
    }

    const vehicle = await db.vehicle.findUnique({
      where: { listingCode: fields.listingCode },
      select: { VIN: true, renterID: true, status: true },
    });

    if (!vehicle) throw new HttpError(404, "Vehicle not found");
    if (vehicle.renterID !== actor.renter.renterID) throw new HttpError(403, "Forbidden");

    // Vehicle must be in a state where new documents are accepted
    if (vehicle.status !== "Draft" && vehicle.status !== "Rejected") {
      throw new HttpError(
        409,
        "Vehicle must be in Draft or Rejected status to upload documents"
      );
    }

    vehicleVIN = vehicle.VIN;
  } else if (subject === "owner") {
    if (!actor.renter) {
      throw new HttpError(403, "Owner profile required");
    }
    renterID = actor.renter.renterID;
  } else {
    // KTP or SIM as customer — caller must have a Customer profile
    if (!actor.rentee) {
      throw new HttpError(403, "Customer profile required");
    }
    renteeID = actor.rentee.renteeID;
  }

  assertDocumentParent(vehicleVIN, renterID, renteeID);

  // Reject upload if a Pending or Verified doc of the same type already exists for this parent
  const existing = await db.document.findFirst({
    where: {
      type: fields.type,
      verificationStatus: { in: ["Pending", "Verified"] },
      ...(vehicleVIN !== null ? { vehicleVIN } : {}),
      ...(renterID !== null ? { renterID } : {}),
      ...(renteeID !== null ? { renteeID } : {}),
    },
    select: { documentID: true },
  });
  if (existing) {
    throw new HttpError(
      409,
      "A Pending or Verified document of this type already exists"
    );
  }

  // Encrypt file content — iv and authTag come back as hex strings
  const enc = encryptFile(bytes);

  const doc = await db.$transaction(async (tx) => {
    const created = await tx.document.create({
      data: {
        vehicleVIN,
        renterID,
        renteeID,
        type: fields.type,
        verificationStatus: "Pending",
        fileData: new Uint8Array(enc.fileData),
        iv: enc.iv,
        authTag: enc.authTag,
      },
      select: { documentID: true, type: true },
    });

    if (renteeID !== null) {
      await recomputeRenteeStatus(tx, renteeID);
    } else if (renterID !== null) {
      await recomputeRenterStatus(tx, renterID);
    }

    return created;
  });

  return { id: doc.documentID, type: doc.type, status: "Pending" };
}

// ---------------------------------------------------------------------------
// getDocumentFileForViewer — authz check then decrypt.
//
// Authz rules (checked BEFORE any decryption):
//   Admin   → always allowed
//   Rentee  → allowed only for their own rentee documents
//   Renter  → allowed for their own renter docs OR docs on their vehicles
//   Anyone else → 403
// ---------------------------------------------------------------------------

export async function getDocumentFileForViewer(
  actor: Actor,
  documentId: string
): Promise<{
  bytes: Buffer;
  contentType: "image/jpeg" | "image/png" | "application/pdf" | string;
  type: DocumentType;
  id: string;
}> {
  const doc = await db.document.findUnique({
    where: { documentID: documentId },
    select: {
      documentID: true,
      type: true,
      renterID: true,
      renteeID: true,
      vehicleVIN: true,
      fileData: true,
      iv: true,
      authTag: true,
    },
  });
  if (!doc) throw new HttpError(404, "Document not found");

  // Authz — always before decryption
  let authorized = false;

  if (actor.admin) {
    authorized = true;
  } else if (actor.rentee && doc.renteeID === actor.rentee.renteeID) {
    authorized = true;
  } else if (actor.renter) {
    if (doc.renterID === actor.renter.renterID) {
      authorized = true;
    } else if (doc.vehicleVIN) {
      // Check if the vehicle belongs to this renter
      const vehicle = await db.vehicle.findUnique({
        where: { VIN: doc.vehicleVIN },
        select: { renterID: true },
      });
      if (vehicle && vehicle.renterID === actor.renter.renterID) {
        authorized = true;
      }
    }
  }

  if (!authorized) throw new HttpError(403, "Forbidden");

  // Prisma 7 returns Bytes fields as Uint8Array — wrap in Buffer for the crypto layer
  const plaintext = decryptFile({
    fileData: Buffer.from(doc.fileData as Uint8Array),
    iv: doc.iv,
    authTag: doc.authTag,
  });

  const contentType = sniffMime(new Uint8Array(plaintext)) ?? "application/octet-stream";

  return {
    bytes: plaintext,
    contentType,
    type: doc.type,
    id: doc.documentID,
  };
}

// ---------------------------------------------------------------------------
// listCustomerDocuments — status-only list for a rentee, no file bytes.
// ---------------------------------------------------------------------------

export async function listCustomerDocuments(
  renteeID: string
): Promise<DocumentStatusDTO[]> {
  const docs = await db.document.findMany({
    where: { renteeID },
    select: {
      documentID: true,
      type: true,
      verificationStatus: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return docs.map((d) => ({
    id: d.documentID,
    type: d.type,
    status: d.verificationStatus,
    createdAt: d.createdAt.toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// listOwnerDocuments — status-only list for a renter (Owner), no file bytes.
// ---------------------------------------------------------------------------

export async function listOwnerDocuments(
  renterID: string
): Promise<DocumentStatusDTO[]> {
  const docs = await db.document.findMany({
    where: { renterID },
    select: {
      documentID: true,
      type: true,
      verificationStatus: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return docs.map((d) => ({
    id: d.documentID,
    type: d.type,
    status: d.verificationStatus,
    createdAt: d.createdAt.toISOString(),
  }));
}
