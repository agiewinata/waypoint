/**
 * K22 — Owner documents (KTP, SIM and BPKB attached to the Renter).
 *
 * Covers A5 `as` rules, AD1 item shape, AD4 Renter recompute (latest-doc rule)
 * and A1 `ownerVerified`.
 *
 * Run with: npm run test:integration (requires dev server at http://localhost:3000)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import {
  api,
  newJar,
  newUser,
  asOwner,
  asCustomer,
  asAdmin,
  createApprovedVehicle,
  cleanup,
  type CookieJar,
} from "./helpers";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cookieStr(jar: CookieJar): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

/** Minimal PNG (magic bytes plus one byte) for multipart upload. */
function makePng(): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
}

async function uploadDoc(
  jar: CookieJar,
  fields: Record<string, string>
): Promise<Response> {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.set(k, v);
  }
  fd.set("file", new Blob([new Uint8Array(makePng())], { type: "image/png" }), "doc.png");

  return fetch(`${BASE}/api/documents`, {
    method: "POST",
    headers: { Origin: BASE, Cookie: cookieStr(jar) },
    body: fd,
  });
}

/** Uploads one Owner-level document and returns its documentID. */
async function uploadOwnerDoc(
  jar: CookieJar,
  type: "KTP" | "SIM" | "BPKB"
): Promise<string> {
  const fields: Record<string, string> =
    type === "BPKB" ? { type } : { type, as: "owner" };
  const res = await uploadDoc(jar, fields);
  if (res.status !== 201) {
    throw new Error(`uploadOwnerDoc: ${type} failed with ${res.status}`);
  }
  const body = (await res.json()) as { id: string };
  return body.id;
}

/** Runs an AD4 verify or reject on a document. */
async function reviewDoc(
  adminJar: CookieJar,
  documentID: string,
  action: "verify" | "reject"
): Promise<void> {
  const res = await api(adminJar, "PATCH", `/api/admin/documents/${documentID}`, { action });
  if (res.status !== 200) {
    throw new Error(`reviewDoc: ${action} on ${documentID} failed with ${res.status}`);
  }
}

async function renterStatus(renterID: string): Promise<string | undefined> {
  const renter = await db.renter.findUnique({
    where: { renterID },
    select: { verificationStatus: true },
  });
  return renter?.verificationStatus;
}

// ---------------------------------------------------------------------------
// Upload rules (A5)
// ---------------------------------------------------------------------------

describe("K22 — Owner document upload rules", () => {
  let ownerJar: CookieJar;
  let ownerUserId: string;
  let renterID: string;
  let ktpId: string;

  let customerOnlyJar: CookieJar;
  let customerOnlyUserId: string;

  beforeAll(async () => {
    const owner = await newUser();
    ownerJar = owner.jar;
    ownerUserId = owner.userId;
    renterID = (await asOwner(ownerJar)).renterID;

    const customer = await newUser();
    customerOnlyJar = customer.jar;
    customerOnlyUserId = customer.userId;
    await asCustomer(customerOnlyJar);
  }, 30_000);

  afterAll(async () => {
    await cleanup(ownerUserId, customerOnlyUserId);
  });

  it("Owner uploads KTP as owner → 201, attached to the Renter", async () => {
    const res = await uploadDoc(ownerJar, { type: "KTP", as: "owner" });
    expect(res.status).toBe(201);
    ktpId = ((await res.json()) as { id: string }).id;

    const doc = await db.document.findUnique({
      where: { documentID: ktpId },
      select: { renterID: true, renteeID: true },
    });
    expect(doc?.renterID).toBe(renterID);
    expect(doc?.renteeID).toBeNull();
  });

  it("Owner uploads SIM as owner → 201", async () => {
    const res = await uploadDoc(ownerJar, { type: "SIM", as: "owner" });
    expect(res.status).toBe(201);
  });

  it("Owner uploads BPKB (no as) → 201, attached to the Renter", async () => {
    const res = await uploadDoc(ownerJar, { type: "BPKB" });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string };

    const doc = await db.document.findUnique({
      where: { documentID: body.id },
      select: { renterID: true },
    });
    expect(doc?.renterID).toBe(renterID);
  });

  it("Renter verificationStatus is Pending after the three uploads", async () => {
    expect(await renterStatus(renterID)).toBe("Pending");
  });

  it("Customer-only user uploading BPKB → 403", async () => {
    const res = await uploadDoc(customerOnlyJar, { type: "BPKB" });
    expect(res.status).toBe(403);
  });

  it("KTP as=owner without a Renter profile → 403", async () => {
    const res = await uploadDoc(customerOnlyJar, { type: "KTP", as: "owner" });
    expect(res.status).toBe(403);
  });

  it("duplicate Pending BPKB → 409", async () => {
    const res = await uploadDoc(ownerJar, { type: "BPKB" });
    expect(res.status).toBe(409);
  });

  it("BPKB with as=customer → 400", async () => {
    const res = await uploadDoc(ownerJar, { type: "BPKB", as: "customer" });
    expect(res.status).toBe(400);
  });

  it("STNK with as=owner → 400", async () => {
    const res = await uploadDoc(ownerJar, {
      type: "STNK",
      listingCode: "LST-NOT-REAL",
      as: "owner",
    });
    expect(res.status).toBe(400);
  });

});

