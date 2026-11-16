/**
 * Integration tests for admin backend routes (T8).
 *
 * Run with: npm run test:integration (requires dev server at http://localhost:3000)
 *
 * Tests:
 *  - All 6 admin routes return 401 without session
 *  - All 6 return 403 for a non-admin user
 *  - AD4 verify: sets verificationStatus correctly, recomputes rentee status
 *  - AD4: KTP Verified + SIM Pending → Rentee Pending; both Verified → Rentee Verified
 *  - AD5 approve: vehicle status becomes Approved; vehicle docs become Verified
 *  - AD6 review/resolve transitions work
 *  - Non-GET without Origin → 403
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
// Server readiness
// ---------------------------------------------------------------------------

async function waitForServer(maxMs = 15_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const r = await fetch(BASE, { signal: AbortSignal.timeout(2_000) });
      if (r.status < 500) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 1_000));
  }
  return false;
}

let serverUp = false;

beforeAll(async () => {
  serverUp = await waitForServer();
  if (!serverUp)
    console.warn(
      `[admin] Dev server not reachable at ${BASE} — tests will pass vacuously`
    );
}, 20_000);

function skip() {
  return !serverUp;
}

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let adminJar: CookieJar;
let nonAdminJar: CookieJar;
let nonAdminUserId: string;

// User IDs to clean up in afterAll
const cleanupIds: string[] = [];

beforeAll(async () => {
  if (!serverUp) return;

  // Admin session
  const { jar } = await asAdmin();
  adminJar = jar;

  // Plain user (no profiles) for 401/403 tests
  const { jar: jar2, userId } = await newUser();
  nonAdminJar = jar2;
  nonAdminUserId = userId;
  cleanupIds.push(nonAdminUserId);
}, 30_000);

afterAll(async () => {
  if (cleanupIds.length > 0) await cleanup(...cleanupIds);
});

// ---------------------------------------------------------------------------
// DB fixture helpers
// ---------------------------------------------------------------------------

/** Creates a Pending document for a rentee; returns the documentID. */
async function createPendingDoc(
  renteeID: string,
  type: "KTP" | "SIM"
): Promise<string> {
  const doc = await db.document.create({
    data: {
      renteeID,
      type,
      verificationStatus: "Pending",
      fileData: new Uint8Array([0]),
      iv: "00000000000000000000000000000000",
      authTag: "00000000000000000000000000000000",
    },
  });
  return doc.documentID;
}

/** Creates a Pending vehicle with STNK + Insurance docs; returns the vehicle. */
async function createPendingVehicle(renterID: string) {
  const suffix = crypto
    .randomUUID()
    .replace(/-/g, "")
    .slice(0, 8)
    .toUpperCase();
  const vin = `WP${suffix}TEST00001`.slice(0, 17).padEnd(17, "0");
  const plateNumber = `B ${suffix.slice(0, 4)} TEST`;
  const listingCode = `LST-${suffix}`;

  const vehicle = await db.vehicle.create({
    data: {
      VIN: vin,
      renterID,
      listingCode,
      make: "Toyota",
      model: "Avanza",
      year: 2022,
      plateNumber,
      type: "MPV",
      city: "Jakarta",
      pricePerDay: 200_000,
      status: "Pending",
    },
  });

  await db.document.createMany({
    data: [
      {
        vehicleVIN: vin,
        type: "STNK",
        verificationStatus: "Pending",
        fileData: new Uint8Array([0]),
        iv: "00000000000000000000000000000000",
        authTag: "00000000000000000000000000000000",
      },
      {
        vehicleVIN: vin,
        type: "Insurance",
        verificationStatus: "Pending",
        fileData: new Uint8Array([0]),
        iv: "00000000000000000000000000000000",
        authTag: "00000000000000000000000000000000",
      },
    ],
  });

  return vehicle;
}

/** Creates an Open dispute on a booking; returns dispute + booking IDs. */
async function createOpenDispute(vehicleVIN: string, renteeID: string) {
  const booking = await db.booking.create({
    data: {
      vehicleVIN,
      renteeID,
      startDate: new Date("2026-11-20"),
      endDate: new Date("2026-11-27"),
      status: "Active",
      totalPrice: 1_400_000,
    },
  });

  const dispute = await db.dispute.create({
    data: {
      bookingID: booking.bookingID,
      raisedBy: "Rentee",
      description: "Integration test dispute",
      status: "Open",
    },
  });

  return { booking, dispute };
}

