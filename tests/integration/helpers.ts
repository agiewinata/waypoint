/**
 * Shared helpers for integration tests.
 *
 * All helpers assume the dev server is running at TEST_BASE_URL
 * (defaults to http://localhost:3000).
 *
 * Cookie handling mirrors the behaviour of a real browser: cookies received
 * in Set-Cookie are stored in a Map and replayed in the Cookie header on
 * subsequent requests.
 */

import crypto from "node:crypto";
import { db } from "@/lib/db";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

// ---------------------------------------------------------------------------
// Cookie jar
// ---------------------------------------------------------------------------

export type CookieJar = Map<string, string>;

/** Creates a new, empty cookie jar. */
export function newJar(): CookieJar {
  return new Map<string, string>();
}

function updateJar(jar: CookieJar, setCookie: string | null): void {
  if (!setCookie) return;
  // Set-Cookie can contain commas inside quoted values / dates, so we split on
  // ", " only when it's followed by a known cookie attribute pattern or a new
  // key=value pair. The simplest safe split is on each line; browsers receive
  // one Set-Cookie header per cookie but fetch collapses them with ", ".
  // We split on ", " boundaries that are immediately followed by a word char
  // (new cookie name) to avoid splitting inside "expires=Wed, 01 Jan 2025".
  const parts = setCookie.split(/,\s*(?=[^\s;,=]+=)/);
  for (const part of parts) {
    const [kv] = part.trim().split(";");
    const eqIdx = kv.indexOf("=");
    if (eqIdx === -1) continue;
    const k = kv.slice(0, eqIdx).trim();
    const v = kv.slice(eqIdx + 1).trim();
    if (k) jar.set(k, v);
  }
}

function cookieHeader(jar: CookieJar): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

// ---------------------------------------------------------------------------
// api() — the primary HTTP helper
// ---------------------------------------------------------------------------

/**
 * Makes an HTTP request with the Origin header set and cookies from the jar.
 * Updates the jar with any Set-Cookie headers from the response.
 */
