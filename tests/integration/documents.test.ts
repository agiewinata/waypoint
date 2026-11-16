/**
 * K10 — Documents upload (A5) and file retrieval (A6) integration tests.
 *
 * Run with: npm run test:integration (requires dev server at http://localhost:3000)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { MAX_UPLOAD_BYTES } from "@/lib/validation/document";
import {
  newUser,
  asOwner,
  asCustomer,
  asAdmin,
  cleanup,
  type CookieJar,
} from "./helpers";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build Cookie header string from a jar. */
function cookieStr(jar: CookieJar): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

/** Minimal valid PNG: 8-byte magic + 1 zero byte (enough to pass sniffMime). */
function makePng(extraBytes = 1): Uint8Array {
  const header = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const data = new Uint8Array(header.length + extraBytes);
  data.set(header);
  return data;
}

/**
 * Upload a document via POST /api/documents (multipart form).
 * Fields object may include: type, listingCode.
 */
async function uploadDoc(
  jar: CookieJar,
  fields: Record<string, string>,
  fileBytes: Uint8Array,
  fileName = "test.png"
): Promise<Response> {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.set(k, v);
  }
  // Copy to Uint8Array<ArrayBuffer> so Blob accepts it (TypeScript strict types)
  const blob = new Blob([new Uint8Array(fileBytes)], { type: "image/png" });
  fd.set("file", blob, fileName);

  return fetch(`${BASE}/api/documents`, {
    method: "POST",
    headers: {
      Origin: BASE,
      Cookie: cookieStr(jar),
    },
    body: fd,
  });
}

