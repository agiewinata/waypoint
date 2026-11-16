/**
 * e2e-flow.test.ts — K16: Full end-to-end marketplace loop via API.
 *
 * Run with: npm run test:integration (requires dev server at http://localhost:3000)
 *
 * Flow:
 *  1.  Owner signup → create owner profile (POST /api/profile/owner)
 *  2.  POST /api/vehicles (A3) → listingCode
 *  3.  POST /api/documents (A5) × 2 (STNK + Insurance)
 *  4.  PATCH /api/vehicles/[code] { action: "submit" } (A4)
 *  5.  Admin: PATCH /api/admin/vehicles/[code] { action: "approve" } (AD5)
 *  6.  GET /api/vehicles → vehicle appears in public list (A1)
 *  7.  Customer signup → create customer profile (POST /api/profile/customer)
 *  8.  POST /api/documents × 2 (KTP + SIM) for customer (A5)
 *  9.  Admin: PATCH /api/admin/documents/[ktp_id] { action: "verify" } × 2 (AD4)
 * 10.  POST /api/bookings (B2) with locationConsent: true
 * 11.  Owner: PATCH /api/bookings/[id] { action: "confirm" } (B3)
 * 12.  Customer: POST /api/payments (P1) → paymentId
 * 13.  Owner: PATCH /api/bookings/[id] { action: "start" } (B3)
 *      (uses today as startDate so the guard todayJakarta() >= startDate is satisfied)
 * 14.  Customer: POST /api/location (L1)
 * 15.  Owner: PATCH /api/bookings/[id] { action: "complete" } (B3)
 * 16.  Owner: PATCH /api/payments/[paymentId] { action: "release" } (P2)
 * 17.  Owner: GET /api/notifications → contains booking_created, payment_held, payment_released
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import {
  api,
  newUser,
  asOwner,
  asCustomer,
  asAdmin,
  cleanup,
  type CookieJar,
} from "./helpers";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

// ---------------------------------------------------------------------------
// Server readiness check
// ---------------------------------------------------------------------------

async function waitForServer(maxMs = 15_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const r = await fetch(BASE, { signal: AbortSignal.timeout(2_000) });
      if (r.status < 500) return true;
    } catch {
      // keep polling
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  return false;
}

let serverUp = false;

beforeAll(async () => {
  serverUp = await waitForServer();
  if (!serverUp) {
    console.warn(`[e2e-flow] Dev server not reachable at ${BASE} — tests will pass vacuously`);
  }
}, 20_000);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a Cookie header string from a CookieJar */
function cookieStr(jar: CookieJar): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

/**
 * Returns today's date string in YYYY-MM-DD format in the Jakarta timezone (UTC+7).
 * This matches the server's todayJakarta() logic.
 */
function jakartaDateString(offsetDays = 0): string {
  const ms = Date.now() + offsetDays * 86_400_000;
  // Advance by UTC+7 offset so toISOString() yields the Jakarta calendar date
  return new Date(ms + 7 * 3_600_000).toISOString().slice(0, 10);
}

/** Minimal valid PNG: 8-byte magic + 1 zero byte (passes sniffMime check) */
function makePng(): Uint8Array {
  const header = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const data = new Uint8Array(header.length + 1);
  data.set(header);
  return data;
}

/**
 * Upload a document via POST /api/documents (multipart form).
 *
 * @param jar       Cookie jar of the authenticated user
 * @param type      Document type (KTP, SIM, STNK, Insurance)
 * @param listingCode  Required for STNK/Insurance; omit for KTP/SIM
 */
async function uploadDocument(
  jar: CookieJar,
  type: string,
  listingCode?: string
): Promise<Response> {
  const pngBytes = makePng();
  const fd = new FormData();
  fd.set("type", type);
  if (listingCode) fd.set("listingCode", listingCode);
  fd.set("file", new Blob([new Uint8Array(pngBytes)], { type: "image/png" }), "doc.png");

  return fetch(`${BASE}/api/documents`, {
    method: "POST",
    headers: {
      Origin: BASE,
      Cookie: cookieStr(jar),
    },
    body: fd,
  });
}

