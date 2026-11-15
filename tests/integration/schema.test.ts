import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

// Random suffix to avoid collisions between test runs
const suffix = Math.random().toString(36).slice(2, 8);

// Track created IDs for cleanup
const createdIds: {
  userId?: string;
  renterId?: string;
  renteeId?: string;
  vehicleVIN?: string;
  bookingId?: string;
} = {};

describe("Schema constraints", () => {
  // Set up shared fixture: User → Renter → Vehicle → Rentee
  beforeAll(async () => {
    const user = await db.user.create({
      data: {
        id: randomUUID(),
        email: `test-${suffix}@example.com`,
        name: `Test User ${suffix}`,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    createdIds.userId = user.id;

    const renter = await db.renter.create({
      data: {
        userID: user.id,
        name: `Renter ${suffix}`,
        email: `renter-${suffix}@example.com`,
        phone: "+6281234567890",
        address: "Jl. Test No. 1",
      },
    });
    createdIds.renterId = renter.renterID;

    // VIN: "VIN" (3) + suffix padded to 14 = 17 chars total
    const vehicle = await db.vehicle.create({
      data: {
        VIN: `VIN${suffix.toUpperCase().padEnd(14, "0")}`,
        renterID: renter.renterID,
        listingCode: `LIST-${suffix}`,
        make: "Toyota",
        model: "Avanza",
        year: 2022,
        plateNumber: `B${suffix.toUpperCase()}`,
        type: "MPV",
        city: "Jakarta",
        pricePerDay: 300000,
        status: "Draft",
      },
    });
    createdIds.vehicleVIN = vehicle.VIN;

    const rentee = await db.rentee.create({
      data: {
        name: `Rentee ${suffix}`,
        email: `rentee-${suffix}@example.com`,
        phone: "+6289876543210",
        address: "Jl. Test No. 2",
      },
    });
    createdIds.renteeId = rentee.renteeID;
  });

  afterAll(async () => {
    // Clean up in FK-safe reverse order
    if (createdIds.bookingId) {
      await db.booking.deleteMany({ where: { bookingID: createdIds.bookingId } });
    }
    if (createdIds.vehicleVIN) {
      await db.vehicle.deleteMany({ where: { VIN: createdIds.vehicleVIN } });
    }
    if (createdIds.renteeId) {
      await db.rentee.deleteMany({ where: { renteeID: createdIds.renteeId } });
    }
    if (createdIds.renterId) {
      await db.renter.deleteMany({ where: { renterID: createdIds.renterId } });
    }
    if (createdIds.userId) {
      await db.user.deleteMany({ where: { id: createdIds.userId } });
    }
  });

  describe("(a) Booking CHECK: endDate must be after startDate", () => {
    it("rejects endDate === startDate", async () => {
      const start = new Date("2025-06-01");
      await expect(
        db.booking.create({
          data: {
            vehicleVIN: createdIds.vehicleVIN!,
            renteeID: createdIds.renteeId!,
            startDate: start,
            endDate: start, // same day — violates CHECK
            status: "Pending",
            totalPrice: 300000,
          },
        })
      ).rejects.toThrow();
    });

    it("accepts endDate after startDate", async () => {
      const booking = await db.booking.create({
        data: {
          vehicleVIN: createdIds.vehicleVIN!,
          renteeID: createdIds.renteeId!,
          startDate: new Date("2025-06-01"),
          endDate: new Date("2025-06-05"),
          status: "Pending",
          totalPrice: 1200000,
        },
      });
      createdIds.bookingId = booking.bookingID;
      expect(booking.bookingID).toBeTruthy();
    });
  });

  describe("(b) Unique constraints", () => {
    it("rejects duplicate plateNumber", async () => {
      // "VIN2" (4) + suffix padded to 13 = 17 chars total
      await expect(
        db.vehicle.create({
          data: {
            VIN: `VIN2${suffix.toUpperCase().padEnd(13, "0")}`,
            renterID: createdIds.renterId!,
            listingCode: `LIST2-${suffix}`,
            make: "Honda",
            model: "Brio",
            year: 2023,
            plateNumber: `B${suffix.toUpperCase()}`, // duplicate
            type: "Hatchback",
            city: "Jakarta",
            pricePerDay: 200000,
            status: "Draft",
          },
        })
      ).rejects.toThrow();
    });

    it("rejects duplicate listingCode", async () => {
      await expect(
        db.vehicle.create({
          data: {
            VIN: `VIN3${suffix.toUpperCase().padEnd(13, "0")}`,
            renterID: createdIds.renterId!,
            listingCode: `LIST-${suffix}`, // duplicate
            make: "Honda",
            model: "Jazz",
            year: 2023,
            plateNumber: `D${suffix.toUpperCase()}`,
            type: "Hatchback",
            city: "Bandung",
            pricePerDay: 250000,
            status: "Draft",
          },
        })
      ).rejects.toThrow();
    });

    it("rejects duplicate VIN (PK)", async () => {
      await expect(
        db.vehicle.create({
          data: {
            VIN: createdIds.vehicleVIN!, // duplicate PK
            renterID: createdIds.renterId!,
            listingCode: `LIST4-${suffix}`,
            make: "Suzuki",
            model: "Ertiga",
            year: 2023,
            plateNumber: `E${suffix.toUpperCase()}`,
            type: "MPV",
            city: "Surabaya",
            pricePerDay: 350000,
            status: "Draft",
          },
        })
      ).rejects.toThrow();
    });
  });

  describe("(c) Unique userID on Renter and Rentee", () => {
    it("rejects second Renter for same userID", async () => {
      await expect(
        db.renter.create({
          data: {
            userID: createdIds.userId!, // duplicate userID
            name: "Duplicate Renter",
            email: `dup-renter-${suffix}@example.com`,
            phone: "+6281111111111",
            address: "Jl. Dup No. 1",
          },
        })
      ).rejects.toThrow();
    });

    it("rejects second Rentee for same userID", async () => {
      // Create a second user and Rentee for them
      const user2 = await db.user.create({
        data: {
          id: randomUUID(),
          email: `test2-${suffix}@example.com`,
          name: `Test User 2 ${suffix}`,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      await db.rentee.create({
        data: {
          userID: user2.id,
          name: `Rentee2 ${suffix}`,
          email: `rentee2-${suffix}@example.com`,
          phone: "+6282222222222",
          address: "Jl. Test No. 3",
        },
      });
      // Now try to create another Rentee with the same userID
      await expect(
        db.rentee.create({
          data: {
            userID: user2.id, // duplicate
            name: "Duplicate Rentee",
            email: `dup-rentee-${suffix}@example.com`,
            phone: "+6283333333333",
            address: "Jl. Dup No. 2",
          },
        })
      ).rejects.toThrow();
      // Clean up
      await db.rentee.deleteMany({ where: { userID: user2.id } });
      await db.user.delete({ where: { id: user2.id } });
    });
  });

  describe("(d) FK constraint", () => {
    it("rejects Vehicle with non-existent renterID", async () => {
      // "VIN9" (4) + suffix padded to 13 = 17 chars total
      await expect(
        db.vehicle.create({
          data: {
            VIN: `VIN9${suffix.toUpperCase().padEnd(13, "0")}`,
            renterID: "non-existent-renter-id-xyz",
            listingCode: `LIST9-${suffix}`,
            make: "Daihatsu",
            model: "Sigra",
            year: 2023,
            plateNumber: `F${suffix.toUpperCase()}`,
            type: "MPV",
            city: "Medan",
            pricePerDay: 180000,
            status: "Draft",
          },
        })
      ).rejects.toThrow();
    });
  });
});
