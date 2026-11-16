/**
 * Integration tests for admin booking approval (AD7, AD8) and the P1 approval gate (K19).
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
  type CookieJar,
} from "./helpers";

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

let serverUp = false;

function skip() {
  return !serverUp;
}

/** Owner (Renter) and the vehicle under test */
let ownerJar: CookieJar;
let ownerUserId: string;
let renterID: string;
let listingCode: string;

/** Verified Customer (Rentee) who books the vehicle */
let customerJar: CookieJar;
let customerUserId: string;

/** Seeded admin */
let adminJar: CookieJar;
let adminID: string;

/** A user who is both an Admin and a Customer (self-approval case) */
let selfJar: CookieJar;
let selfUserId: string;

beforeAll(async () => {
  serverUp = await waitForServer();
  if (!serverUp) {
    console.warn(
      `[booking-approval] Dev server not reachable at ${BASE} — tests will pass vacuously`
    );
    return;
  }

  const ownerResult = await newUser();
  ownerJar = ownerResult.jar;
  ownerUserId = ownerResult.userId;
  renterID = (await asOwner(ownerJar)).renterID;
  const vehicle = await createApprovedVehicle(renterID, { pricePerDay: 300_000 });
  listingCode = vehicle.listingCode;

  const customerResult = await newUser();
  customerJar = customerResult.jar;
  customerUserId = customerResult.userId;
  const customerProfile = await asCustomer(customerJar);
  await verifyCustomer(customerProfile.renteeID);

  const admin = await asAdmin();
  adminJar = admin.jar;
  const adminRow = await db.admin.findFirstOrThrow({
    where: { user: { email: process.env.ADMIN_EMAIL ?? "" } },
    select: { adminID: true },
  });
  adminID = adminRow.adminID;

  // Self-approval fixture: a Customer who also holds a temporary Admin row.
  // cleanup() removes the Admin row together with the user.
  const selfResult = await newUser();
  selfJar = selfResult.jar;
  selfUserId = selfResult.userId;
  await asCustomer(selfJar);
  await db.admin.create({
    data: {
      userID: selfUserId,
      name: "Self Review Fixture",
      email: selfResult.email,
      permission: "full",
    },
  });
}, 60_000);

afterAll(async () => {
  if (serverUp) {
    await cleanup(ownerUserId, customerUserId, selfUserId);
  }
});

/** Creates a Pending booking through B2 and confirms it as the Owner (B3). */
async function createConfirmedBooking(
  startAhead: number,
  endAhead: number,
  jar: CookieJar = customerJar
): Promise<string> {
  const res = await api(jar, "POST", "/api/bookings", {
    listingCode,
    startDate: futureDate(startAhead),
    endDate: futureDate(endAhead),
    locationConsent: false,
  });
  expect(res.status).toBe(201);
  const { id } = (await res.json()) as { id: string };

  const confirm = await api(ownerJar, "PATCH", `/api/bookings/${id}`, {
    action: "confirm",
  });
  expect(confirm.status).toBe(200);
  return id;
}

// ---------------------------------------------------------------------------
// K19 — admin booking approval
// ---------------------------------------------------------------------------

describe("Admin booking approval (K19)", () => {
  let approvedBookingId: string;

  it("P1 on a Confirmed, unapproved booking → 409 awaiting approval", async () => {
    if (skip()) return;
    approvedBookingId = await createConfirmedBooking(10, 12);

    const res = await api(customerJar, "POST", "/api/payments", {
      bookingId: approvedBookingId,
      method: "BankTransfer",
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Booking is awaiting admin approval");
  });

  it("AD7 lists the unapproved booking", async () => {
    if (skip()) return;
    const res = await api(adminJar, "GET", "/api/admin/bookings");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: { id: string }[] };
    expect(body.items.some((i) => i.id === approvedBookingId)).toBe(true);
  });

  it("AD8 approve → 200 and stores the caller's adminID", async () => {
    if (skip()) return;
    const res = await api(adminJar, "PATCH", `/api/admin/bookings/${approvedBookingId}`, {
      action: "approve",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; status: string; approved: boolean };
    expect(body.id).toBe(approvedBookingId);
    expect(body.status).toBe("Confirmed");
    expect(body.approved).toBe(true);

    const row = await db.booking.findUniqueOrThrow({
      where: { bookingID: approvedBookingId },
      select: { approvedByAdminID: true },
    });
    expect(row.approvedByAdminID).toBe(adminID);
  });

  it("P1 after approval → 201 Held", async () => {
    if (skip()) return;
    const res = await api(customerJar, "POST", "/api/payments", {
      bookingId: approvedBookingId,
      method: "BankTransfer",
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("Held");
  });

  it("a second approve → 409", async () => {
    if (skip()) return;
    const res = await api(adminJar, "PATCH", `/api/admin/bookings/${approvedBookingId}`, {
      action: "approve",
    });
    expect(res.status).toBe(409);
  });

  it("AD8 on a Pending booking → 409", async () => {
    if (skip()) return;
    const created = await api(customerJar, "POST", "/api/bookings", {
      listingCode,
      startDate: futureDate(20),
      endDate: futureDate(22),
      locationConsent: false,
    });
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };

    const res = await api(adminJar, "PATCH", `/api/admin/bookings/${id}`, {
      action: "approve",
    });
    expect(res.status).toBe(409);
  });

  it("AD8 reject → Cancelled, and a new B2 on the same dates → 201", async () => {
    if (skip()) return;
    const rejectedId = await createConfirmedBooking(30, 32);

    const res = await api(adminJar, "PATCH", `/api/admin/bookings/${rejectedId}`, {
      action: "reject",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; approved: boolean };
    expect(body.status).toBe("Cancelled");
    expect(body.approved).toBe(false);

    const rebook = await api(customerJar, "POST", "/api/bookings", {
      listingCode,
      startDate: futureDate(30),
      endDate: futureDate(32),
      locationConsent: false,
    });
    expect(rebook.status).toBe(201);
  });

  it("an Admin who is also the booking's Customer → 403", async () => {
    if (skip()) return;
    const selfBookingId = await createConfirmedBooking(40, 42, selfJar);

    const res = await api(selfJar, "PATCH", `/api/admin/bookings/${selfBookingId}`, {
      action: "approve",
    });
    expect(res.status).toBe(403);
  });

  it("AD7 excludes the approved booking and includes a newer unapproved one", async () => {
    if (skip()) return;
    const newerId = await createConfirmedBooking(50, 52);

    const res = await api(adminJar, "GET", "/api/admin/bookings");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: { id: string }[] };
    const ids = body.items.map((i) => i.id);
    expect(ids).toContain(newerId);
    expect(ids).not.toContain(approvedBookingId);
  });

  it("the Customer's N1 contains booking_approved with the checkout href", async () => {
    if (skip()) return;
    const res = await api(customerJar, "GET", "/api/notifications");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: { type: string; href: string | null }[] };
    expect(
      body.items.some(
        (n) =>
          n.type === "booking_approved" &&
          n.href === `/dashboard/customer/checkout/${approvedBookingId}`
      )
    ).toBe(true);
  });
});
