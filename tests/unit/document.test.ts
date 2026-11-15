import { describe, it, expect } from "vitest";
import { assertDocumentHasExactlyOneParent } from "@/lib/validation/document";

describe("assertDocumentHasExactlyOneParent", () => {
  it("accepts exactly one parent (vehicleVIN)", () => {
    expect(() =>
      assertDocumentHasExactlyOneParent({ vehicleVIN: "VIN123" })
    ).not.toThrow();
  });
  it("accepts exactly one parent (renterID)", () => {
    expect(() =>
      assertDocumentHasExactlyOneParent({ renterID: "abc" })
    ).not.toThrow();
  });
  it("accepts exactly one parent (renteeID)", () => {
    expect(() =>
      assertDocumentHasExactlyOneParent({ renteeID: "def" })
    ).not.toThrow();
  });
  it("throws with zero parents", () => {
    expect(() => assertDocumentHasExactlyOneParent({})).toThrow();
  });
  it("throws with two parents", () => {
    expect(() =>
      assertDocumentHasExactlyOneParent({ vehicleVIN: "V1", renterID: "R1" })
    ).toThrow();
  });
  it("throws with three parents", () => {
    expect(() =>
      assertDocumentHasExactlyOneParent({
        vehicleVIN: "V1",
        renterID: "R1",
        renteeID: "E1",
      })
    ).toThrow();
  });
  it("treats null as absent", () => {
    expect(() =>
      assertDocumentHasExactlyOneParent({ vehicleVIN: "V1", renterID: null })
    ).not.toThrow();
  });
  it("treats empty string as absent", () => {
    expect(() =>
      assertDocumentHasExactlyOneParent({ vehicleVIN: "V1", renterID: "" })
    ).not.toThrow();
  });
});