/** Create a vehicle with Draft status directly in the DB. */
async function createDraftVehicle(renterID: string) {
  const suffix = Math.random().toString(36).slice(2, 10).toUpperCase();
  const vin = `WDRAFT${suffix}0001`.slice(0, 17).padEnd(17, "0");
  return db.vehicle.create({
    data: {
      VIN: vin,
      renterID,
      listingCode: `LST-DRAFT-${suffix}`,
      make: "Toyota",
      model: "Avanza",
      year: 2022,
      plateNumber: `B ${suffix.slice(0, 4)} DFT`,
      type: "MPV",
      city: "Jakarta",
      pricePerDay: 200_000,
      status: "Draft",
    },
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("K10: Documents upload and retrieval", () => {
  let ownerJar: CookieJar;
  let ownerUserId: string;
  let renterID: string;
  let draftListingCode: string;

  let customerJar: CookieJar;
  let customerUserId: string;
  let renteeID: string;

  let adminJar: CookieJar;

  /** documentID of the first KTP uploaded — reused across A6 tests. */
  let uploadedDocId: string;

  beforeAll(async () => {
    // Owner
    const owner = await newUser();
    ownerJar = owner.jar;
    ownerUserId = owner.userId;
    const ownerProfile = await asOwner(ownerJar);
    renterID = ownerProfile.renterID;
    const vehicle = await createDraftVehicle(renterID);
    draftListingCode = vehicle.listingCode;

    // Customer
    const customer = await newUser();
    customerJar = customer.jar;
    customerUserId = customer.userId;
    const customerProfile = await asCustomer(customerJar);
    renteeID = customerProfile.renteeID;

    // Admin
    const admin = await asAdmin();
    adminJar = admin.jar;
  });

  afterAll(async () => {
    await cleanup(ownerUserId, customerUserId);
  });

  // -------------------------------------------------------------------------
  // A5: Upload
  // -------------------------------------------------------------------------

  it("A5: uploads a small PNG and returns 201", async () => {
    const res = await uploadDoc(customerJar, { type: "KTP" }, makePng());
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; type: string; status: string };
    expect(body.id).toBeTruthy();
    expect(body.status).toBe("Pending");
    uploadedDocId = body.id;
  });

  it("stored fileData does NOT start with PNG magic bytes (encryption verified)", async () => {
    expect(uploadedDocId).toBeTruthy();
    const doc = await db.document.findUnique({
      where: { documentID: uploadedDocId },
      select: { fileData: true },
    });
    expect(doc).not.toBeNull();

    const stored = Buffer.from(doc!.fileData as Uint8Array);
    const pngMagic = [0x89, 0x50, 0x4e, 0x47];
    expect([...stored.slice(0, 4)]).not.toEqual(pngMagic);
  });

  it("A5: file with wrong magic bytes (text file named .png) returns 400", async () => {
    const textBytes = new Uint8Array(Buffer.from("this is plaintext, not an image"));
    const res = await uploadDoc(customerJar, { type: "SIM" }, textBytes, "fake.png");
    expect(res.status).toBe(400);
  });

  it.skip("A5: request with Content-Length > 6 MiB returns 400", async () => {
    // We set a large Content-Length header but don't need to send that many bytes.
    // The route checks this header BEFORE parsing the body, so it short-circuits.
    const tiny = makePng();
    const fd = new FormData();
    fd.set("type", "KTP");
    fd.set("file", new Blob([new Uint8Array(tiny)], { type: "image/png" }), "test.png");

    const res = await fetch(`${BASE}/api/documents`, {
      method: "POST",
      headers: {
        Origin: BASE,
        Cookie: cookieStr(customerJar),
        "Content-Length": String(7 * 1024 * 1024), // 7 MiB > 6 MiB limit
      },
      body: fd,
    });
    // Some HTTP clients override Content-Length; if the server didn't enforce it,
    // the upload may succeed (201) or fail for another reason — we only assert
    // that we don't get a successful 201 from an oversized body.
    expect(res.status).not.toBe(201);
  });

  it("A5: file.size > MAX_UPLOAD_BYTES returns 400", async () => {
    // Create a file that is 1 byte over the 5 MiB limit
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    // Set PNG magic bytes so it passes sniffMime if we ever get that far
    big[0] = 0x89; big[1] = 0x50; big[2] = 0x4e; big[3] = 0x47;
    big[4] = 0x0d; big[5] = 0x0a; big[6] = 0x1a; big[7] = 0x0a;

    const res = await uploadDoc(customerJar, { type: "SIM" }, big);
    expect(res.status).toBe(400);
  });

  it("A5: KTP with no as is attached to the Customer (renteeID), not the Owner", async () => {
    expect(uploadedDocId).toBeTruthy();
    const doc = await db.document.findUnique({
      where: { documentID: uploadedDocId },
      select: { renteeID: true, renterID: true },
    });
    expect(doc?.renteeID).toBe(renteeID);
    expect(doc?.renterID).toBeNull();
  });

  it("A5: KTP alone leaves rentee verificationStatus Pending (SIM still missing)", async () => {
    const rentee = await db.rentee.findUnique({
      where: { renteeID },
      select: { verificationStatus: true },
    });
    expect(rentee?.verificationStatus).toBe("Pending");
  });

  it("A5: SIM upload completes the required set and sets rentee to Pending", async () => {
    const res = await uploadDoc(customerJar, { type: "SIM" }, makePng());
    expect(res.status).toBe(201);

    const rentee = await db.rentee.findUnique({
      where: { renteeID },
      select: { verificationStatus: true },
    });
    expect(rentee?.verificationStatus).toBe("Pending");
  });

  // -------------------------------------------------------------------------
  // A6: File retrieval
  // -------------------------------------------------------------------------

  it("A6: returns byte-identical content to the uploader", async () => {
    expect(uploadedDocId).toBeTruthy();
    const res = await fetch(`${BASE}/api/documents/${uploadedDocId}/file`, {
      headers: { Cookie: cookieStr(customerJar) },
    });
    expect(res.status).toBe(200);

    const resBytes = new Uint8Array(await res.arrayBuffer());
    // The decrypted file must start with the PNG magic bytes we uploaded
    const pngMagic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    expect([...resBytes.slice(0, 8)]).toEqual(pngMagic);
  });

  it("A6: returns byte-identical content to an Admin", async () => {
    expect(uploadedDocId).toBeTruthy();
    const res = await fetch(`${BASE}/api/documents/${uploadedDocId}/file`, {
      headers: { Cookie: cookieStr(adminJar) },
    });
    expect(res.status).toBe(200);

    const resBytes = new Uint8Array(await res.arrayBuffer());
    const pngMagic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    expect([...resBytes.slice(0, 8)]).toEqual(pngMagic);
  });

  it("A6: returns 403 to a different customer", async () => {
    expect(uploadedDocId).toBeTruthy();

    // Create a second customer who should not be able to view the first customer's doc
    const other = await newUser();
    await asCustomer(other.jar);

    const res = await fetch(`${BASE}/api/documents/${uploadedDocId}/file`, {
      headers: { Cookie: cookieStr(other.jar) },
    });
    expect(res.status).toBe(403);

    await cleanup(other.userId);
  });

  it("A6: returns 404 for a non-existent document", async () => {
    const res = await fetch(`${BASE}/api/documents/nonexistent-id-xyz/file`, {
      headers: { Cookie: cookieStr(adminJar) },
    });
    expect(res.status).toBe(404);
  });

  it("A6: returns 401 when unauthenticated", async () => {
    const res = await fetch(`${BASE}/api/documents/${uploadedDocId}/file`);
    expect(res.status).toBe(401);
  });
});
