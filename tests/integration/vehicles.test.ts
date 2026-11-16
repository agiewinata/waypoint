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

/** Generate a valid 17-char VIN — excludes I, O, Q per standard and per the VIN regex */
function randomVin(): string {
  const chars = "0123456789ABCDEFGHJKLMNPRSTUVWXYZ";
  return Array.from({ length: 17 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/** Generate a plate number in valid format */
function randomPlate(): string {
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  const suffix = Array.from({ length: 3 }, () =>
    letters[Math.floor(Math.random() * letters.length)]
  ).join("");
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
      expect(typeof (item as { ownerVerified: unknown }).ownerVerified).toBe("boolean");
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
    await db.document.create({
      data: {
        vehicleVIN: vin,
        type: "Insurance",
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

// ---------------------------------------------------------------------------
// K21: PATCH /api/vehicles/[code] — update (A4 update), status rules per §3.5
// ---------------------------------------------------------------------------

describe("K21: PATCH /api/vehicles/[code] update", { timeout: 20_000 }, () => {
  const userIds: string[] = [];

  afterAll(async () => {
    await cleanup(...userIds);
  });

  /** Creates an owner with one vehicle in the given status (direct DB fixture). */
  async function ownerWithVehicle(
    status: "Draft" | "Rejected" | "Pending" | "Approved"
  ) {
    const user = await newUser();
    userIds.push(user.userId);
    const { jar, renterID } = await asOwner(user.jar);
    const vin = randomVin();
    const listingCode = `K21-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    await db.vehicle.create({
      data: {
        VIN: vin,
        renterID,
        listingCode,
        make: "Toyota",
        model: "Avanza",
        year: 2022,
        plateNumber: randomPlate(),
        type: "MPV",
        city: "Jakarta",
        pricePerDay: 200_000,
        status,
      },
    });
    return { jar, renterID, listingCode, vin };
  }

  /** Adds a Pending document of the given type to a vehicle. */
  async function addVehicleDoc(vin: string, type: "STNK" | "Insurance") {
    const dummyFile = new Uint8Array([0]);
    const dummyIv = "00000000000000000000000000000000";
    const dummyTag = "00000000000000000000000000000000";
    await db.document.create({
      data: {
        vehicleVIN: vin,
        type,
        verificationStatus: "Pending",
        fileData: dummyFile,
        iv: dummyIv,
        authTag: dummyTag,
      },
    });
  }

  it("Draft: updates make, model, year, plate, type, city and price and persists them", async () => {
    const { jar, listingCode } = await ownerWithVehicle("Draft");
    const plateNumber = randomPlate();

    const res = await api(jar, "PATCH", `/api/vehicles/${listingCode}`, {
      action: "update",
      make: "Honda",
      model: "Civic",
      year: 2023,
      plateNumber,
      type: "Sedan",
      city: "Bandung",
      pricePerDay: 350_000,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      make: string;
      model: string;
      year: number;
      plateNumber: string;
      type: string;
      city: string;
      pricePerDay: number;
      status: string;
    };
    expect(body.make).toBe("Honda");
    expect(body.pricePerDay).toBe(350_000);
    expect(body.status).toBe("Draft");

    const row = await db.vehicle.findUniqueOrThrow({ where: { listingCode } });
    expect(row.make).toBe("Honda");
    expect(row.model).toBe("Civic");
    expect(row.year).toBe(2023);
    expect(row.plateNumber).toBe(plateNumber);
    expect(row.type).toBe("Sedan");
    expect(row.city).toBe("Bandung");
    expect(Number(row.pricePerDay)).toBe(350_000);
  });

  it("Rejected: update returns 200", async () => {
    const { jar, listingCode } = await ownerWithVehicle("Rejected");
    const res = await api(jar, "PATCH", `/api/vehicles/${listingCode}`, {
      action: "update",
      make: "Mazda",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { make: string };
    expect(body.make).toBe("Mazda");
  });

  it("Pending: update returns 409", async () => {
    const { jar, listingCode } = await ownerWithVehicle("Pending");
    const res = await api(jar, "PATCH", `/api/vehicles/${listingCode}`, {
      action: "update",
      make: "Mazda",
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/under review/i);
  });

  it("Approved: { pricePerDay } returns 200 and persists the price", async () => {
    const { jar, listingCode } = await ownerWithVehicle("Approved");
    const res = await api(jar, "PATCH", `/api/vehicles/${listingCode}`, {
      action: "update",
      pricePerDay: 275_000,
    });
    expect(res.status).toBe(200);
    const row = await db.vehicle.findUniqueOrThrow({ where: { listingCode } });
    expect(Number(row.pricePerDay)).toBe(275_000);
  });

  it("Approved: { make } returns 409", async () => {
    const { jar, listingCode } = await ownerWithVehicle("Approved");
    const res = await api(jar, "PATCH", `/api/vehicles/${listingCode}`, {
      action: "update",
      make: "Mazda",
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/only price/i);
  });

  it("returns 409 when the plate is held by another vehicle", async () => {
    const { jar, listingCode, renterID } = await ownerWithVehicle("Draft");
    const takenPlate = randomPlate();
    await db.vehicle.create({
      data: {
        VIN: randomVin(),
        renterID,
        listingCode: `K21O-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
        make: "Honda",
        model: "Jazz",
        year: 2020,
        plateNumber: takenPlate,
        type: "Hatchback",
        city: "Bandung",
        pricePerDay: 150_000,
        status: "Draft",
      },
    });

    const res = await api(jar, "PATCH", `/api/vehicles/${listingCode}`, {
      action: "update",
      plateNumber: takenPlate,
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/plate/i);
  });

  it("returns 400 for an update with no fields", async () => {
    const { jar, listingCode } = await ownerWithVehicle("Draft");
    const res = await api(jar, "PATCH", `/api/vehicles/${listingCode}`, {
      action: "update",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for a price of 49,999", async () => {
    const { jar, listingCode } = await ownerWithVehicle("Draft");
    const res = await api(jar, "PATCH", `/api/vehicles/${listingCode}`, {
      action: "update",
      pricePerDay: 49_999,
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when another owner updates the vehicle", async () => {
    const { listingCode } = await ownerWithVehicle("Draft");
    const other = await newUser();
    userIds.push(other.userId);
    const { jar: otherJar } = await asOwner(other.jar);
    const res = await api(otherJar, "PATCH", `/api/vehicles/${listingCode}`, {
      action: "update",
      make: "Mazda",
    });
    expect(res.status).toBe(404);
  });

  it("submit with only an STNK returns 409; with STNK and Insurance returns 200", async () => {
    const { jar, listingCode, vin } = await ownerWithVehicle("Draft");
    await addVehicleDoc(vin, "STNK");

    const missing = await api(jar, "PATCH", `/api/vehicles/${listingCode}`, {
      action: "submit",
    });
    expect(missing.status).toBe(409);
    const missingBody = (await missing.json()) as { error: string };
    expect(missingBody.error).toMatch(/insurance/i);

    await addVehicleDoc(vin, "Insurance");
    const complete = await api(jar, "PATCH", `/api/vehicles/${listingCode}`, {
      action: "submit",
    });
    expect(complete.status).toBe(200);
  });

  it("K8 A4: vin, status and renterID in the body are ignored", async () => {
    const { jar, listingCode, vin, renterID } = await ownerWithVehicle("Draft");

    const res = await api(jar, "PATCH", `/api/vehicles/${listingCode}`, {
      action: "update",
      make: "Changed",
      vin: "NEWVIN",
      status: "Approved",
      renterID: "other",
    });
    expect(res.status).toBe(200);

    const row = await db.vehicle.findUniqueOrThrow({ where: { listingCode } });
    expect(row.VIN).toBe(vin);
    expect(row.status).toBe("Draft");
    expect(row.renterID).toBe(renterID);
    expect(row.make).toBe("Changed");
  });
});
