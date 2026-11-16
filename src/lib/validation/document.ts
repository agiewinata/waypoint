import { z } from "zod";

// ---------------------------------------------------------------------------
// Existing parent-validation helpers (used in unit tests and server layer)
// ---------------------------------------------------------------------------

export interface DocumentParentInput {
  vehicleVIN?: string | null;
  renterID?: string | null;
  renteeID?: string | null;
}

export function assertDocumentHasExactlyOneParent(
  input: DocumentParentInput
): void {
  const count = [input.vehicleVIN, input.renterID, input.renteeID].filter(
    (v) => v != null && v !== ""
  ).length;
  if (count !== 1) {
    throw new Error(
      `Document must have exactly one parent (vehicleVIN, renterID, or renteeID), got ${count}`
    );
  }
}

// ---------------------------------------------------------------------------
// Upload size limit (5 MiB)
// ---------------------------------------------------------------------------

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// ---------------------------------------------------------------------------
// sniffMime — read the first few bytes and return a known MIME type, or null.
// Only JPEG, PNG, and PDF are accepted as document uploads.
// ---------------------------------------------------------------------------

export function sniffMime(
  bytes: Uint8Array
): "image/jpeg" | "image/png" | "application/pdf" | null {
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  // PDF: 25 50 44 46 (%PDF)
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return "application/pdf";
  }
  return null;
}

// ---------------------------------------------------------------------------
// DocumentUploadFields — Zod schema for multipart form fields (not the file).
//
// Rules:
//   - listingCode is REQUIRED when type is STNK or Insurance
//   - listingCode must NOT be provided when type is KTP, SIM or BPKB
//   - as is NOT valid for STNK or Insurance
//   - as must be "owner" or omitted for BPKB
//   - as is optional for KTP and SIM; omitted means customer (see resolveDocSubject)
// ---------------------------------------------------------------------------

export const DocumentUploadFields = z
  .object({
    type: z.enum(["STNK", "Insurance", "KTP", "SIM", "BPKB"]),
    listingCode: z.string().optional(),
    as: z.enum(["owner", "customer"]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "STNK" || data.type === "Insurance") {
      if (!data.listingCode || data.listingCode.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "listingCode is required for STNK and Insurance",
          path: ["listingCode"],
        });
      }
      if (data.as !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "as is not valid for vehicle documents",
          path: ["as"],
        });
      }
    }
    if (data.type === "KTP" || data.type === "SIM" || data.type === "BPKB") {
      if (data.listingCode && data.listingCode.trim() !== "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "listingCode must not be provided for KTP, SIM and BPKB",
          path: ["listingCode"],
        });
      }
    }
    if (data.type === "BPKB" && data.as === "customer") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "BPKB can only be uploaded as owner",
        path: ["as"],
      });
    }
  });

export type DocumentUploadFields = z.infer<typeof DocumentUploadFields>;

// ---------------------------------------------------------------------------
// resolveDocSubject — which parent a document attaches to.
//   STNK / Insurance → vehicle (listingCode)
//   BPKB             → owner (Renter)
//   KTP / SIM        → owner if as=owner, otherwise customer (Rentee)
// ---------------------------------------------------------------------------

export function resolveDocSubject(fields: {
  type: string;
  as?: string;
  listingCode?: string;
}): "vehicle" | "owner" | "customer" {
  if (fields.type === "STNK" || fields.type === "Insurance") return "vehicle";
  if (fields.type === "BPKB") return "owner";
  return fields.as === "owner" ? "owner" : "customer";
}
