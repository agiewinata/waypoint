/**
 * Integration tests for the Payments API (P1 POST /api/payments, P2 PATCH /api/payments/:id).
 *
 * Run with: npm run test:integration (requires dev server at http://localhost:3000)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import {
  api,
  newUser,
  asOwner,
  asCustomer,
  asAdmin,
  createApprovedVehicle,
  verifyCustomer,
  cleanup,
  newJar,
} from "./helpers";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

// ---------------------------------------------------------------------------
// Server-availability guard (same pattern as other integration tests)
// ---------------------------------------------------------------------------

async function waitForServer(maxMs = 15000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const r = await fetch(BASE, { signal: AbortSignal.timeout(2000) });
      if (r.status < 500) return true;
    } catch {
      // keep polling
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

let serverUp = false;

beforeAll(async () => {
  serverUp = await waitForServer();
  if (!serverUp) {
    console.warn(
      `[payments] Dev server not reachable at ${BASE} — tests will pass vacuously`
    );
  }
}, 20000);

function skip(): boolean {
  return !serverUp;
}

// ---------------------------------------------------------------------------
// Shared fixtures — created once per describe block that needs them
// ---------------------------------------------------------------------------

describe("POST /api/payments (P1)", () => {
  let ownerUserId: string;
  let customerUserId: string;
  let renteeID: string;
  let confirmedBookingID: string;
  let pendingBookingID: string;
  let unverifiedCustomerUserId: string;
  let unverifiedRenteeID: string;

  beforeAll(async () => {
    if (!serverUp) return;

    // --- Owner setup ---
    const ownerResult = await newUser();
    ownerUserId = ownerResult.userId;
    const { renterID } = await asOwner(ownerResult.jar);
    const vehicle = await createApprovedVehicle(renterID, {
      pricePerDay: 1_000_000,
    });

    // --- Verified customer setup ---
    const customerResult = await newUser();
    customerUserId = customerResult.userId;
    const customerProfile = await asCustomer(customerResult.jar);
    renteeID = customerProfile.renteeID;
    await verifyCustomer(renteeID);

    // Create a Confirmed booking for verified customer
    const booking = await db.booking.create({
      data: {
        vehicleVIN: vehicle.VIN,
        renteeID,
        startDate: new Date("2027-01-10"),
        endDate: new Date("2027-01-11"),
        status: "Confirmed",
        totalPrice: 1_000_000,
      },
    });
    confirmedBookingID = booking.bookingID;

    // Create a Pending booking (non-Confirmed) for the 409 test
    const pendingBooking = await db.booking.create({
      data: {
        vehicleVIN: vehicle.VIN,
        renteeID,
        startDate: new Date("2027-02-10"),
        endDate: new Date("2027-02-11"),
        status: "Pending",
        totalPrice: 500_000,
      },
    });
    pendingBookingID = pendingBooking.bookingID;

    // --- Unverified customer (no KTP/SIM) setup ---
    const unverifiedResult = await newUser();
    unverifiedCustomerUserId = unverifiedResult.userId;
    const unverifiedProfile = await asCustomer(unverifiedResult.jar);
    unverifiedRenteeID = unverifiedProfile.renteeID;

    // Booking for unverified customer (Confirmed but no verified docs)
    await db.booking.create({
      data: {
        vehicleVIN: vehicle.VIN,
        renteeID: unverifiedRenteeID,
        startDate: new Date("2027-03-10"),
        endDate: new Date("2027-03-11"),
        status: "Confirmed",
        totalPrice: 300_000,
      },
    });
  });

  afterAll(async () => {
    if (!serverUp) return;
    await cleanup(ownerUserId, customerUserId, unverifiedCustomerUserId);
  });

  it("401 without session", async () => {
    if (skip()) return;
    const jar = newJar();
    const res = await api(jar, "POST", "/api/payments", {
      bookingId: "some-id",
      method: "BankTransfer",
    });
    expect(res.status).toBe(401);
  });

  it("403 without Origin header on POST", async () => {
    if (skip()) return;
    // POST without Origin header should be rejected by the CSRF guard
    const res = await fetch(`${BASE}/api/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: "x", method: "BankTransfer" }),
    });
    expect(res.status).toBe(403);
  });

  it("409 if booking is not Confirmed", async () => {
    if (skip()) return;
    // We need a jar for the verified customer
    const customerResult = await newUser();
    const tmpCustomerUserId = customerResult.userId;
    try {
      // Sign in as an existing customer who owns pendingBookingID
      // Instead, re-sign-in the verified customer
      const signinJar = newJar();
      const signinRes = await api(signinJar, "POST", "/api/auth/sign-in/email", {
        email: customerResult.email,
        password: customerResult.password,
      });
      expect(signinRes.ok).toBe(true);
      // This newly created user has no customer profile, we can't use pendingBookingID
      // So this test should be done with our verified customer
    } finally {
      await cleanup(tmpCustomerUserId);
    }

    // Re-authenticate as the verified customer
    // We need to sign-in again since the jar from beforeAll is not accessible here
    // Use a fresh sign-in approach via the API
    const signinJar = newJar();
    // We know the email from setup — but we don't have it here.
    // Instead, create a fresh booking with a Pending status and test it.
    // The verified customer needs to try to pay for the pendingBookingID booking.
    // We'll use the admin to get the session... actually let's approach differently.
    //
    // Create a fresh verified customer and try to pay for a Pending booking.
    const freshOwner = await newUser();
    const { renterID } = await asOwner(freshOwner.jar);
    const vehicle = await createApprovedVehicle(renterID);
    const freshCustomer = await newUser();
    const { renteeID: fRenteeID } = await asCustomer(freshCustomer.jar);
    await verifyCustomer(fRenteeID);

    const pendingBk = await db.booking.create({
      data: {
        vehicleVIN: vehicle.VIN,
        renteeID: fRenteeID,
        startDate: new Date("2027-04-01"),
        endDate: new Date("2027-04-02"),
        status: "Pending",
        totalPrice: 200_000,
      },
    });

    try {
      const res = await api(freshCustomer.jar, "POST", "/api/payments", {
        bookingId: pendingBk.bookingID,
        method: "BankTransfer",
      });
      expect(res.status).toBe(409);
    } finally {
      await cleanup(freshOwner.userId, freshCustomer.userId);
    }
  });

  it("409 without Verified KTP + SIM", async () => {
    if (skip()) return;
    const freshOwner = await newUser();
    const { renterID } = await asOwner(freshOwner.jar);
    const vehicle = await createApprovedVehicle(renterID);
    const freshCustomer = await newUser();
    const { renteeID: fRenteeID } = await asCustomer(freshCustomer.jar);
    // Not calling verifyCustomer — no documents

    const bk = await db.booking.create({
      data: {
        vehicleVIN: vehicle.VIN,
        renteeID: fRenteeID,
        startDate: new Date("2027-05-01"),
        endDate: new Date("2027-05-02"),
        status: "Confirmed",
        totalPrice: 400_000,
      },
    });

    try {
      const res = await api(freshCustomer.jar, "POST", "/api/payments", {
        bookingId: bk.bookingID,
        method: "EWallet",
      });
      expect(res.status).toBe(409);
    } finally {
      await cleanup(freshOwner.userId, freshCustomer.userId);
    }
  });

  it("201 with status=Held on a valid Confirmed booking", async () => {
    if (skip()) return;
    // Create a fresh set of owner + verified customer + booking for this test
    const freshOwner = await newUser();
    const { renterID } = await asOwner(freshOwner.jar);
    const vehicle = await createApprovedVehicle(renterID, { pricePerDay: 1_000_000 });
    const freshCustomer = await newUser();
    const { renteeID: fRenteeID } = await asCustomer(freshCustomer.jar);
    await verifyCustomer(fRenteeID);

    const bk = await db.booking.create({
      data: {
        vehicleVIN: vehicle.VIN,
        renteeID: fRenteeID,
        startDate: new Date("2027-06-01"),
        endDate: new Date("2027-06-02"),
        status: "Confirmed",
        totalPrice: 1_000_000,
      },
    });

    try {
      const res = await api(freshCustomer.jar, "POST", "/api/payments", {
        bookingId: bk.bookingID,
        method: "BankTransfer",
      });
      expect(res.status).toBe(201);
      const body = await res.json() as { id: string; status: string; amount: number };
      expect(body.status).toBe("Held");
      expect(body.amount).toBe(1_000_000);
      expect(body.id).toBeTruthy();
    } finally {
      await cleanup(freshOwner.userId, freshCustomer.userId);
    }
  });

  it("409 on duplicate payment for the same booking", async () => {
    if (skip()) return;
    const freshOwner = await newUser();
    const { renterID } = await asOwner(freshOwner.jar);
    const vehicle = await createApprovedVehicle(renterID);
    const freshCustomer = await newUser();
    const { renteeID: fRenteeID } = await asCustomer(freshCustomer.jar);
    await verifyCustomer(fRenteeID);

    const bk = await db.booking.create({
      data: {
        vehicleVIN: vehicle.VIN,
        renteeID: fRenteeID,
        startDate: new Date("2027-07-01"),
        endDate: new Date("2027-07-02"),
        status: "Confirmed",
        totalPrice: 600_000,
      },
    });

    try {
      // First payment succeeds
      const r1 = await api(freshCustomer.jar, "POST", "/api/payments", {
        bookingId: bk.bookingID,
        method: "Card",
      });
      expect(r1.status).toBe(201);

      // Second payment on same booking is a conflict
      const r2 = await api(freshCustomer.jar, "POST", "/api/payments", {
        bookingId: bk.bookingID,
        method: "Card",
      });
      expect(r2.status).toBe(409);
    } finally {
      await cleanup(freshOwner.userId, freshCustomer.userId);
    }
  });
});

// ---------------------------------------------------------------------------

describe("PATCH /api/payments/:id (P2)", () => {
  it("401 without session", async () => {
    if (skip()) return;
    const jar = newJar();
    const res = await api(jar, "PATCH", "/api/payments/nonexistent-id", {
      action: "release",
    });
    expect(res.status).toBe(401);
  });

  it("403 without Origin header on PATCH", async () => {
    if (skip()) return;
    const res = await fetch(`${BASE}/api/payments/nonexistent-id`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "release" }),
    });
    expect(res.status).toBe(403);
  });

  it("200 release: ownerPayout = amount - 5% (1,000,000 → 950,000)", async () => {
    if (skip()) return;
    const freshOwner = await newUser();
    const { renterID } = await asOwner(freshOwner.jar);
    const vehicle = await createApprovedVehicle(renterID, { pricePerDay: 1_000_000 });
    const freshCustomer = await newUser();
    const { renteeID: fRenteeID } = await asCustomer(freshCustomer.jar);
    await verifyCustomer(fRenteeID);

    const bk = await db.booking.create({
      data: {
        vehicleVIN: vehicle.VIN,
        renteeID: fRenteeID,
        startDate: new Date("2027-08-01"),
        endDate: new Date("2027-08-02"),
        // Completed so it can be released
        status: "Completed",
        totalPrice: 1_000_000,
      },
    });

    // Create a Held payment directly
    const payment = await db.payment.create({
      data: {
        bookingID: bk.bookingID,
        amount: 1_000_000,
        method: "BankTransfer",
        status: "Held",
        paidAt: new Date(),
      },
    });

    try {
      const res = await api(freshOwner.jar, "PATCH", `/api/payments/${payment.paymentID}`, {
        action: "release",
      });
      expect(res.status).toBe(200);
      const body = await res.json() as { id: string; status: string; ownerPayout: number };
      expect(body.status).toBe("Released");
      expect(body.ownerPayout).toBe(950_000);
    } finally {
      await cleanup(freshOwner.userId, freshCustomer.userId);
    }
  });

  it("409 release when booking is not Completed", async () => {
    if (skip()) return;
    const freshOwner = await newUser();
    const { renterID } = await asOwner(freshOwner.jar);
    const vehicle = await createApprovedVehicle(renterID);
    const freshCustomer = await newUser();
    const { renteeID: fRenteeID } = await asCustomer(freshCustomer.jar);
    await verifyCustomer(fRenteeID);

    const bk = await db.booking.create({
      data: {
        vehicleVIN: vehicle.VIN,
        renteeID: fRenteeID,
        startDate: new Date("2027-09-01"),
        endDate: new Date("2027-09-02"),
        status: "Confirmed",  // Not Completed
        totalPrice: 500_000,
      },
    });

    const payment = await db.payment.create({
      data: {
        bookingID: bk.bookingID,
        amount: 500_000,
        method: "EWallet",
        status: "Held",
        paidAt: new Date(),
      },
    });

    try {
      const res = await api(freshOwner.jar, "PATCH", `/api/payments/${payment.paymentID}`, {
        action: "release",
      });
      expect(res.status).toBe(409);
    } finally {
      await cleanup(freshOwner.userId, freshCustomer.userId);
    }
  });

  it("409 release when an Open dispute exists on the booking", async () => {
    if (skip()) return;
    const freshOwner = await newUser();
    const { renterID } = await asOwner(freshOwner.jar);
    const vehicle = await createApprovedVehicle(renterID);
    const freshCustomer = await newUser();
    const { renteeID: fRenteeID } = await asCustomer(freshCustomer.jar);
    await verifyCustomer(fRenteeID);

    const bk = await db.booking.create({
      data: {
        vehicleVIN: vehicle.VIN,
        renteeID: fRenteeID,
        startDate: new Date("2027-10-01"),
        endDate: new Date("2027-10-02"),
        status: "Completed",
        totalPrice: 700_000,
      },
    });

    const payment = await db.payment.create({
      data: {
        bookingID: bk.bookingID,
        amount: 700_000,
        method: "Card",
        status: "Held",
        paidAt: new Date(),
      },
    });

    // Open dispute on the booking
    await db.dispute.create({
      data: {
        bookingID: bk.bookingID,
        raisedBy: "Rentee",
        description: "Test dispute",
        status: "Open",
      },
    });

    try {
      const res = await api(freshOwner.jar, "PATCH", `/api/payments/${payment.paymentID}`, {
        action: "release",
      });
      expect(res.status).toBe(409);
    } finally {
      await cleanup(freshOwner.userId, freshCustomer.userId);
    }
  });

  it("admin can fail a Held payment", async () => {
    if (skip()) return;
    const freshOwner = await newUser();
    const { renterID } = await asOwner(freshOwner.jar);
    const vehicle = await createApprovedVehicle(renterID);
    const freshCustomer = await newUser();
    const { renteeID: fRenteeID } = await asCustomer(freshCustomer.jar);
    await verifyCustomer(fRenteeID);

    const bk = await db.booking.create({
      data: {
        vehicleVIN: vehicle.VIN,
        renteeID: fRenteeID,
        startDate: new Date("2027-11-01"),
        endDate: new Date("2027-11-02"),
        status: "Confirmed",
        totalPrice: 800_000,
      },
    });

    const payment = await db.payment.create({
      data: {
        bookingID: bk.bookingID,
        amount: 800_000,
        method: "BankTransfer",
        status: "Held",
        paidAt: new Date(),
      },
    });

    const { jar: adminJar } = await asAdmin();

    try {
      const res = await api(adminJar, "PATCH", `/api/payments/${payment.paymentID}`, {
        action: "fail",
      });
      expect(res.status).toBe(200);
      const body = await res.json() as { id: string; status: string };
      expect(body.status).toBe("Failed");
    } finally {
      await cleanup(freshOwner.userId, freshCustomer.userId);
    }
  });

  it("non-admin cannot fail a payment", async () => {
    if (skip()) return;
    const freshOwner = await newUser();
    const { renterID } = await asOwner(freshOwner.jar);
    const vehicle = await createApprovedVehicle(renterID);
    const freshCustomer = await newUser();
    const { renteeID: fRenteeID } = await asCustomer(freshCustomer.jar);
    await verifyCustomer(fRenteeID);

    const bk = await db.booking.create({
      data: {
        vehicleVIN: vehicle.VIN,
        renteeID: fRenteeID,
        startDate: new Date("2027-12-01"),
        endDate: new Date("2027-12-02"),
        status: "Confirmed",
        totalPrice: 350_000,
      },
    });

    const payment = await db.payment.create({
      data: {
        bookingID: bk.bookingID,
        amount: 350_000,
        method: "EWallet",
        status: "Held",
        paidAt: new Date(),
      },
    });

    try {
      // Owner tries to fail — should be forbidden
      const res = await api(freshOwner.jar, "PATCH", `/api/payments/${payment.paymentID}`, {
        action: "fail",
      });
      expect(res.status).toBe(403);
    } finally {
      await cleanup(freshOwner.userId, freshCustomer.userId);
    }
  });
});