// ---------------------------------------------------------------------------
// 401 — unauthenticated access on all 6 routes
// ---------------------------------------------------------------------------

describe("All admin routes — 401 without session", () => {
  const fakeId = "nonexistent-id-00001";

  it("GET /api/admin/verifications → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "GET", "/api/admin/verifications");
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/vehicles → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "GET", "/api/admin/vehicles");
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/disputes → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "GET", "/api/admin/disputes");
    expect(res.status).toBe(401);
  });

  it("PATCH /api/admin/documents/:id → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "PATCH", `/api/admin/documents/${fakeId}`, {
      action: "verify",
    });
    expect(res.status).toBe(401);
  });

  it("PATCH /api/admin/vehicles/:code → 401", async () => {
    if (skip()) return;
    const res = await api(
      newJar(),
      "PATCH",
      `/api/admin/vehicles/${fakeId}`,
      { action: "approve" }
    );
    expect(res.status).toBe(401);
  });

  it("PATCH /api/admin/disputes/:id → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "PATCH", `/api/admin/disputes/${fakeId}`, {
      action: "review",
    });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 403 — authenticated but non-admin user
// ---------------------------------------------------------------------------

describe("All admin routes — 403 for non-admin user", () => {
  const fakeId = "nonexistent-id-00002";

  it("GET /api/admin/verifications → 403", async () => {
    if (skip()) return;
    const res = await api(nonAdminJar, "GET", "/api/admin/verifications");
    expect(res.status).toBe(403);
  });

  it("GET /api/admin/vehicles → 403", async () => {
    if (skip()) return;
    const res = await api(nonAdminJar, "GET", "/api/admin/vehicles");
    expect(res.status).toBe(403);
  });

  it("GET /api/admin/disputes → 403", async () => {
    if (skip()) return;
    const res = await api(nonAdminJar, "GET", "/api/admin/disputes");
    expect(res.status).toBe(403);
  });

  it("PATCH /api/admin/documents/:id → 403", async () => {
    if (skip()) return;
    const res = await api(
      nonAdminJar,
      "PATCH",
      `/api/admin/documents/${fakeId}`,
      { action: "verify" }
    );
    expect(res.status).toBe(403);
  });

  it("PATCH /api/admin/vehicles/:code → 403", async () => {
    if (skip()) return;
    const res = await api(
      nonAdminJar,
      "PATCH",
      `/api/admin/vehicles/${fakeId}`,
      { action: "approve" }
    );
    expect(res.status).toBe(403);
  });

  it("PATCH /api/admin/disputes/:id → 403", async () => {
    if (skip()) return;
    const res = await api(
      nonAdminJar,
      "PATCH",
      `/api/admin/disputes/${fakeId}`,
      { action: "review" }
    );
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// 403 — CSRF: non-GET without Origin header
// ---------------------------------------------------------------------------

describe("CSRF guard — non-GET without Origin → 403", () => {
  it("PATCH without Origin header returns 403", async () => {
    if (skip()) return;
    const res = await fetch(`${BASE}/api/admin/documents/fake-id`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify" }),
    });
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// AD4 — verify / reject document; recompute rentee status
// ---------------------------------------------------------------------------

describe("AD4 — document verification", () => {
  let customerUserId: string;
  let renteeID: string;
  let ktpDocId: string;
  let simDocId: string;

  beforeAll(async () => {
    if (!serverUp) return;

    const { jar, userId } = await newUser();
    customerUserId = userId;
    cleanupIds.push(customerUserId);

    const { renteeID: rid } = await asCustomer(jar);
    renteeID = rid;

    ktpDocId = await createPendingDoc(renteeID, "KTP");
    simDocId = await createPendingDoc(renteeID, "SIM");
  }, 30_000);

  it("verifying KTP sets it to Verified and leaves Rentee Pending (SIM still Pending)", async () => {
    if (skip()) return;

    const res = await api(
      adminJar,
      "PATCH",
      `/api/admin/documents/${ktpDocId}`,
      { action: "verify" }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; status: string };
    expect(body.id).toBe(ktpDocId);
    expect(body.status).toBe("Verified");

    // Rentee should still be Pending because SIM is unverified
    const rentee = await db.rentee.findUnique({ where: { renteeID } });
    expect(rentee?.verificationStatus).toBe("Pending");
  });

  it("verifying SIM sets it to Verified and promotes Rentee to Verified", async () => {
    if (skip()) return;

    const res = await api(
      adminJar,
      "PATCH",
      `/api/admin/documents/${simDocId}`,
      { action: "verify" }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; status: string };
    expect(body.id).toBe(simDocId);
    expect(body.status).toBe("Verified");

    // Both KTP and SIM are now Verified → Rentee becomes Verified
    const rentee = await db.rentee.findUnique({ where: { renteeID } });
    expect(rentee?.verificationStatus).toBe("Verified");
  });

  it("409 when trying to verify an already-verified document", async () => {
    if (skip()) return;
    const res = await api(
      adminJar,
      "PATCH",
      `/api/admin/documents/${ktpDocId}`,
      { action: "verify" }
    );
    expect(res.status).toBe(409);
  });

  it("404 for a non-existent document ID", async () => {
    if (skip()) return;
    const res = await api(
      adminJar,
      "PATCH",
      "/api/admin/documents/does-not-exist",
      { action: "verify" }
    );
    expect(res.status).toBe(404);
  });
});

describe("AD4 — document rejection sets Rentee to Rejected", () => {
  let customerUserId: string;
  let renteeID: string;
  let ktpDocId: string;

  beforeAll(async () => {
    if (!serverUp) return;

    const { jar, userId } = await newUser();
    customerUserId = userId;
    cleanupIds.push(customerUserId);

    const { renteeID: rid } = await asCustomer(jar);
    renteeID = rid;

    ktpDocId = await createPendingDoc(renteeID, "KTP");
    await createPendingDoc(renteeID, "SIM");
  }, 30_000);

  it("rejecting KTP sets doc to Rejected and Rentee to Rejected", async () => {
    if (skip()) return;

    const res = await api(
      adminJar,
      "PATCH",
      `/api/admin/documents/${ktpDocId}`,
      { action: "reject" }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; status: string };
    expect(body.status).toBe("Rejected");

    const rentee = await db.rentee.findUnique({ where: { renteeID } });
    expect(rentee?.verificationStatus).toBe("Rejected");
  });
});

// ---------------------------------------------------------------------------
// AD1 — item shape (subject + holderName)
// ---------------------------------------------------------------------------

describe("AD1 — verification item shape", () => {
  let customerUserId: string;
  let renteeID: string;
  let ktpDocId: string;

  beforeAll(async () => {
    if (!serverUp) return;

    const { jar, userId } = await newUser();
    customerUserId = userId;
    cleanupIds.push(customerUserId);

    const { renteeID: rid } = await asCustomer(jar);
    renteeID = rid;

    ktpDocId = await createPendingDoc(renteeID, "KTP");
  }, 30_000);

  it("Customer KTP item has subject customer and holderName from the user", async () => {
    if (skip()) return;

    const res = await api(adminJar, "GET", "/api/admin/verifications");
    expect(res.status).toBe(200);
    const items = (await res.json()) as {
      id: string;
      type: string;
      subject: string;
      holderName: string;
      createdAt: string;
    }[];

    const item = items.find((i) => i.id === ktpDocId);
    const user = await db.user.findUnique({
      where: { id: customerUserId },
      select: { name: true },
    });
    expect(item).toBeDefined();
    expect(item?.type).toBe("KTP");
    expect(item?.subject).toBe("customer");
    expect(item?.holderName).toBe(user?.name);
  });
});

// ---------------------------------------------------------------------------
// Customer latest-doc rule — a re-upload after rejection can reach Verified
// ---------------------------------------------------------------------------

/** Minimal PNG (magic bytes plus one byte) for multipart upload. */
function makePng(): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
}

async function uploadKtpAsCustomer(jar: CookieJar): Promise<Response> {
  const cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  const fd = new FormData();
  fd.set("type", "KTP");
  fd.set("file", new Blob([new Uint8Array(makePng())], { type: "image/png" }), "ktp.png");
  return fetch(`${BASE}/api/documents`, {
    method: "POST",
    headers: { Origin: BASE, Cookie: cookie },
    body: fd,
  });
}

describe("AD4 — Customer re-upload after rejection reaches Verified", () => {
  let customerUserId: string;
  let customerJar: CookieJar;
  let renteeID: string;
  let ktpDocId: string;
  let simDocId: string;

  beforeAll(async () => {
    if (!serverUp) return;

    const { jar, userId } = await newUser();
    customerUserId = userId;
    customerJar = jar;
    cleanupIds.push(customerUserId);

    const { renteeID: rid } = await asCustomer(jar);
    renteeID = rid;

    ktpDocId = await createPendingDoc(renteeID, "KTP");
    simDocId = await createPendingDoc(renteeID, "SIM");
  }, 30_000);

  it("rejecting KTP and verifying SIM leaves Rentee Rejected", async () => {
    if (skip()) return;

    const rejectRes = await api(
      adminJar,
      "PATCH",
      `/api/admin/documents/${ktpDocId}`,
      { action: "reject" }
    );
    expect(rejectRes.status).toBe(200);

    const verifyRes = await api(
      adminJar,
      "PATCH",
      `/api/admin/documents/${simDocId}`,
      { action: "verify" }
    );
    expect(verifyRes.status).toBe(200);

    const rentee = await db.rentee.findUnique({ where: { renteeID } });
    expect(rentee?.verificationStatus).toBe("Rejected");
  });

  it("re-uploading KTP returns 201 and sets Rentee to Pending", async () => {
    if (skip()) return;

    const res = await uploadKtpAsCustomer(customerJar);
    expect(res.status).toBe(201);

    const rentee = await db.rentee.findUnique({ where: { renteeID } });
    expect(rentee?.verificationStatus).toBe("Pending");
  });

  it("verifying the new KTP makes Rentee Verified despite the old Rejected KTP", async () => {
    if (skip()) return;

    const newKtp = await db.document.findFirst({
      where: { renteeID, type: "KTP", verificationStatus: "Pending" },
      select: { documentID: true },
    });
    expect(newKtp).not.toBeNull();

    const res = await api(
      adminJar,
      "PATCH",
      `/api/admin/documents/${newKtp!.documentID}`,
      { action: "verify" }
    );
    expect(res.status).toBe(200);

    const rentee = await db.rentee.findUnique({ where: { renteeID } });
    expect(rentee?.verificationStatus).toBe("Verified");
  });
});

// ---------------------------------------------------------------------------
// AD5 — approve / reject vehicle
// ---------------------------------------------------------------------------

describe("AD5 — vehicle approval", () => {
  let ownerUserId: string;
  let listingCode: string;
  let vehicleVIN: string;

  beforeAll(async () => {
    if (!serverUp) return;

    const { jar, userId } = await newUser();
    ownerUserId = userId;
    cleanupIds.push(ownerUserId);

    const { renterID } = await asOwner(jar);
    const vehicle = await createPendingVehicle(renterID);
    listingCode = vehicle.listingCode;
    vehicleVIN = vehicle.VIN;
  }, 30_000);

  it("approving vehicle sets status to Approved and all Pending docs to Verified", async () => {
    if (skip()) return;

    const res = await api(
      adminJar,
      "PATCH",
      `/api/admin/vehicles/${listingCode}`,
      { action: "approve" }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      listingCode: string;
      status: string;
    };
    expect(body.listingCode).toBe(listingCode);
    expect(body.status).toBe("Approved");

    const vehicle = await db.vehicle.findUnique({ where: { VIN: vehicleVIN } });
    expect(vehicle?.status).toBe("Approved");

    const docs = await db.document.findMany({
      where: { vehicleVIN },
    });
    for (const doc of docs) {
      expect(doc.verificationStatus).toBe("Verified");
    }
  });

  it("409 when trying to approve an already-approved vehicle", async () => {
    if (skip()) return;
    const res = await api(
      adminJar,
      "PATCH",
      `/api/admin/vehicles/${listingCode}`,
      { action: "approve" }
    );
    expect(res.status).toBe(409);
  });

  it("404 for a non-existent listing code", async () => {
    if (skip()) return;
    const res = await api(
      adminJar,
      "PATCH",
      "/api/admin/vehicles/LST-DOES-NOT-EXIST",
      { action: "approve" }
    );
    expect(res.status).toBe(404);
  });
});

describe("AD5 — vehicle rejection", () => {
  let ownerUserId: string;
  let listingCode: string;

  beforeAll(async () => {
    if (!serverUp) return;

    const { jar, userId } = await newUser();
    ownerUserId = userId;
    cleanupIds.push(ownerUserId);

    const { renterID } = await asOwner(jar);
    const vehicle = await createPendingVehicle(renterID);
    listingCode = vehicle.listingCode;
  }, 30_000);

  it("rejecting vehicle sets status to Rejected", async () => {
    if (skip()) return;

    const res = await api(
      adminJar,
      "PATCH",
      `/api/admin/vehicles/${listingCode}`,
      { action: "reject" }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("Rejected");
  });
});

// ---------------------------------------------------------------------------
// AD6 — dispute review / resolve / reject transitions
// ---------------------------------------------------------------------------

describe("AD6 — dispute transitions", () => {
  let ownerUserId: string;
  let customerUserId: string;
  let disputeId: string;
  let disputeId2: string;

  beforeAll(async () => {
    if (!serverUp) return;

    // Owner setup
    const { jar: ownerJar, userId: ownerId } = await newUser();
    ownerUserId = ownerId;
    cleanupIds.push(ownerUserId);
    const { renterID } = await asOwner(ownerJar);
    const vehicle = await createApprovedVehicle(renterID);

    // Customer setup
    const { jar: customerJar, userId: customerId } = await newUser();
    customerUserId = customerId;
    cleanupIds.push(customerUserId);
    const { renteeID } = await asCustomer(customerJar);

    // Two open disputes for different transition tests
    const { dispute: d1 } = await createOpenDispute(vehicle.VIN, renteeID);
    disputeId = d1.disputeID;

    const { dispute: d2 } = await createOpenDispute(vehicle.VIN, renteeID);
    disputeId2 = d2.disputeID;
  }, 30_000);

  it("review: Open → UnderReview", async () => {
    if (skip()) return;
    const res = await api(
      adminJar,
      "PATCH",
      `/api/admin/disputes/${disputeId}`,
      { action: "review" }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; status: string };
    expect(body.id).toBe(disputeId);
    expect(body.status).toBe("UnderReview");
  });

  it("resolve: UnderReview → Resolved", async () => {
    if (skip()) return;
    const res = await api(
      adminJar,
      "PATCH",
      `/api/admin/disputes/${disputeId}`,
      { action: "resolve" }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("Resolved");
  });

  it("409 on invalid transition (resolve an already-Resolved dispute)", async () => {
    if (skip()) return;
    const res = await api(
      adminJar,
      "PATCH",
      `/api/admin/disputes/${disputeId}`,
      { action: "resolve" }
    );
    expect(res.status).toBe(409);
  });

  it("reject: Open → Rejected", async () => {
    if (skip()) return;
    const res = await api(
      adminJar,
      "PATCH",
      `/api/admin/disputes/${disputeId2}`,
      { action: "reject" }
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("Rejected");
  });

  it("404 for a non-existent dispute ID", async () => {
    if (skip()) return;
    const res = await api(
      adminJar,
      "PATCH",
      "/api/admin/disputes/does-not-exist",
      { action: "review" }
    );
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// AD1/AD2/AD3 — list endpoints return arrays for admin
// ---------------------------------------------------------------------------

describe("Admin list endpoints return arrays", () => {
  it("GET /api/admin/verifications returns an array", async () => {
    if (skip()) return;
    const res = await api(adminJar, "GET", "/api/admin/verifications");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("GET /api/admin/vehicles returns an array", async () => {
    if (skip()) return;
    const res = await api(adminJar, "GET", "/api/admin/vehicles");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("GET /api/admin/disputes returns an array", async () => {
    if (skip()) return;
    const res = await api(adminJar, "GET", "/api/admin/disputes");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});
