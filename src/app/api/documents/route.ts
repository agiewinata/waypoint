import { NextResponse } from "next/server";
import { route, HttpError } from "@/server/http";
import { requireUser } from "@/server/authz";
import { MAX_UPLOAD_BYTES, sniffMime, DocumentUploadFields } from "@/lib/validation/document";
import { uploadDocument } from "@/server/documents";

// 6 MiB — bail out before reading the body if the client declares more than this
const CONTENT_LENGTH_LIMIT = 6 * 1024 * 1024;

export const POST = route(async (req) => {
  // Reject oversized requests before consuming the body
  const contentLengthHeader = req.headers.get("Content-Length");
  if (contentLengthHeader !== null) {
    const declared = parseInt(contentLengthHeader, 10);
    if (!isNaN(declared) && declared > CONTENT_LENGTH_LIMIT) {
      throw new HttpError(400, "Request body too large");
    }
  }

  // Authenticate — we need the user before we know the role requirement
  const actor = await requireUser(req);

  const formData = await req.formData();

  // Extract string fields (formData.get returns FormDataEntryValue | null)
  const typeValue = formData.get("type");
  const listingCodeValue = formData.get("listingCode");

  const rawFields = {
    type: typeof typeValue === "string" ? typeValue : null,
    listingCode:
      typeof listingCodeValue === "string" && listingCodeValue !== ""
        ? listingCodeValue
        : undefined,
  };

  // Parse and cross-field validate using the Zod schema; throws ZodError → 400 via route()
  const fields = DocumentUploadFields.parse(rawFields);

  // Extract file
  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File)) {
    throw new HttpError(400, "file is required");
  }
  if (fileEntry.size > MAX_UPLOAD_BYTES) {
    throw new HttpError(400, "File too large");
  }

  const bytes = Buffer.from(await fileEntry.arrayBuffer());

  // Reject files whose content doesn't match a supported type
  if (sniffMime(new Uint8Array(bytes)) === null) {
    throw new HttpError(400, "Unsupported file type — must be JPEG, PNG, or PDF");
  }

  // Enforce role based on document type (STNK/Insurance → owner; KTP/SIM → customer)
  if (fields.type === "STNK" || fields.type === "Insurance") {
    if (!actor.renter) {
      throw new HttpError(403, "Owner profile required");
    }
  } else {
    if (!actor.rentee) {
      throw new HttpError(403, "Customer profile required");
    }
  }

  const result = await uploadDocument(actor, fields, bytes);

  return NextResponse.json(result, { status: 201 });
});
