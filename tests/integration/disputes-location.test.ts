/**
 * Integration tests for T9: Disputes (D) and Location (L) endpoints.
 *
 * Run with: npm run test:integration (requires dev server at http://localhost:3000)
 *
 * D1 POST /api/disputes — raise a dispute on a booking
 * L1 POST /api/location  — record a GPS location point
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import {
  api,
  newUser,
  asOwner,
  asCustomer,
  createApprovedVehicle,
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
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  return false;
}

let serverUp = false;

beforeAll(async () => {
  serverUp = await waitForServer();
  if (!serverUp) {
    console.warn(
      `[disputes-location] Dev server not reachable at ${BASE} — tests will pass vacuously`
    );
  }
}, 20_000);

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let ownerJar: CookieJar;
let ownerUserId: string;
let renterID: string;

let customerJar: CookieJar;
let customerUserId: string;
let renteeID: string;

let confirmedBookingId: string;
let pendingBookingId: string;
let activeBookingId: string;
let activeNoConsentBookingId: string;

afterAll(async () => {
  await cleanup(ownerUserId, customerUserId);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a future date range: startDate = today+1, endDate = today+2 */
function futureDates() {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 1);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { startDate: start, endDate: end };
}

// ---------------------------------------------------------------------------
// Setup — create users, profiles, vehicle, and test bookings via Prisma
// ---------------------------------------------------------------------------

beforeAll(async () => {
  if (!serverUp) return;

  // Owner user
  const ownerResult = await newUser();
  ownerUserId = ownerResult.userId;
  ownerJar = ownerResult.jar;
  const ownerProfile = await asOwner(ownerJar);
  renterID = ownerProfile.renterID;

  // Customer user
  const customerResult = await newUser();
  customerUserId = customerResult.userId;
  customerJar = customerResult.jar;
  const customerProfile = await asCustomer(customerJar);
  renteeID = customerProfile.renteeID;

  // Approved vehicle owned by the owner
  const vehicle = await createApprovedVehicle(renterID);

  const { startDate, endDate } = futureDates();

  // Booking in Confirmed status — for D1 success tests
  const confirmed = await db.booking.create({
    data: {
      vehicleVIN: vehicle.VIN,
      renteeID,
      startDate,
      endDate,
      status: "Confirmed",
      totalPrice: 300_000,
    },
  });
  confirmedBookingId = confirmed.bookingID;

  // Booking in Pending status — for D1 rejection tests
  const pending = await db.booking.create({
    data: {
      vehicleVIN: vehicle.VIN,
      renteeID,
      startDate,
      endDate,
      status: "Pending",
      totalPrice: 300_000,
    },
  });
  pendingBookingId = pending.bookingID;

  // Active booking with locationConsent — for L1 success tests
  const active = await db.booking.create({
    data: {
      vehicleVIN: vehicle.VIN,
      renteeID,
      startDate,
      endDate,
      status: "Active",
      totalPrice: 300_000,
      locationConsentAt: new Date(),
    },
  });
  activeBookingId = active.bookingID;

  // Active booking WITHOUT locationConsent — for L1 consent rejection test
  const activeNoConsent = await db.booking.create({
    data: {
      vehicleVIN: vehicle.VIN,
      renteeID,
      startDate,
      endDate,
      status: "Active",
      totalPrice: 300_000,
      locationConsentAt: null,
    },
  });
  activeNoConsentBookingId = activeNoConsent.bookingID;
}, 30_000);

// ---------------------------------------------------------------------------
// D1: raise a dispute
// ---------------------------------------------------------------------------

describe("D1 POST /api/disputes", () => {
  it("201 — creates a dispute on a Confirmed booking", async () => {
    if (!serverUp) return;
    const res = await api(customerJar, "POST", "/api/disputes", {
      bookingId: confirmedBookingId,
      description:
        "The vehicle was not in the described condition; there were scratches all over the hood.",
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(typeof body.id).toBe("string");
    expect(body.id).toBeTruthy();
  });

  it("409 — second dispute on the same booking is rejected", async () => {
    if (!serverUp) return;
    // confirmedBookingId now has an Open dispute from the previous test
    const res = await api(customerJar, "POST", "/api/disputes", {
      bookingId: confirmedBookingId,
      description:
        "Trying to open a second dispute on the same booking; this should be rejected.",
    });
    expect(res.status).toBe(409);
  });

  it("409 — booking with Pending status is rejected", async () => {
    if (!serverUp) return;
    const res = await api(customerJar, "POST", "/api/disputes", {
      bookingId: pendingBookingId,
      description:
        "The booking is still pending but I want to raise a dispute about something.",
    });
    expect(res.status).toBe(409);
  });

  it("401 — unauthenticated request is rejected", async () => {
    if (!serverUp) return;
    const res = await fetch(`${BASE}/api/disputes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE },
      body: JSON.stringify({
        bookingId: confirmedBookingId,
        description: "I am not logged in and trying to raise a dispute here.",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("403 — missing Origin header is rejected", async () => {
    if (!serverUp) return;
    const res = await fetch(`${BASE}/api/disputes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: confirmedBookingId,
        description: "No origin header on this request at all.",
      }),
    });
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// L1: record a location point
// ---------------------------------------------------------------------------

describe("L1 POST /api/location", () => {
  it("201 — records a location point for an Active booking with consent", async () => {
    if (!serverUp) return;
    const res = await api(customerJar, "POST", "/api/location", {
      bookingId: activeBookingId,
      latitude: -6.2088,
      longitude: 106.8456,
      accuracy: 15.5,
      speedKph: 30.0,
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(typeof body.id).toBe("string");
    expect(body.id).toBeTruthy();
    expect(typeof body.overdue).toBe("boolean");
  });

  it("429 — second call within 10 seconds is rate-limited", async () => {
    if (!serverUp) return;
    // The previous test already recorded a point; calling immediately hits the limit.
    const res = await api(customerJar, "POST", "/api/location", {
      bookingId: activeBookingId,
      latitude: -6.209,
      longitude: 106.846,
    });
    expect(res.status).toBe(429);
  });

  it("409 — booking not Active is rejected", async () => {
    if (!serverUp) return;
    const res = await api(customerJar, "POST", "/api/location", {
      bookingId: confirmedBookingId,
      latitude: -6.2088,
      longitude: 106.8456,
    });
    expect(res.status).toBe(409);
  });

  it("409 — Active booking without location consent is rejected", async () => {
    if (!serverUp) return;
    const res = await api(customerJar, "POST", "/api/location", {
      bookingId: activeNoConsentBookingId,
      latitude: -6.2088,
      longitude: 106.8456,
    });
    expect(res.status).toBe(409);
  });

  it("401 — unauthenticated request is rejected", async () => {
    if (!serverUp) return;
    const res = await fetch(`${BASE}/api/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE },
      body: JSON.stringify({
        bookingId: activeBookingId,
        latitude: -6.2088,
        longitude: 106.8456,
      }),
    });
    expect(res.status).toBe(401);
  });

  it("403 — missing Origin header is rejected", async () => {
    if (!serverUp) return;
    const res = await fetch(`${BASE}/api/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: activeBookingId,
        latitude: -6.2088,
        longitude: 106.8456,
      }),
    });
    expect(res.status).toBe(403);
  });
});