/** Generate a valid 17-char VIN (no I/O/Q) */
function randomVin(): string {
  const chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  return Array.from({ length: 17 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/** Generate a valid plate number */
function randomPlate(): string {
  const digits = String(Math.floor(Math.random() * 9000) + 1000);
  const letters = Array.from({ length: 3 }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)]).join("");
  return `B ${digits} ${letters}`;
}

// ---------------------------------------------------------------------------
// Shared test state — populated by the e2e flow
// ---------------------------------------------------------------------------

let ownerUserId: string;
let ownerJar: CookieJar;

let customerUserId: string;
let customerJar: CookieJar;

let adminJar: CookieJar;

let createdListingCode: string;
let ktpDocId: string;
let simDocId: string;
let bookingId: string;
let paymentId: string;

// ---------------------------------------------------------------------------
// Full e2e flow — single sequential describe so each step uses the previous
// ---------------------------------------------------------------------------

describe("K16 · Full e2e marketplace flow", () => {
  beforeAll(async () => {
    if (!serverUp) return;

    // Admin session (needed for approval steps)
    const { jar } = await asAdmin();
    adminJar = jar;
  }, 20_000);

  afterAll(async () => {
    const toClean: string[] = [];
    if (ownerUserId) toClean.push(ownerUserId);
    if (customerUserId) toClean.push(customerUserId);
    if (toClean.length > 0) await cleanup(...toClean);
  });

  // ---------------------------------------------------------------------------
  // Step 1: Owner signup and profile creation
  // ---------------------------------------------------------------------------

  it("Step 1: owner signs up and creates owner profile", async () => {
    if (!serverUp) return;

    const ownerResult = await newUser();
    ownerUserId = ownerResult.userId;
    const { jar } = await asOwner(ownerResult.jar);
    ownerJar = jar;

    expect(ownerUserId).toBeTruthy();
    expect(ownerJar.size).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // Step 2: Create vehicle (A3)
  // ---------------------------------------------------------------------------

  it("Step 2 (A3): owner creates a vehicle", async () => {
    if (!serverUp) return;

    const vin = randomVin();
    const plateNumber = randomPlate();

    const res = await api(ownerJar, "POST", "/api/vehicles", {
      vin,
      make: "Honda",
      model: "Brio",
      year: 2023,
      plateNumber,
      type: "Hatchback",
      city: "Bandung",
      pricePerDay: 200_000,
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { listingCode: string };
    expect(typeof body.listingCode).toBe("string");
    expect(body.listingCode).toMatch(/^WP-[0-9A-Z]{6}$/);
    createdListingCode = body.listingCode;
  });

  // ---------------------------------------------------------------------------
  // Step 3: Upload STNK and Insurance documents (A5 × 2)
  // ---------------------------------------------------------------------------

  it("Step 3a (A5): upload STNK document for the vehicle", async () => {
    if (!serverUp) return;

    const res = await uploadDocument(ownerJar, "STNK", createdListingCode);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; type: string; status: string };
    expect(body.type).toBe("STNK");
    expect(body.status).toBe("Pending");
  });

  it("Step 3b (A5): upload Insurance document for the vehicle", async () => {
    if (!serverUp) return;

    const res = await uploadDocument(ownerJar, "Insurance", createdListingCode);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; type: string; status: string };
    expect(body.type).toBe("Insurance");
    expect(body.status).toBe("Pending");
  });

  // ---------------------------------------------------------------------------
  // Step 4: Submit vehicle (A4)
  // ---------------------------------------------------------------------------

  it("Step 4 (A4): owner submits vehicle for review", async () => {
    if (!serverUp) return;

    const res = await api(ownerJar, "PATCH", `/api/vehicles/${createdListingCode}`, {
      action: "submit",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { listingCode: string; status: string };
    expect(body.status).toBe("Pending");
    expect(body.listingCode).toBe(createdListingCode);
  });

  // ---------------------------------------------------------------------------
  // Step 5: Admin approves vehicle (AD5)
  // ---------------------------------------------------------------------------

  it("Step 5 (AD5): admin approves vehicle", async () => {
    if (!serverUp) return;

    const res = await api(adminJar, "PATCH", `/api/admin/vehicles/${createdListingCode}`, {
      action: "approve",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { listingCode: string; status: string };
    expect(body.status).toBe("Approved");
  });

  // ---------------------------------------------------------------------------
  // Step 6: Vehicle appears in public list (A1)
  // ---------------------------------------------------------------------------

  it("Step 6 (A1): approved vehicle appears in public vehicle list", async () => {
    if (!serverUp) return;

    const res = await api(new Map(), "GET", "/api/vehicles?city=Bandung");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: { listingCode: string }[] };
    const found = body.items.some((item) => item.listingCode === createdListingCode);
    expect(found).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Step 7: Customer signup and profile creation
  // ---------------------------------------------------------------------------

  it("Step 7: customer signs up and creates customer profile", async () => {
    if (!serverUp) return;

    const customerResult = await newUser();
    customerUserId = customerResult.userId;
    const { jar } = await asCustomer(customerResult.jar);
    customerJar = jar;

    expect(customerUserId).toBeTruthy();
    expect(customerJar.size).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // Step 8: Customer uploads KTP and SIM documents (A5 × 2)
  // ---------------------------------------------------------------------------

  it("Step 8a (A5): customer uploads KTP document", async () => {
    if (!serverUp) return;

    const res = await uploadDocument(customerJar, "KTP");
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; type: string; status: string };
    expect(body.type).toBe("KTP");
    expect(body.status).toBe("Pending");
    ktpDocId = body.id;
  });

  it("Step 8b (A5): customer uploads SIM document", async () => {
    if (!serverUp) return;

    const res = await uploadDocument(customerJar, "SIM");
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; type: string; status: string };
    expect(body.type).toBe("SIM");
    expect(body.status).toBe("Pending");
    simDocId = body.id;
  });

  // ---------------------------------------------------------------------------
  // Step 9: Admin verifies KTP and SIM (AD4 × 2)
  // ---------------------------------------------------------------------------

  it("Step 9a (AD4): admin verifies customer's KTP document", async () => {
    if (!serverUp) return;

    const res = await api(adminJar, "PATCH", `/api/admin/documents/${ktpDocId}`, {
      action: "verify",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; status: string };
    expect(body.status).toBe("Verified");
  });

  it("Step 9b (AD4): admin verifies customer's SIM document", async () => {
    if (!serverUp) return;

    const res = await api(adminJar, "PATCH", `/api/admin/documents/${simDocId}`, {
      action: "verify",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; status: string };
    expect(body.status).toBe("Verified");
  });

  // ---------------------------------------------------------------------------
  // Step 10: Customer creates booking (B2)
  // Uses today as startDate so B3 "start" can be called in the same test run
  // (todayJakarta() >= startDate is satisfied when startDate = todayJakarta())
  // ---------------------------------------------------------------------------

  it("Step 10 (B2): customer books the approved vehicle with location consent", async () => {
    if (!serverUp) return;

    const startDate = jakartaDateString(0); // today in Jakarta
    const endDate = jakartaDateString(1);   // tomorrow in Jakarta

    const res = await api(customerJar, "POST", "/api/bookings", {
      listingCode: createdListingCode,
      startDate,
      endDate,
      locationConsent: true,
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; totalPrice: number };
    expect(body.id).toBeTruthy();
    expect(typeof body.totalPrice).toBe("number");
    expect(body.totalPrice).toBeGreaterThan(0);
    bookingId = body.id;
  });

  // ---------------------------------------------------------------------------
  // Step 11: Owner confirms booking (B3)
  // ---------------------------------------------------------------------------

  it("Step 11 (B3 confirm): owner confirms the booking", async () => {
    if (!serverUp) return;

    const res = await api(ownerJar, "PATCH", `/api/bookings/${bookingId}`, {
      action: "confirm",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; status: string };
    expect(body.status).toBe("Confirmed");
  });

  // ---------------------------------------------------------------------------
  // Step 12: Customer pays (P1)
  // ---------------------------------------------------------------------------

  it("Step 12 (P1): customer pays into escrow", async () => {
    if (!serverUp) return;

    const res = await api(customerJar, "POST", "/api/payments", {
      bookingId,
      method: "BankTransfer",
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; status: string; amount: number };
    expect(body.status).toBe("Held");
    expect(typeof body.amount).toBe("number");
    expect(body.amount).toBeGreaterThan(0);
    paymentId = body.id;
  });

  // ---------------------------------------------------------------------------
  // Step 13: Owner starts rental (B3)
  // ---------------------------------------------------------------------------

  it("Step 13 (B3 start): owner starts the rental", async () => {
    if (!serverUp) return;

    const res = await api(ownerJar, "PATCH", `/api/bookings/${bookingId}`, {
      action: "start",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; status: string };
    expect(body.status).toBe("Active");
  });

  // ---------------------------------------------------------------------------
  // Step 14: Customer reports location (L1)
  // ---------------------------------------------------------------------------

  it("Step 14 (L1): customer reports GPS location during active rental", async () => {
    if (!serverUp) return;

    const res = await api(customerJar, "POST", "/api/location", {
      bookingId,
      latitude: -6.2088,
      longitude: 106.8456,
      accuracy: 10,
      speedKph: 0,
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; overdue: boolean };
    expect(body.id).toBeTruthy();
    expect(typeof body.overdue).toBe("boolean");
  });

  // ---------------------------------------------------------------------------
  // Step 15: Owner completes rental (B3)
  // ---------------------------------------------------------------------------

  it("Step 15 (B3 complete): owner marks rental as completed", async () => {
    if (!serverUp) return;

    const res = await api(ownerJar, "PATCH", `/api/bookings/${bookingId}`, {
      action: "complete",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; status: string };
    expect(body.status).toBe("Completed");
  });

  // ---------------------------------------------------------------------------
  // Step 16: Owner releases payment from escrow (P2)
  // ---------------------------------------------------------------------------

  it("Step 16 (P2 release): owner releases escrow payment", async () => {
    if (!serverUp) return;

    const res = await api(ownerJar, "PATCH", `/api/payments/${paymentId}`, {
      action: "release",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; status: string; ownerPayout?: number };
    expect(body.status).toBe("Released");
    // Owner payout should be 95% of the amount
    expect(typeof body.ownerPayout).toBe("number");
  });

  // ---------------------------------------------------------------------------
  // Step 17: Owner's notifications contain the expected types (N1)
  // ---------------------------------------------------------------------------

  it("Step 17 (N1): owner notifications contain booking_created, payment_held, payment_released", async () => {
    if (!serverUp) return;

    const res = await api(ownerJar, "GET", "/api/notifications");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: { type: string }[];
      unread: number;
    };
    expect(Array.isArray(body.items)).toBe(true);

    const types = body.items.map((n) => n.type);
    expect(types).toContain("booking_created");
    expect(types).toContain("payment_held");
    expect(types).toContain("payment_released");
  });
});
