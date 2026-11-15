import { describe, it, expect } from "vitest";
import { assertVehiclePriceValid } from "@/lib/validation/vehicle";

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