// ---------------------------------------------------------------------------
// Admin review (AD1, AD4) and the public badge (A1)
// ---------------------------------------------------------------------------

describe("K22 — Owner documents: admin review and ownerVerified", () => {
  let adminJar: CookieJar;

  let ownerAJar: CookieJar;
  let ownerAUserId: string;
  let renterAID: string;
  let ktpAId: string;
  let simAId: string;
  let bpkbAId: string;

  let ownerBJar: CookieJar;
  let ownerBUserId: string;
  let renterBID: string;
  let simBId: string;
  let ktpBId: string;
  let bpkbBId: string;

  beforeAll(async () => {
    adminJar = (await asAdmin()).jar;

    const ownerA = await newUser();
    ownerAJar = ownerA.jar;
    ownerAUserId = ownerA.userId;
    renterAID = (await asOwner(ownerAJar)).renterID;

    ktpAId = await uploadOwnerDoc(ownerAJar, "KTP");
    simAId = await uploadOwnerDoc(ownerAJar, "SIM");
    bpkbAId = await uploadOwnerDoc(ownerAJar, "BPKB");

    const ownerB = await newUser();
    ownerBJar = ownerB.jar;
    ownerBUserId = ownerB.userId;
    renterBID = (await asOwner(ownerBJar)).renterID;

    ktpBId = await uploadOwnerDoc(ownerBJar, "KTP");
    simBId = await uploadOwnerDoc(ownerBJar, "SIM");
    bpkbBId = await uploadOwnerDoc(ownerBJar, "BPKB");
  }, 60_000);

  afterAll(async () => {
    await cleanup(ownerAUserId, ownerBUserId);
  });

  it("AD1 lists the Owner documents with subject owner and holderName from the user", async () => {
    const res = await api(adminJar, "GET", "/api/admin/verifications");
    expect(res.status).toBe(200);
    const items = (await res.json()) as {
      id: string;
      type: string;
      subject: string;
      holderName: string;
    }[];

    const user = await db.user.findUnique({
      where: { id: ownerAUserId },
      select: { name: true },
    });

    for (const [id, type] of [
      [ktpAId, "KTP"],
      [simAId, "SIM"],
      [bpkbAId, "BPKB"],
    ] as const) {
      const item = items.find((i) => i.id === id);
      expect(item).toBeDefined();
      expect(item?.type).toBe(type);
      expect(item?.subject).toBe("owner");
      expect(item?.holderName).toBe(user?.name);
    }
  });

  it("verifying KTP, SIM and BPKB makes Owner A's Renter Verified", async () => {
    await reviewDoc(adminJar, ktpAId, "verify");
    await reviewDoc(adminJar, simAId, "verify");
    expect(await renterStatus(renterAID)).toBe("Pending");

    await reviewDoc(adminJar, bpkbAId, "verify");
    expect(await renterStatus(renterAID)).toBe("Verified");
  });

  it("A1 shows ownerVerified true for a Verified Owner's car", async () => {
    const make = `Make${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
    const vehicle = await createApprovedVehicle(renterAID, { make });

    const res = await api(newJar(), "GET", `/api/vehicles?q=${make}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: { listingCode: string; ownerVerified: boolean }[];
    };
    const item = body.items.find((i) => i.listingCode === vehicle.listingCode);
    expect(item).toBeDefined();
    expect(item?.ownerVerified).toBe(true);
  });

  it("rejecting BPKB makes Owner B's Renter Rejected", async () => {
    await reviewDoc(adminJar, ktpBId, "verify");
    await reviewDoc(adminJar, simBId, "verify");
    await reviewDoc(adminJar, bpkbBId, "reject");

    expect(await renterStatus(renterBID)).toBe("Rejected");
  });

  it("re-uploading BPKB then verifying it makes Owner B's Renter Verified", async () => {
    const newBpkbId = await uploadOwnerDoc(ownerBJar, "BPKB");
    expect(await renterStatus(renterBID)).toBe("Pending");

    await reviewDoc(adminJar, newBpkbId, "verify");
    expect(await renterStatus(renterBID)).toBe("Verified");
  });
});
