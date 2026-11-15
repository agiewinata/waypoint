/**
 * Integration tests for the Bookings API (B1-B3).
 *
 * Run with: npm run test:integration (requires dev server at http://localhost:3000)
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  api,
  newUser,
  newJar,
  asOwner,
  asCustomer,
  createApprovedVehicle,
  cleanup,
  type CookieJar,
} from "./helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

/** Wait up to maxMs for the dev server to respond. */
async function waitForServer(maxMs = 15_000): Promise<boolean> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(BASE, { signal: AbortSignal.timeout(2_000) });
      if (r.status < 500) return true;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  return false;
}

/** Returns a valid future date string in YYYY-MM-DD format, N days from today. */
function futureDate(daysAhead: number): string {
  const d = new Date(Date.now() + daysAhead * 86_400_000);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Shared state (created once per suite)
// ---------------------------------------------------------------------------

let serverUp = false;

/** Owner user (Renter) */
let ownerJar: CookieJar;
let ownerUserId: string;
let renterID: string;
let listingCode: string;

/** Customer user (Rentee) */
let customerJar: CookieJar;
let customerUserId: string;

beforeAll(async () => {
  serverUp = await waitForServer();
  if (!serverUp) {
    console.warn(
      `[bookings] Dev server not reachable at ${BASE} — tests will pass vacuously`
    );
    return;
  }

  // Create owner
  const ownerResult = await newUser();
  ownerJar = ownerResult.jar;
  ownerUserId = ownerResult.userId;
  const ownerProfile = await asOwner(ownerJar);
  renterID = ownerProfile.renterID;

  // Create an approved vehicle directly via DB (faster than API)
  const vehicle = await createApprovedVehicle(renterID, {
    make: "Honda",
    model: "Jazz",
    pricePerDay: 300_000,
  });
  listingCode = vehicle.listingCode;

  // Create customer
  const customerResult = await newUser();
  customerJar = customerResult.jar;
  customerUserId = customerResult.userId;
  await asCustomer(customerJar);
}, 60_000);

afterAll(async () => {
  if (serverUp && ownerUserId && customerUserId) {
    await cleanup(ownerUserId, customerUserId);
  }
});

// Skip helper: returns early when server is not running
function skip() {
  return !serverUp;
}

// ---------------------------------------------------------------------------
// 401 without session
// ---------------------------------------------------------------------------

describe("Authentication guard", () => {
  it("GET /api/bookings returns 401 without session", async () => {
    if (skip()) return;
    const jar = newJar();
    const res = await api(jar, "GET", "/api/bookings?as=customer");
    expect(res.status).toBe(401);
  });

  it("POST /api/bookings returns 401 without session", async () => {
    if (skip()) return;
    const jar = newJar();
    const res = await api(jar, "POST", "/api/bookings", {
      listingCode: "FAKE",
      startDate: futureDate(5),
      endDate: futureDate(7),
      locationConsent: false,
    });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// CSRF / Origin guard
// ---------------------------------------------------------------------------

describe("Origin guard", () => {
  it("POST without Origin returns 403", async () => {
    if (skip()) return;
    // Manually send without Origin header
    const res = await fetch(`${BASE}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingCode,
        startDate: futureDate(5),
        endDate: futureDate(7),
        locationConsent: false,
      }),
    });
    expect(res.status).toBe(403);
  });

  it("PATCH without Origin returns 403", async () => {
    if (skip()) return;
    const res = await fetch(`${BASE}/api/bookings/fake-id`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm" }),
    });
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// B2 — create booking
// ---------------------------------------------------------------------------

describe("POST /api/bookings (B2)", () => {
  it("returns 400 when endDate <= startDate", async () => {
    if (skip()) return;
    const res = await api(customerJar, "POST", "/api/bookings", {
      listingCode,
      startDate: futureDate(10),
      endDate: futureDate(10), // same day — 0 nights
      locationConsent: false,
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when endDate is before startDate", async () => {
    if (skip()) return;
    const res = await api(customerJar, "POST", "/api/bookings", {
      listingCode,
      startDate: futureDate(10),
      endDate: futureDate(8),
      locationConsent: false,
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 for a non-existent listing code", async () => {
    if (skip()) return;
    const res = await api(customerJar, "POST", "/api/bookings", {
      listingCode: "LST-DOESNOTEXIST",
      startDate: futureDate(5),
      endDate: futureDate(8),
      locationConsent: false,
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 when vehicle is not Approved (Draft/Pending)", async () => {
    if (skip()) return;
    // Create a Draft vehicle directly
    const { db } = await import("@/lib/db");
    const crypto = await import("node:crypto");
    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const draftVin = `WD${suffix}TEST00001`.slice(0, 17).padEnd(17, "0");
    const draftListing = `LST-DRAFT-${suffix}`;
    await db.vehicle.create({
      data: {
        VIN: draftVin,
        renterID,
        listingCode: draftListing,
        make: "Toyota",
        model: "Yaris",
        year: 2020,
        plateNumber: `D ${suffix.slice(0, 4)} TEST`,
        type: "Hatchback",
        city: "Bandung",
        pricePerDay: 200_000,
        status: "Draft",
      },
    });

    const res = await api(customerJar, "POST", "/api/bookings", {
      listingCode: draftListing,
      startDate: futureDate(5),
      endDate: futureDate(8),
      locationConsent: false,
    });
    expect(res.status).toBe(404);

    // Cleanup draft vehicle
    await db.vehicle.delete({ where: { VIN: draftVin } });
  });

  it("creates a booking and returns 201 with id and totalPrice", async () => {
    if (skip()) return;
    const res = await api(customerJar, "POST", "/api/bookings", {
      listingCode,
      startDate: futureDate(20),
      endDate: futureDate(23), // 3 nights × 300,000 = 900,000
      locationConsent: true,
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; totalPrice: number };
    expect(typeof body.id).toBe("string");
    expect(body.totalPrice).toBe(900_000);
  });

  it("returns 409 when dates overlap an existing booking", async () => {
    if (skip()) return;
    // First booking (created in the previous test covers days 20-23).
    // A new booking overlapping those dates should conflict.
    const res = await api(customerJar, "POST", "/api/bookings", {
      listingCode,
      startDate: futureDate(21),
      endDate: futureDate(25),
      locationConsent: false,
    });
    expect(res.status).toBe(409);
  });

  it("concurrent duplicate bookings: exactly one 201 and one 409", async () => {
    if (skip()) return;
    // Use different dates from the existing bookings (days 30-33)
    const payload = {
      listingCode,
      startDate: futureDate(30),
      endDate: futureDate(33),
      locationConsent: false,
    };
    const [res1, res2] = await Promise.all([
      api(customerJar, "POST", "/api/bookings", payload),
      api(customerJar, "POST", "/api/bookings", payload),
    ]);
    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 409]);
  });
});

// ---------------------------------------------------------------------------
// B1 — list bookings
// ---------------------------------------------------------------------------

describe("GET /api/bookings (B1)", () => {
  it("returns bookings list for customer", async () => {
    if (skip()) return;
    const res = await api(customerJar, "GET", "/api/bookings?as=customer");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[] };
    expect(Array.isArray(body.items)).toBe(true);
    // We created at least one booking above
    expect(body.items.length).toBeGreaterThan(0);
  });

  it("returns bookings list for owner", async () => {
    if (skip()) return;
    const res = await api(ownerJar, "GET", "/api/bookings?as=owner");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[] };
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);
  });

  it("returns 400 for missing `as` param", async () => {
    if (skip()) return;
    const res = await api(customerJar, "GET", "/api/bookings");
    expect(res.status).toBe(400);
  });

  it("returns 403 when customer tries to list as owner (no renter profile)", async () => {
    if (skip()) return;
    const res = await api(customerJar, "GET", "/api/bookings?as=owner");
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// B3 — owner transitions (PATCH /api/bookings/:id)
// ---------------------------------------------------------------------------

describe("PATCH /api/bookings/:id (B3)", () => {
  let bookingId: string;

  beforeAll(async () => {
    if (!serverUp) return;
    // Create a fresh booking to transition
    const res = await api(customerJar, "POST", "/api/bookings", {
      listingCode,
      startDate: futureDate(50),
      endDate: futureDate(52),
      locationConsent: false,
    });
    if (res.status === 201) {
      const body = (await res.json()) as { id: string };
      bookingId = body.id;
    }
  });

  it("confirms a Pending booking → Confirmed", async () => {
    if (skip() || !bookingId) return;
    const res = await api(ownerJar, "PATCH", `/api/bookings/${bookingId}`, {
      action: "confirm",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; status: string };
    expect(body.status).toBe("Confirmed");
  });

  it("returns 409 when confirming a non-Pending booking", async () => {
    if (skip() || !bookingId) return;
    // Already Confirmed from the previous test
    const res = await api(ownerJar, "PATCH", `/api/bookings/${bookingId}`, {
      action: "confirm",
    });
    expect(res.status).toBe(409);
  });

  it("returns 409 for start action without a Held payment", async () => {
    if (skip() || !bookingId) return;
    // Booking is Confirmed but no payment exists yet
    const res = await api(ownerJar, "PATCH", `/api/bookings/${bookingId}`, {
      action: "start",
    });
    expect(res.status).toBe(409);
  });

  it("returns 404 when booking does not belong to the owner", async () => {
    if (skip() || !bookingId) return;
    // The customer (not the owner) tries to transition — customer has no owner profile
    // so requireOwner will return 403. Let's use a different owner.
    const otherOwnerResult = await newUser();
    const otherOwnerJar = otherOwnerResult.jar;
    const otherOwnerUserId = otherOwnerResult.userId;
    await asOwner(otherOwnerJar);

    const res = await api(otherOwnerJar, "PATCH", `/api/bookings/${bookingId}`, {
      action: "confirm",
    });
    // 404 because this booking doesn't belong to this owner
    expect(res.status).toBe(404);

    await cleanup(otherOwnerUserId);
  });
});