export async function api(
  jar: CookieJar,
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  const headers: Record<string, string> = {
    Origin: BASE,
    Cookie: cookieHeader(jar),
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  updateJar(jar, res.headers.get("set-cookie"));
  return res;
}

// ---------------------------------------------------------------------------
// newUser() — sign up a fresh test user
// ---------------------------------------------------------------------------

export interface NewUserResult {
  jar: CookieJar;
  email: string;
  password: string;
  userId: string;
}

export async function newUser(
  overrides: Partial<{ email: string; password: string; name: string }> = {}
): Promise<NewUserResult> {
  const jar = newJar();
  const email =
    overrides.email ?? `test-${crypto.randomUUID()}@waypoint.test`;
  const password = overrides.password ?? "testpassword123";
  const name = overrides.name ?? "Test User";

  const res = await api(jar, "POST", "/api/auth/sign-up/email", {
    email,
    password,
    name,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`newUser: sign-up failed ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    user?: { id?: string };
    id?: string;
  };
  const userId = data.user?.id ?? data.id ?? "";
  if (!userId) {
    throw new Error("newUser: could not extract userId from sign-up response");
  }

  return { jar, email, password, userId };
}

// ---------------------------------------------------------------------------
// setupProfile() — complete the onboarding step for a signed-in user
// ---------------------------------------------------------------------------

export async function setupProfile(jar: CookieJar): Promise<void> {
  const suffix = crypto.randomUUID().slice(0, 8);
  const res = await api(jar, "POST", "/api/onboarding", {
    name: `Test User ${suffix}`,
    phone: "+6281234567890",
    address: `Jl. Test No. ${suffix}`,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`setupProfile: onboarding failed ${res.status}: ${text}`);
  }
}

// ---------------------------------------------------------------------------
// asOwner() — enable the listing capability for a signed-in user
// ---------------------------------------------------------------------------

export interface AsOwnerResult {
  jar: CookieJar;
  renterID: string;
}

export async function asOwner(jar: CookieJar): Promise<AsOwnerResult> {
  await setupProfile(jar);

  const res = await api(jar, "POST", "/api/profile/enable-listing", {});

  if (res.status !== 201 && res.status !== 200) {
    const text = await res.text();
    throw new Error(`asOwner: enable-listing failed ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { id?: string };
  // If 200 (already exists), look up the renterID from DB via the user's cookie session
  const renterID = data.id ?? "";
  return { jar, renterID };
}

// ---------------------------------------------------------------------------
// asCustomer() — enable the renting capability for a signed-in user
// ---------------------------------------------------------------------------

export interface AsCustomerResult {
  jar: CookieJar;
  renteeID: string;
}

export async function asCustomer(jar: CookieJar): Promise<AsCustomerResult> {
  await setupProfile(jar);

  const res = await api(jar, "POST", "/api/profile/enable-renting", {});

  if (res.status !== 201 && res.status !== 200) {
    const text = await res.text();
    throw new Error(`asCustomer: enable-renting failed ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { id?: string };
  const renteeID = data.id ?? "";
  return { jar, renteeID };
}

// ---------------------------------------------------------------------------
// asAdmin() — sign in as the seeded admin user
// ---------------------------------------------------------------------------

export interface AsAdminResult {
  jar: CookieJar;
}

export async function asAdmin(): Promise<AsAdminResult> {
  const jar = newJar();
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("asAdmin: ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
  }

  const res = await api(jar, "POST", "/api/auth/sign-in/email", {
    email,
    password,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`asAdmin: sign-in failed ${res.status}: ${text}`);
  }

  return { jar };
}

// ---------------------------------------------------------------------------
// DB fixtures — create test data directly via Prisma (faster than API calls)
// ---------------------------------------------------------------------------

/** Creates a Vehicle with status=Approved and all required fields populated. */
export async function createApprovedVehicle(
  renterID: string,
  overrides: Partial<{
    make: string;
    model: string;
    year: number;
    type: "Sedan" | "SUV" | "MPV" | "Hatchback" | "Pickup" | "Motorcycle";
    city: string;
    pricePerDay: number;
  }> = {}
) {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  // VIN is exactly 17 alphanumeric characters
  const vin = `WP${suffix}TEST00001`.slice(0, 17).padEnd(17, "0");
  const plateNumber = `B ${suffix.slice(0, 4)} TEST`;
  const listingCode = `LST-${suffix}`;

  return db.vehicle.create({
    data: {
      VIN: vin,
      renterID,
      listingCode,
      make: overrides.make ?? "Toyota",
      model: overrides.model ?? "Avanza",
      year: overrides.year ?? 2022,
      plateNumber,
      type: overrides.type ?? "MPV",
      city: overrides.city ?? "Jakarta",
      pricePerDay: overrides.pricePerDay ?? 200_000,
      status: "Approved",
    },
  });
}

/** Marks a Rentee as Verified and upserts their KTP + SIM documents. */
export async function verifyCustomer(renteeID: string): Promise<void> {
  // Dummy encrypted file data (single zero byte) — just enough to satisfy
  // the NOT NULL constraint on fileData
  const dummyFile = new Uint8Array([0]);
  const dummyIv = "00000000000000000000000000000000";
  const dummyTag = "00000000000000000000000000000000";

  await db.$transaction(async (tx) => {
    await tx.rentee.update({
      where: { renteeID },
      data: { verificationStatus: "Verified" },
    });

    // Upsert KTP: delete existing then create (simpler than a true upsert here)
    await tx.document.deleteMany({
      where: { renteeID, type: { in: ["KTP", "SIM"] } },
    });

    await tx.document.createMany({
      data: [
        {
          renteeID,
          type: "KTP",
          verificationStatus: "Verified",
          verifiedAt: new Date(),
          fileData: dummyFile,
          iv: dummyIv,
          authTag: dummyTag,
        },
        {
          renteeID,
          type: "SIM",
          verificationStatus: "Verified",
          verifiedAt: new Date(),
          fileData: dummyFile,
          iv: dummyIv,
          authTag: dummyTag,
        },
      ],
    });
  });
}

// ---------------------------------------------------------------------------
// cleanup() — delete test users (and all related data) by user ID
// ---------------------------------------------------------------------------

/**
 * Deletes specific test users and all their related data in FK-safe order.
 */
export async function cleanup(...userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;

  const renters = await db.renter.findMany({
    where: { userID: { in: userIds } },
    select: { renterID: true },
  });
  const renterIDs = renters.map((r) => r.renterID);

  const rentees = await db.rentee.findMany({
    where: { userID: { in: userIds } },
    select: { renteeID: true },
  });
  const renteeIDs = rentees.map((r) => r.renteeID);

  // Find vehicles owned by these renters
  const vehicles = await db.vehicle.findMany({
    where: { renterID: { in: renterIDs } },
    select: { VIN: true },
  });
  const vins = vehicles.map((v) => v.VIN);

  // Find bookings for these vehicles or rentees
  const bookings = await db.booking.findMany({
    where: {
      OR: [
        { vehicleVIN: { in: vins } },
        { renteeID: { in: renteeIDs } },
      ],
    },
    select: { bookingID: true },
  });
  const bookingIDs = bookings.map((b) => b.bookingID);

  await db.$transaction(async (tx) => {
    // Delete leaf tables first
    if (bookingIDs.length > 0) {
      await tx.payment.deleteMany({ where: { bookingID: { in: bookingIDs } } });
      await tx.locationLog.deleteMany({ where: { bookingID: { in: bookingIDs } } });
      await tx.dispute.deleteMany({ where: { bookingID: { in: bookingIDs } } });
      await tx.booking.deleteMany({ where: { bookingID: { in: bookingIDs } } });
    }
    if (vins.length > 0) {
      await tx.document.deleteMany({ where: { vehicleVIN: { in: vins } } });
      await tx.vehicle.deleteMany({ where: { VIN: { in: vins } } });
    }
    if (renterIDs.length > 0) {
      await tx.document.deleteMany({ where: { renterID: { in: renterIDs } } });
      await tx.renter.deleteMany({ where: { renterID: { in: renterIDs } } });
    }
    if (renteeIDs.length > 0) {
      await tx.document.deleteMany({ where: { renteeID: { in: renteeIDs } } });
      await tx.rentee.deleteMany({ where: { renteeID: { in: renteeIDs } } });
    }
    await tx.admin.deleteMany({ where: { userID: { in: userIds } } });
    // User delete cascades Session, Account, Notification
    await tx.user.deleteMany({ where: { id: { in: userIds } } });
  });
}

/**
 * Deletes all test users (email ending with @waypoint.test) and their data.
 */
export async function cleanupAll(): Promise<void> {
  const testUsers = await db.user.findMany({
    where: { email: { endsWith: "@waypoint.test" } },
    select: { id: true },
  });
  const ids = testUsers.map((u) => u.id);
  if (ids.length > 0) await cleanup(...ids);
}
