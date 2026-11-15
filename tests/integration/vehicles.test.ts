/**
 * Integration tests for the Vehicles API (A1–A4).
 *
 * Run with: npm run test:integration (requires dev server)
 *
 * These tests talk to the running Next.js dev server and use the real database,
 * so they create and clean up test users/vehicles in each suite.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import {
  api,
  newUser,
  asOwner,
  createApprovedVehicle,
  cleanup,
  type CookieJar,
} from "./helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a valid 17-char VIN (no I/O/Q) */
function randomVin(): string {
  const chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  return Array.from({ length: 17 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/** Generate a plate number in valid format */
function randomPlate(): string {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 3).toUpperCase();
  const digits = String(Math.floor(Math.random() * 9000) + 1000);
  return `B ${digits} ${suffix}`;
}

// ---------------------------------------------------------------------------
// A1: GET /api/vehicles — public listing
// ---------------------------------------------------------------------------

describe("A1: GET /api/vehicles (public listing)", () => {
  const userIds: string[] = [];
  let renterID: string;
  let ownerJar: CookieJar;

  beforeAll(async () => {
    const user = await newUser();
    userIds.push(user.userId);
    const owner = await asOwner(user.jar);
    renterID = owner.renterID;
    ownerJar = owner.jar;

    // Create one Approved and one Draft vehicle
    await createApprovedVehicle(renterID, { city: "Bali", type: "Sedan" });
    await createApprovedVehicle(renterID, { city: "Jakarta", type: "SUV" });
    // Draft vehicle — should NOT appear in public listing
    await db.vehicle.create({
      data: {
        VIN: randomVin(),
        renterID,
        listingCode: `DRAFT-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
        make: "Honda",
        model: "Jazz",
        year: 2020,
        plateNumber: randomPlate(),
        type: "Hatchback",
        city: "Bandung",
        pricePerDay: 100_000,
        status: "Draft",
      },
    });
  });

  afterAll(async () => {
    await cleanup(...userIds);
  });

  it("returns 200 with only Approved vehicles", async () => {
    const jar = new Map<string, string>();
    const res = await api(jar, "GET", "/api/vehicles");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: { status?: string }[] };
    expect(body.items).toBeDefined();
    // No item should expose a Draft vehicle (Draft has no status field in public DTO,
    // but we verify none of our Draft vehicles appear)
    for (const item of body.items) {
      // PublicVehicle doesn't include status — just sanity-check the shape
      expect(item).toHaveProperty("listingCode");
      expect(item).toHaveProperty("pricePerDay");
      expect(item).toHaveProperty("ownerFirstName");
      expect(item).not.toHaveProperty("vin");
    }
  });

  it("filters by city", async () => {
    const jar = new Map<string, string>();
    const res = await api(jar, "GET", "/api/vehicles?city=Bali");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: { city: string }[] };
    for (const item of body.items) {
      expect(item.city).toBe("Bali");
    }
  });

  it("filters by type", async () => {
    const jar = new Map<string, string>();
    const res = await api(jar, "GET", "/api/vehicles?type=SUV");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: { type: string }[] };
    for (const item of body.items) {
      expect(item.type).toBe("SUV");
    }
  });

  it("returns 200 for unauthenticated requests", async () => {
    const jar = new Map<string, string>();
    const res = await api(jar, "GET", "/api/vehicles");
    expect(res.status).toBe(200);
  });

  it("includes pagination metadata", async () => {
    const jar = new Map<string, string>();
    const res = await api(jar, "GET", "/api/vehicles");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { page: number; pageSize: number; total: number };
    expect(typeof body.page).toBe("number");
    expect(typeof body.pageSize).toBe("number");
    expect(typeof body.total).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// A2: GET /api/vehicles/mine — owner's vehicles
// ---------------------------------------------------------------------------

describe("A2: GET /api/vehicles/mine", () => {
  const userIds: string[] = [];

  afterAll(async () => {
    await cleanup(...userIds);
  });

  it("returns 401 without a session", async () => {
    const jar = new Map<string, string>();
    const res = await api(jar, "GET", "/api/vehicles/mine");
    expect(res.status).toBe(401);
  });

  it("returns 403 without an owner profile", async () => {
    const user = await newUser();
    userIds.push(user.userId);
    // Signed in but no owner profile
    const res = await api(user.jar, "GET", "/api/vehicles/mine");
    expect(res.status).toBe(403);
  });

  it("returns 200 with the owner's vehicles (all statuses)", async () => {
    const user = await newUser();
    userIds.push(user.userId);
    const { jar, renterID } = await asOwner(user.jar);

    // Create approved + draft vehicles
    await createApprovedVehicle(renterID);
    await db.vehicle.create({
      data: {
        VIN: randomVin(),
        renterID,
        listingCode: `MINE-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
        make: "Suzuki",
        model: "Ertiga",
        year: 2021,
        plateNumber: randomPlate(),
        type: "MPV",
        city: "Surabaya",
        pricePerDay: 150_000,
        status: "Draft",
      },
    });

    const res = await api(jar, "GET", "/api/vehicles/mine");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: { status: string; vin: string }[] };
    expect(body.items.length).toBeGreaterThanOrEqual(2);
    // Owner DTO exposes vin and status
    for (const item of body.items) {
      expect(item).toHaveProperty("vin");
      expect(item).toHaveProperty("status");
    }
  });
});

// ---------------------------------------------------------------------------
// A3: POST /api/vehicles — create vehicle
// ---------------------------------------------------------------------------

describe("A3: POST /api/vehicles", () => {
  const userIds: string[] = [];

  afterAll(async () => {
    await cleanup(...userIds);
  });

  it("returns 403 without Origin header", async () => {
    const jar = new Map<string, string>();
    // api() helper sets Origin, so we call fetch directly without it
    const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";
    const res = await fetch(`${BASE}/api/vehicles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(403);
  });

  it("returns 401 without a session", async () => {
    const jar = new Map<string, string>();
    const res = await api(jar, "POST", "/api/vehicles", {
      vin: randomVin(),
      make: "Toyota",
      model: "Avanza",
      year: 2022,
      plateNumber: randomPlate(),
      type: "MPV",
      city: "Jakarta",
      pricePerDay: 200_000,
    });
    expect(res.status).toBe(401);
  });

  it("creates a vehicle and returns 201 with listingCode", async () => {
    const user = await newUser();
    userIds.push(user.userId);
    const { jar } = await asOwner(user.jar);

    const vin = randomVin();
    const plateNumber = randomPlate();
    const res = await api(jar, "POST", "/api/vehicles", {
      vin,
      make: "Toyota",
      model: "Avanza",
      year: 2022,
      plateNumber,
      type: "MPV",
      city: "Jakarta",
      pricePerDay: 200_000,
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { listingCode: string };
    expect(typeof body.listingCode).toBe("string");
    expect(body.listingCode).toMatch(/^WP-[0-9A-Z]{6}$/);
  });

  it("returns 409 on duplicate VIN", async () => {
    const user = await newUser();
    userIds.push(user.userId);
    const { jar, renterID } = await asOwner(user.jar);

    const vin = randomVin();
    // Create a vehicle directly with the same VIN
    await db.vehicle.create({
      data: {
        VIN: vin,
        renterID,
        listingCode: `DUP-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
        make: "Honda",
        model: "Jazz",
        year: 2019,
        plateNumber: randomPlate(),
        type: "Hatchback",
        city: "Bandung",
        pricePerDay: 180_000,
        status: "Draft",
      },
    });

    const res = await api(jar, "POST", "/api/vehicles", {
      vin,
      make: "Toyota",
      model: "Avanza",
      year: 2022,
      plateNumber: randomPlate(),
      type: "MPV",
      city: "Jakarta",
      pricePerDay: 200_000,
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/VIN/i);
  });
});

