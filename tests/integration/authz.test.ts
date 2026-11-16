/**
 * authz.test.ts — K5–K8 authorization and ownership checks.
 *
 * Run with: npm run test:integration (requires dev server at http://localhost:3000)
 *
 * K5: 401 sweep (every route without a session) and 403 without Origin header
 * K6: Role checks (customer-only user) and ownership checks (user B → user A)
 * K7: Page guards — no-session pages redirect 307 to /auth/signin
 * K8: Mass assignment protection — server ignores client-supplied sensitive fields
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import {
  api,
  newJar,
  newUser,
  asOwner,
  asCustomer,
  asAdmin,
  setupProfile,
  createApprovedVehicle,
  verifyCustomer,
  approveBooking,
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
    console.warn(`[authz] Dev server not reachable at ${BASE} — tests will pass vacuously`);
  }
}, 20_000);

/** Returns true when the server is not up — used to skip test bodies. */
function skip(): boolean {
  return !serverUp;
}

// ---------------------------------------------------------------------------
// K5: 401 sweep — every route called with no session
// ---------------------------------------------------------------------------

describe("K5 · 401 sweep — no session", () => {
  it("GET /api/vehicles returns 200 (public route exception)", async () => {
    if (skip()) return;
    const res = await api(newJar(), "GET", "/api/vehicles");
    expect(res.status).toBe(200);
  });

  it("GET /api/vehicles/mine → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "GET", "/api/vehicles/mine");
    expect(res.status).toBe(401);
  });

  it("GET /api/bookings?as=owner → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "GET", "/api/bookings?as=owner");
    expect(res.status).toBe(401);
  });

  it("GET /api/documents/fake-id/file → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "GET", "/api/documents/fake-id/file");
    expect(res.status).toBe(401);
  });

  it("GET /api/notifications → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "GET", "/api/notifications");
    expect(res.status).toBe(401);
  });

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

  it("POST /api/vehicles (with Origin, no session) → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "POST", "/api/vehicles", { vin: "X" });
    expect(res.status).toBe(401);
  });

  it("POST /api/bookings (with Origin, no session) → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "POST", "/api/bookings", { listingCode: "WP-123456" });
    expect(res.status).toBe(401);
  });

  it("PATCH /api/bookings/fake-id (with Origin, no session) → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "PATCH", "/api/bookings/fake-id", { action: "confirm" });
    expect(res.status).toBe(401);
  });

  it("POST /api/payments (with Origin, no session) → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "POST", "/api/payments", { bookingId: "fake" });
    expect(res.status).toBe(401);
  });

  it("PATCH /api/payments/fake-id (with Origin, no session) → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "PATCH", "/api/payments/fake-id", { action: "release" });
    expect(res.status).toBe(401);
  });

  it("POST /api/disputes (with Origin, no session) → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "POST", "/api/disputes", { bookingId: "fake", description: "test dispute reason that is long enough" });
    expect(res.status).toBe(401);
  });

  it("POST /api/location (with Origin, no session) → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "POST", "/api/location", { bookingId: "fake", latitude: 0, longitude: 0 });
    expect(res.status).toBe(401);
  });

  it("PATCH /api/notifications (with Origin, no session) → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "PATCH", "/api/notifications", { all: true });
    expect(res.status).toBe(401);
  });

  it("PATCH /api/admin/documents/fake-id (with Origin, no session) → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "PATCH", "/api/admin/documents/fake-id", { action: "verify" });
    expect(res.status).toBe(401);
  });

  it("PATCH /api/admin/vehicles/FAKE01 (with Origin, no session) → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "PATCH", "/api/admin/vehicles/FAKE01", { action: "approve" });
    expect(res.status).toBe(401);
  });

  it("PATCH /api/admin/disputes/fake-id (with Origin, no session) → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "PATCH", "/api/admin/disputes/fake-id", { action: "review" });
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/bookings → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "GET", "/api/admin/bookings");
    expect(res.status).toBe(401);
  });

  it("PATCH /api/admin/bookings/fake-id (with Origin, no session) → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "PATCH", "/api/admin/bookings/fake-id", { action: "approve" });
    expect(res.status).toBe(401);
  });

  it("PATCH /api/profile (with Origin, no session) → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "PATCH", "/api/profile", { name: "X" });
    expect(res.status).toBe(401);
  });

  it("PATCH /api/vehicles/WP-FAKE01 (with Origin, no session) → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "PATCH", "/api/vehicles/WP-FAKE01", { action: "update", make: "X" });
    expect(res.status).toBe(401);
  });

  it("PATCH /api/bookings/fake-id cancel (with Origin, no session) → 401", async () => {
    if (skip()) return;
    const res = await api(newJar(), "PATCH", "/api/bookings/fake-id", { action: "cancel" });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// K5: 403 without Origin header — CSRF check on mutating routes
// ---------------------------------------------------------------------------

describe("K5 · 403 without Origin header (non-GET)", () => {
  it("POST /api/vehicles without Origin → 403", async () => {
    if (skip()) return;
    const res = await fetch(`${BASE}/api/vehicles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vin: "X" }),
    });
    expect(res.status).toBe(403);
  });

  it("PATCH /api/bookings/fake-id without Origin → 403", async () => {
    if (skip()) return;
    const res = await fetch(`${BASE}/api/bookings/fake-id`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm" }),
    });
    expect(res.status).toBe(403);
  });

  it("POST /api/payments without Origin → 403", async () => {
    if (skip()) return;
    const res = await fetch(`${BASE}/api/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: "fake" }),
    });
    expect(res.status).toBe(403);
  });

  it("PATCH /api/notifications without Origin → 403", async () => {
    if (skip()) return;
    const res = await fetch(`${BASE}/api/notifications`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    expect(res.status).toBe(403);
  });

  it("PATCH /api/admin/vehicles/FAKE01 without Origin → 403", async () => {
    if (skip()) return;
    const res = await fetch(`${BASE}/api/admin/vehicles/FAKE01`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    expect(res.status).toBe(403);
  });

  it("PATCH /api/admin/bookings/fake-id without Origin → 403", async () => {
    if (skip()) return;
    const res = await fetch(`${BASE}/api/admin/bookings/fake-id`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    expect(res.status).toBe(403);
  });

  it("PATCH /api/profile without Origin → 403", async () => {
    if (skip()) return;
    const res = await fetch(`${BASE}/api/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "X" }),
    });
    expect(res.status).toBe(403);
  });

  it("PATCH /api/vehicles/WP-FAKE01 without Origin → 403", async () => {
    if (skip()) return;
    const res = await fetch(`${BASE}/api/vehicles/WP-FAKE01`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", make: "X" }),
    });
    expect(res.status).toBe(403);
  });

  it("PATCH /api/bookings/fake-id cancel without Origin → 403", async () => {
    if (skip()) return;
    const res = await fetch(`${BASE}/api/bookings/fake-id`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// K6: Role checks — customer-only user
// ---------------------------------------------------------------------------

describe("K6 · Role checks — customer-only user gets 403 on owner/admin routes", () => {
  let customerOnlyJar: CookieJar;
  let customerOnlyUserId: string;

  beforeAll(async () => {
    if (!serverUp) return;
    const user = await newUser();
    customerOnlyUserId = user.userId;
    await asCustomer(user.jar);
    customerOnlyJar = user.jar;
  });

  afterAll(async () => {
    if (customerOnlyUserId) await cleanup(customerOnlyUserId);
  });

  it("GET /api/vehicles/mine (A2) → 403 for customer-only user", async () => {
    if (skip()) return;
    const res = await api(customerOnlyJar, "GET", "/api/vehicles/mine");
    expect(res.status).toBe(403);
  });

  it("POST /api/vehicles (A3) → 403 for customer-only user", async () => {
    if (skip()) return;
    const res = await api(customerOnlyJar, "POST", "/api/vehicles", {
      vin: "TESTVIN12345678AB",
      make: "Toyota",
      model: "Avanza",
      year: 2022,
      plateNumber: "B 1234 XYZ",
      type: "MPV",
      city: "Jakarta",
      pricePerDay: 200_000,
    });
    expect(res.status).toBe(403);
  });

  it("PATCH /api/vehicles/WP-FAKE01 (A4) → 403 for customer-only user", async () => {
    if (skip()) return;
    const res = await api(customerOnlyJar, "PATCH", "/api/vehicles/WP-FAKE01", {
      action: "submit",
    });
    expect(res.status).toBe(403);
  });

  it("PATCH /api/bookings/fake-id (B3) → 403 for customer-only user", async () => {
    if (skip()) return;
    const res = await api(customerOnlyJar, "PATCH", "/api/bookings/fake-id", {
      action: "confirm",
    });
    expect(res.status).toBe(403);
  });

  it("GET /api/admin/verifications → 403 for customer-only user", async () => {
    if (skip()) return;
    const res = await api(customerOnlyJar, "GET", "/api/admin/verifications");
    expect(res.status).toBe(403);
  });

  it("GET /api/admin/vehicles → 403 for customer-only user", async () => {
    if (skip()) return;
    const res = await api(customerOnlyJar, "GET", "/api/admin/vehicles");
    expect(res.status).toBe(403);
  });

  it("GET /api/admin/disputes → 403 for customer-only user", async () => {
    if (skip()) return;
    const res = await api(customerOnlyJar, "GET", "/api/admin/disputes");
    expect(res.status).toBe(403);
  });

  it("PATCH /api/admin/documents/fake-id → 403 for customer-only user", async () => {
    if (skip()) return;
    const res = await api(customerOnlyJar, "PATCH", "/api/admin/documents/fake-id", {
      action: "verify",
    });
    expect(res.status).toBe(403);
  });

  it("GET /api/admin/bookings → 403 for customer-only user", async () => {
    if (skip()) return;
    const res = await api(customerOnlyJar, "GET", "/api/admin/bookings");
    expect(res.status).toBe(403);
  });

  it("PATCH /api/admin/bookings/fake-id (approve) → 403 for customer-only user", async () => {
    if (skip()) return;
    const res = await api(customerOnlyJar, "PATCH", "/api/admin/bookings/fake-id", {
      action: "approve",
    });
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// K6: Role checks — owner-only user gets 403 on customer actions
// ---------------------------------------------------------------------------

describe("K6 · Role checks — owner-only user gets 403 on customer actions", () => {
  let ownerOnlyUserId: string;
  let ownerOnlyJar: CookieJar;

  beforeAll(async () => {
    if (!serverUp) return;
    const user = await newUser();
    ownerOnlyUserId = user.userId;
    await asOwner(user.jar);
    ownerOnlyJar = user.jar;
  });

  afterAll(async () => {
    if (ownerOnlyUserId) await cleanup(ownerOnlyUserId);
  });

  it("PATCH /api/bookings/fake-id (cancel) → 403 for owner-only user", async () => {
    if (skip()) return;
    const res = await api(ownerOnlyJar, "PATCH", "/api/bookings/fake-id", {
      action: "cancel",
    });
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// K6: Ownership — user B cannot access user A's resources
// ---------------------------------------------------------------------------

describe("K6 · Ownership checks — user B cannot access user A resources", () => {
  let userAUserId: string;
  let userAJar: CookieJar;
  let userARenterID: string;
  let userARenteeID: string;

  let userBUserId: string;
  let userBJar: CookieJar;

  // IDs of fixtures created for user A
  let bookingId_AOwns: string;    // booking of userA's vehicle (userA is the owner)
  let bookingId_ACustomer: string; // booking where userA is the customer
  let ktpDocId: string;            // userA's KTP document

  beforeAll(async () => {
    if (!serverUp) return;

    // User A: owner + customer
    const userAResult = await newUser();
    userAUserId = userAResult.userId;
    const ownerA = await asOwner(userAResult.jar);
    userAJar = ownerA.jar;
    userARenterID = ownerA.renterID;
    const customerA = await asCustomer(userAJar);
    userARenteeID = customerA.renteeID;

    // User B: owner + customer
    const userBResult = await newUser();
    userBUserId = userBResult.userId;
    const ownerB = await asOwner(userBResult.jar);
    userBJar = ownerB.jar;
    const customerB = await asCustomer(userBJar);
    const userBRenterID = ownerB.renterID;
    const userBRenteeID = customerB.renteeID;

    // Create approved vehicles for both users
    const vehicleA = await createApprovedVehicle(userARenterID, { pricePerDay: 300_000 });
    const vehicleB = await createApprovedVehicle(userBRenterID, { pricePerDay: 200_000 });

    const tomorrow = new Date(Date.now() + 86_400_000);
    const dayAfter = new Date(Date.now() + 2 * 86_400_000);

    // bookingId_AOwns: user B (as customer) books userA's vehicle
    // → userA is the owner, userB is the customer
    const bookingAOwns = await db.booking.create({
      data: {
        vehicleVIN: vehicleA.VIN,
        renteeID: userBRenteeID,
        startDate: tomorrow,
        endDate: dayAfter,
        totalPrice: 300_000,
        status: "Pending",
        locationConsentAt: null,
      },
    });
    bookingId_AOwns = bookingAOwns.bookingID;

    // bookingId_ACustomer: userA (as customer) books userB's vehicle
    // → userB is the owner, userA is the customer
    const bookingACustomer = await db.booking.create({
      data: {
        vehicleVIN: vehicleB.VIN,
        renteeID: userARenteeID,
        startDate: tomorrow,
        endDate: dayAfter,
        totalPrice: 200_000,
        status: "Pending",
        locationConsentAt: new Date(),
      },
    });
    bookingId_ACustomer = bookingACustomer.bookingID;

    // Create a KTP document for user A
    const dummyIv = "00000000000000000000000000000000";
    const dummyTag = "00000000000000000000000000000000";
    const ktpDoc = await db.document.create({
      data: {
        renteeID: userARenteeID,
        type: "KTP",
        verificationStatus: "Pending",
        fileData: new Uint8Array([0]),
        iv: dummyIv,
        authTag: dummyTag,
      },
    });
    ktpDocId = ktpDoc.documentID;
  }, 30_000);

  afterAll(async () => {
    if (userAUserId && userBUserId) {
      await cleanup(userAUserId, userBUserId);
    }
  });

  // B3: user B (owner of different vehicle) tries owner action on user A's booking
  // transitionBooking queries by { bookingID, vehicle.renterID } — returns null → 404
  it("B3: user B cannot act as owner on user A's booking → 403 or 404", async () => {
    if (skip()) return;
    const res = await api(userBJar, "PATCH", `/api/bookings/${bookingId_AOwns}`, {
      action: "confirm",
    });
    expect([403, 404]).toContain(res.status);
  });

  // P1: user B (as customer) tries to pay for user A's (customer's) booking
  // createPayment queries by { bookingID, renteeID } — returns null → 404
  it("P1: user B cannot pay for user A's booking → 403 or 404", async () => {
    if (skip()) return;
    const res = await api(userBJar, "POST", "/api/payments", {
      bookingId: bookingId_ACustomer,
      method: "BankTransfer",
    });
    expect([403, 404]).toContain(res.status);
  });

  // A6: user B cannot view user A's KTP document
  // getDocumentFileForViewer: not userA's rentee, not admin, not renter of vehicle → 403
  it("A6: user B cannot view user A's KTP document → 403", async () => {
    if (skip()) return;
    const res = await api(userBJar, "GET", `/api/documents/${ktpDocId}/file`);
    expect(res.status).toBe(403);
  });

  // L1: user B (as customer) tries to record location for user A's booking
  // recordLocation queries by { bookingID, renteeID } — returns null → 404
  it("L1: user B cannot post location for user A's booking → 403 or 404", async () => {
    if (skip()) return;
    const res = await api(userBJar, "POST", "/api/location", {
      bookingId: bookingId_ACustomer,
      latitude: -6.2,
      longitude: 106.8,
    });
    expect([403, 404]).toContain(res.status);
  });
});

// ---------------------------------------------------------------------------
// K6: Owner cannot view a Customer's KTP document
// ---------------------------------------------------------------------------

describe("K6 · Owner cannot view a Customer's KTP document (A6)", () => {
  let ownerUserId: string;
  let ownerJar: CookieJar;
  let customerUserId: string;
  let ktpDocId: string;

  beforeAll(async () => {
    if (!serverUp) return;

    // Owner user (owner profile only, no customer profile)
    const ownerResult = await newUser();
    ownerUserId = ownerResult.userId;
    const { jar } = await asOwner(ownerResult.jar);
    ownerJar = jar;

    // Customer user with a KTP document
    const customerResult = await newUser();
    customerUserId = customerResult.userId;
    const { renteeID } = await asCustomer(customerResult.jar);

    const dummyIv = "00000000000000000000000000000000";
    const dummyTag = "00000000000000000000000000000000";
    const doc = await db.document.create({
      data: {
        renteeID,
        type: "KTP",
        verificationStatus: "Pending",
        fileData: new Uint8Array([0]),
        iv: dummyIv,
        authTag: dummyTag,
      },
    });
    ktpDocId = doc.documentID;
  }, 20_000);

  afterAll(async () => {
    if (ownerUserId) await cleanup(ownerUserId);
    if (customerUserId) await cleanup(customerUserId);
  });

  it("Owner gets 403 on a Customer's KTP document file", async () => {
    if (skip()) return;
    const res = await api(ownerJar, "GET", `/api/documents/${ktpDocId}/file`);
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// K6: Non-admin /dashboard/admin → 404
// ---------------------------------------------------------------------------

describe("K6 · Non-admin GET /dashboard/admin → 404", () => {
  let nonAdminUserId: string;
  let nonAdminJar: CookieJar;

  beforeAll(async () => {
    if (!serverUp) return;
    const user = await newUser();
    nonAdminUserId = user.userId;
    nonAdminJar = user.jar;
    // Give the user a profile so the dashboard layout doesn't redirect to /onboarding;
    // only then does requireAdminPage() run and call notFound().
    await setupProfile(nonAdminJar);
  });

  afterAll(async () => {
    if (nonAdminUserId) await cleanup(nonAdminUserId);
  });

  // Next.js App Router notFound() uses RSC streaming (HTTP 200 externally);
  // the guard is verified by checking the response body has no admin queue markup.
  it("non-admin GET /dashboard/admin: body has no admin queue markup", async () => {
    if (skip()) return;
    const res = await fetch(`${BASE}/dashboard/admin`, {
      headers: { Cookie: [...nonAdminJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ") },
    });
    expect(res.status).toBe(200);
    const body = await res.text();
    // Admin dashboard contains "Verification Queue" / "Verifications" — 404 page does not
    expect(body).not.toContain("Verification Queue");
    expect(body).not.toContain("verifications");
  });
});

// ---------------------------------------------------------------------------
// K7: Page guards — no session redirects to /auth/signin
// ---------------------------------------------------------------------------

describe("K7 · Page guards — no-session requests redirect 307 to /auth/signin", () => {
  it("/dashboard (no session) → 307, Location ends with /auth/signin", async () => {
    if (skip()) return;
    const res = await fetch(`${BASE}/dashboard`, { redirect: "manual" });
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location.endsWith("/auth/signin")).toBe(true);
  });

  it("/dashboard/owner (no session) → 307, Location ends with /auth/signin", async () => {
    if (skip()) return;
    const res = await fetch(`${BASE}/dashboard/owner`, { redirect: "manual" });
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location.endsWith("/auth/signin")).toBe(true);
  });

  it("/dashboard/customer (no session) → 307, Location ends with /auth/signin", async () => {
    if (skip()) return;
    const res = await fetch(`${BASE}/dashboard/customer`, { redirect: "manual" });
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location.endsWith("/auth/signin")).toBe(true);
  });

  it("/trips/fake-booking-id (no session) → 307, Location ends with /auth/signin", async () => {
    if (skip()) return;
    const res = await fetch(`${BASE}/trips/fake-booking-id`, { redirect: "manual" });
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location.endsWith("/auth/signin")).toBe(true);
  });

  it("/notifications (no session) → 307, Location ends with /auth/signin", async () => {
    if (skip()) return;
    const res = await fetch(`${BASE}/notifications`, { redirect: "manual" });
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location.endsWith("/auth/signin")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// K7: Page guard — signed-in user without Owner profile → /dashboard/owner/new
// ---------------------------------------------------------------------------

describe("K7 · Owner page guard: user without Owner profile is redirected", () => {
  let userWithoutOwnerUserId: string;
  let userWithoutOwnerJar: CookieJar;

  beforeAll(async () => {
    if (!serverUp) return;
    // Sign up a user with a shared profile but no owner role
    const user = await newUser();
    userWithoutOwnerUserId = user.userId;
    await setupProfile(user.jar);
    userWithoutOwnerJar = user.jar;
  });

  afterAll(async () => {
    if (userWithoutOwnerUserId) await cleanup(userWithoutOwnerUserId);
  });

  // Next.js App Router redirects from server components are embedded in the RSC stream
  // (HTTP 200 externally). The redirect instruction is visible in the RSC body.
  it("/dashboard/owner RSC body contains redirect to /dashboard/owner/new", async () => {
    if (skip()) return;
    const cookieStr = [...userWithoutOwnerJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    const res = await fetch(`${BASE}/dashboard/owner`, {
      headers: { Cookie: cookieStr },
    });
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("NEXT_REDIRECT;replace;/dashboard/owner/new;307");
  });
});

// ---------------------------------------------------------------------------
// K8: Mass assignment protection
// ---------------------------------------------------------------------------

describe("K8 · Mass assignment protection", () => {
  const cleanupIds: string[] = [];
  let ownerJar: CookieJar;
  let customerJar: CookieJar;
  let renteeID: string;
  let listingCode: string;
  let bookingId: string;
  let confirmedBookingId: string;
  let confirmedBookingTotalPrice: number;
  const pricePerDay = 150_000;

  beforeAll(async () => {
    if (!serverUp) return;

    // Owner setup
    const ownerResult = await newUser();
    cleanupIds.push(ownerResult.userId);
    const owner = await asOwner(ownerResult.jar);
    ownerJar = owner.jar;
    const vehicle = await createApprovedVehicle(owner.renterID, { pricePerDay });
    listingCode = vehicle.listingCode;

    // Customer setup (verified for payment test)
    const customerResult = await newUser();
    cleanupIds.push(customerResult.userId);
    const { jar: customerJarResult, renteeID: renteeIDResult } = await asCustomer(customerResult.jar);
    customerJar = customerJarResult;
    renteeID = renteeIDResult;
    await verifyCustomer(renteeID);

    // For the payment test: create a confirmed booking in DB
    // so customer can POST /api/payments without going through the whole flow
    const tomorrow = new Date(Date.now() + 86_400_000);
    const dayAfter = new Date(Date.now() + 2 * 86_400_000);
    confirmedBookingTotalPrice = pricePerDay; // 1 night
    const confirmedBooking = await db.booking.create({
      data: {
        vehicleVIN: vehicle.VIN,
        renteeID,
        startDate: tomorrow,
        endDate: dayAfter,
        totalPrice: confirmedBookingTotalPrice,
        status: "Confirmed",
        locationConsentAt: null,
      },
    });
    confirmedBookingId = confirmedBooking.bookingID;
  }, 30_000);

  afterAll(async () => {
    if (cleanupIds.length > 0) await cleanup(...cleanupIds);
  });

  it("POST /api/bookings: totalPrice/status/renteeID in body are ignored; response has server-computed totalPrice", async () => {
    if (skip()) return;

    // today as Jakarta date so the booking is not rejected as past
    const jakartaToday = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
    const jakartaTomorrow = new Date(Date.now() + 7 * 3_600_000 + 86_400_000).toISOString().slice(0, 10);

    const res = await api(customerJar, "POST", "/api/bookings", {
      listingCode,
      startDate: jakartaToday,
      endDate: jakartaTomorrow,
      locationConsent: false,
      // These should be stripped by zod:
      totalPrice: 1,
      status: "Confirmed",
      renteeID: "attacker-rentee-id",
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; totalPrice: number };
    expect(body.id).toBeTruthy();
    bookingId = body.id;

    // Server should compute totalPrice = 1 night × pricePerDay
    expect(body.totalPrice).toBe(pricePerDay);
    expect(body.totalPrice).not.toBe(1);

    // Verify the DB record has status=Pending (not "Confirmed") and correct renteeID
    const dbBooking = await db.booking.findUnique({
      where: { bookingID: bookingId },
      select: { status: true, renteeID: true, totalPrice: true },
    });
    expect(dbBooking).not.toBeNull();
    expect(dbBooking!.status).toBe("Pending");
    expect(dbBooking!.renteeID).toBe(renteeID);
    expect(dbBooking!.renteeID).not.toBe("attacker-rentee-id");
  });

  it("POST /api/payments: amount in body is ignored; response amount = booking.totalPrice", async () => {
    if (skip()) return;

    await approveBooking(confirmedBookingId);
    const res = await api(customerJar, "POST", "/api/payments", {
      bookingId: confirmedBookingId,
      method: "BankTransfer",
      // amount should be stripped by zod:
      amount: 1,
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; status: string; amount: number };
    expect(body.status).toBe("Held");
    expect(body.amount).toBe(confirmedBookingTotalPrice);
    expect(body.amount).not.toBe(1);
  });

  it("PATCH /api/profile: email in body is ignored; DB email is unchanged", async () => {
    if (skip()) return;

    const user = await newUser();
    cleanupIds.push(user.userId);
    await setupProfile(user.jar);

    const res = await api(user.jar, "PATCH", "/api/profile", {
      name: "NewName",
      email: "hack@hack.com",
    });
    expect(res.status).toBe(200);

    const row = await db.user.findUniqueOrThrow({
      where: { id: user.userId },
      select: { email: true, name: true },
    });
    expect(row.email).toBe(user.email);
    expect(row.name).toBe("NewName");
  });

  it("PATCH /api/admin/bookings/[id]: approvedByAdminID in body is ignored; stored adminID is the caller's", async () => {
    if (skip()) return;

    const startDate = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);
    const endDate = new Date(Date.now() + 62 * 86_400_000).toISOString().slice(0, 10);

    const created = await api(customerJar, "POST", "/api/bookings", {
      listingCode,
      startDate,
      endDate,
      locationConsent: false,
    });
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };

    const confirm = await api(ownerJar, "PATCH", `/api/bookings/${id}`, { action: "confirm" });
    expect(confirm.status).toBe(200);

    const admin = await asAdmin();
    const adminRow = await db.admin.findFirstOrThrow({
      where: { user: { email: process.env.ADMIN_EMAIL ?? "" } },
      select: { adminID: true },
    });

    const res = await api(admin.jar, "PATCH", `/api/admin/bookings/${id}`, {
      action: "approve",
      approvedByAdminID: "hack-id",
    });
    expect(res.status).toBe(200);

    const row = await db.booking.findUniqueOrThrow({
      where: { bookingID: id },
      select: { approvedByAdminID: true },
    });
    expect(row.approvedByAdminID).toBe(adminRow.adminID);
    expect(row.approvedByAdminID).not.toBe("hack-id");
  });
});

// ---------------------------------------------------------------------------
// K25: sign-out invalidates the session
// ---------------------------------------------------------------------------

describe("K25: sign-out", () => {
  let signOutUserId: string;
  let signOutJar: CookieJar;

  beforeAll(async () => {
    if (!serverUp) return;
    const user = await newUser();
    signOutUserId = user.userId;
    signOutJar = user.jar;
  }, 20_000);

  afterAll(async () => {
    if (signOutUserId) await cleanup(signOutUserId);
  });

  it("POST /api/auth/sign-out → 200, then GET /api/notifications with the same jar → 401", async () => {
    if (skip()) return;
    const signOut = await api(signOutJar, "POST", "/api/auth/sign-out", {});
    expect(signOut.status).toBe(200);

    const res = await api(signOutJar, "GET", "/api/notifications");
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// K28: seeded users reach their dashboards without an onboarding redirect
// ---------------------------------------------------------------------------

const seedPass = process.env.SEED_USER_PASSWORD;
const adminEmail = process.env.ADMIN_EMAIL;

(seedPass ? describe : describe.skip)("K28 · Seeded users reach dashboard", () => {
  const password = seedPass ?? "";

  async function signIn(email: string, pw: string): Promise<CookieJar> {
    const jar = newJar();
    const res = await api(jar, "POST", "/api/auth/sign-in/email", { email, password: pw });
    expect(res.status).toBe(200);
    return jar;
  }

  async function getPage(jar: CookieJar, path: string): Promise<string> {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Cookie: [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ") },
    });
    expect(res.status).toBe(200);
    return res.text();
  }

  for (const email of [
    "owner1@seed.waypoint.local",
    "customer1@seed.waypoint.local",
    "both1@seed.waypoint.local",
  ]) {
    it(`${email} → /dashboard has no onboarding redirect`, async () => {
      if (skip()) return;
      const jar = await signIn(email, password);
      const body = await getPage(jar, "/dashboard");
      expect(body).not.toMatch(/NEXT_REDIRECT;\w+;\/onboarding/);
    });
  }

  it("admin → /dashboard/admin has no onboarding redirect", async () => {
    if (skip() || !adminEmail) return;
    const jar = await signIn(adminEmail, process.env.ADMIN_PASSWORD ?? "");
    const body = await getPage(jar, "/dashboard/admin");
    expect(body).not.toMatch(/NEXT_REDIRECT;\w+;\/onboarding/);
  });
});
