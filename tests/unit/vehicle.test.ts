import { describe, it, expect } from "vitest";
import {
  assertVehiclePriceValid,
  VehicleCreateInput,
  VehiclePatchInput,
  VehicleSearchQuery,
} from "@/lib/validation/vehicle";

// ---------------------------------------------------------------------------
// assertVehiclePriceValid — status-aware price check (admin/approval flows)
// ---------------------------------------------------------------------------

describe("assertVehiclePriceValid", () => {
  it("passes non-Approved regardless of price", () => {
    expect(() =>
      assertVehiclePriceValid({ status: "Draft", pricePerDay: 0 })
    ).not.toThrow();
    expect(() =>
      assertVehiclePriceValid({ status: "Pending", pricePerDay: -1 })
    ).not.toThrow();
    expect(() =>
      assertVehiclePriceValid({ status: "Rejected", pricePerDay: 0 })
    ).not.toThrow();
  });
  it("passes Approved with pricePerDay > 0", () => {
    expect(() =>
      assertVehiclePriceValid({ status: "Approved", pricePerDay: 100 })
    ).not.toThrow();
  });
  it("throws for Approved with pricePerDay = 0", () => {
    expect(() =>
      assertVehiclePriceValid({ status: "Approved", pricePerDay: 0 })
    ).toThrow();
  });
  it("throws for Approved with pricePerDay < 0", () => {
    expect(() =>
      assertVehiclePriceValid({ status: "Approved", pricePerDay: -50 })
    ).toThrow();
  });
  it("accepts Decimal-like objects", () => {
    const decimalLike = { toNumber: () => 150 };
    expect(() =>
      assertVehiclePriceValid({ status: "Approved", pricePerDay: decimalLike })
    ).not.toThrow();
  });
  it("accepts string prices", () => {
    expect(() =>
      assertVehiclePriceValid({ status: "Approved", pricePerDay: "75.50" })
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// VehicleCreateInput — Zod schema validation
// ---------------------------------------------------------------------------

describe("VehicleCreateInput", () => {
  const validInput = {
    vin: "1HGCM82633A004352",
    make: "Honda",
    model: "Civic",
    year: 2022,
    plateNumber: "B 1234 ABC",
    type: "Sedan",
    city: "Jakarta",
    pricePerDay: 200_000,
  };

  it("accepts a valid vehicle input", () => {
    const result = VehicleCreateInput.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("uppercases the VIN", () => {
    const result = VehicleCreateInput.safeParse({
      ...validInput,
      vin: "1hgcm82633a004352",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.vin).toBe("1HGCM82633A004352");
  });

  it("rejects VIN shorter than 17 chars", () => {
    const result = VehicleCreateInput.safeParse({ ...validInput, vin: "1HGCM82633A00435" });
    expect(result.success).toBe(false);
  });

  it("rejects VIN longer than 17 chars", () => {
    const result = VehicleCreateInput.safeParse({ ...validInput, vin: "1HGCM82633A0043522" });
    expect(result.success).toBe(false);
  });

  it("rejects VIN containing disallowed chars (I, O, Q)", () => {
    // 'I' is not allowed in VIN
    const result = VehicleCreateInput.safeParse({ ...validInput, vin: "1HGCM82633I004352" });
    expect(result.success).toBe(false);
    // 'O' is not allowed
    const result2 = VehicleCreateInput.safeParse({ ...validInput, vin: "1HGCM82633O004352" });
    expect(result2.success).toBe(false);
  });

  it("accepts plate numbers in valid format", () => {
    const plates = ["B 1234 ABC", "AB 123 Z", "D 5678 EF"];
    for (const plateNumber of plates) {
      const result = VehicleCreateInput.safeParse({ ...validInput, plateNumber });
      expect(result.success).toBe(true);
    }
  });

  it("rejects plate numbers in wrong format", () => {
    const invalid = ["1234 ABC", "B1234ABC", "B 12345 ABC"];
    for (const plateNumber of invalid) {
      const result = VehicleCreateInput.safeParse({ ...validInput, plateNumber });
      expect(result.success).toBe(false);
    }
  });

  it("rejects year below 1990", () => {
    const result = VehicleCreateInput.safeParse({ ...validInput, year: 1989 });
    expect(result.success).toBe(false);
  });

  it("accepts year equal to 1990", () => {
    const result = VehicleCreateInput.safeParse({ ...validInput, year: 1990 });
    expect(result.success).toBe(true);
  });

  it("rejects year more than 1 year in the future", () => {
    const result = VehicleCreateInput.safeParse({
      ...validInput,
      year: new Date().getFullYear() + 2,
    });
    expect(result.success).toBe(false);
  });

  it("rejects pricePerDay below 50000", () => {
    const result = VehicleCreateInput.safeParse({ ...validInput, pricePerDay: 49_999 });
    expect(result.success).toBe(false);
  });

  it("accepts pricePerDay at minimum (50000)", () => {
    const result = VehicleCreateInput.safeParse({ ...validInput, pricePerDay: 50_000 });
    expect(result.success).toBe(true);
  });

  it("rejects pricePerDay above 10000000", () => {
    const result = VehicleCreateInput.safeParse({ ...validInput, pricePerDay: 10_000_001 });
    expect(result.success).toBe(false);
  });

  it("rejects unknown vehicle type", () => {
    const result = VehicleCreateInput.safeParse({ ...validInput, type: "Truck" });
    expect(result.success).toBe(false);
  });

  it("rejects unknown city", () => {
    const result = VehicleCreateInput.safeParse({ ...validInput, city: "Palembang" });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// VehiclePatchInput — A4 discriminated union (submit | update)
// ---------------------------------------------------------------------------

describe("VehiclePatchInput", () => {
  it("accepts action submit", () => {
    const result = VehiclePatchInput.safeParse({ action: "submit" });
    expect(result.success).toBe(true);
  });

  it("rejects update with no fields", () => {
    const result = VehiclePatchInput.safeParse({ action: "update" });
    expect(result.success).toBe(false);
  });

  it("accepts update with a single field", () => {
    const result = VehiclePatchInput.safeParse({ action: "update", make: "Toyota" });
    expect(result.success).toBe(true);
  });

  it("applies the create field rules to update fields", () => {
    const result = VehiclePatchInput.safeParse({ action: "update", pricePerDay: 49_999 });
    expect(result.success).toBe(false);
  });

  it("strips vin from an update body", () => {
    const result = VehiclePatchInput.safeParse({
      action: "update",
      make: "Toyota",
      vin: "1HGCM82633A004352",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toHaveProperty("vin");
  });

  it("strips status from an update body", () => {
    const result = VehiclePatchInput.safeParse({
      action: "update",
      make: "Toyota",
      status: "Approved",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toHaveProperty("status");
  });

  it("rejects an unknown action", () => {
    const result = VehiclePatchInput.safeParse({ action: "delete" });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// VehicleSearchQuery — Zod schema validation
// ---------------------------------------------------------------------------

describe("VehicleSearchQuery", () => {
  it("parses defaults when no params given", () => {
    const result = VehicleSearchQuery.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(24);
    }
  });

  it("coerces string numbers for page and pageSize", () => {
    const result = VehicleSearchQuery.safeParse({ page: "2", pageSize: "10" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(10);
    }
  });

  it("rejects pageSize above 50", () => {
    const result = VehicleSearchQuery.safeParse({ pageSize: "51" });
    expect(result.success).toBe(false);
  });

  it("rejects when minPrice > maxPrice", () => {
    const result = VehicleSearchQuery.safeParse({ minPrice: "200000", maxPrice: "100000" });
    expect(result.success).toBe(false);
  });

  it("accepts valid minPrice <= maxPrice", () => {
    const result = VehicleSearchQuery.safeParse({ minPrice: "100000", maxPrice: "200000" });
    expect(result.success).toBe(true);
  });

  it("accepts valid city filter", () => {
    const result = VehicleSearchQuery.safeParse({ city: "Jakarta" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid city", () => {
    const result = VehicleSearchQuery.safeParse({ city: "Pontianak" });
    expect(result.success).toBe(false);
  });
});