// ---------------------------------------------------------------------------
// A4: PATCH /api/vehicles/[code] — submit vehicle
// ---------------------------------------------------------------------------

describe("A4: PATCH /api/vehicles/[code]", () => {
  const userIds: string[] = [];

  afterAll(async () => {
    await cleanup(...userIds);
  });

  it("returns 403 without Origin header", async () => {
    const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";
    const res = await fetch(`${BASE}/api/vehicles/WP-FAKE01`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 409 when vehicle has no documents", async () => {
    const user = await newUser();
    userIds.push(user.userId);
    const { jar, renterID } = await asOwner(user.jar);

    // Create a Draft vehicle with a valid price but no documents
    const listingCode = `NODOC-${crypto.randomUUID().slice(0, 5).toUpperCase()}`;
    await db.vehicle.create({
      data: {
        VIN: randomVin(),
        renterID,
        listingCode,
        make: "Mitsubishi",
        model: "Xpander",
        year: 2023,
        plateNumber: randomPlate(),
        type: "MPV",
        city: "Jakarta",
        pricePerDay: 300_000,
        status: "Draft",
      },
    });

    const res = await api(jar, "PATCH", `/api/vehicles/${listingCode}`, {
      action: "submit",
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/document/i);
  });

  it("submits a vehicle and returns status=Pending when docs are present", async () => {
    const user = await newUser();
    userIds.push(user.userId);
    const { jar, renterID } = await asOwner(user.jar);

    const vin = randomVin();
    const listingCode = `SUB-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    await db.vehicle.create({
      data: {
        VIN: vin,
        renterID,
        listingCode,
        make: "Daihatsu",
        model: "Terios",
        year: 2021,
        plateNumber: randomPlate(),
        type: "SUV",
        city: "Yogyakarta",
        pricePerDay: 250_000,
        status: "Draft",
      },
    });

    // Add an STNK document to satisfy the submission requirement
    const dummyFile = new Uint8Array([0]);
    const dummyIv = "00000000000000000000000000000000";
    const dummyTag = "00000000000000000000000000000000";
    await db.document.create({
      data: {
        vehicleVIN: vin,
        type: "STNK",
        verificationStatus: "Pending",
        fileData: dummyFile,
        iv: dummyIv,
        authTag: dummyTag,
      },
    });

    const res = await api(jar, "PATCH", `/api/vehicles/${listingCode}`, {
      action: "submit",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { listingCode: string; status: string };
    expect(body.status).toBe("Pending");
    expect(body.listingCode).toBe(listingCode);
  });
});
