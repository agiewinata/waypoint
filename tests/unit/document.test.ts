import { describe, it, expect } from "vitest";
import { assertDocumentHasExactlyOneParent, sniffMime } from "@/lib/validation/document";

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

describe("sniffMime", () => {
  it("detects JPEG from magic bytes FF D8 FF", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    expect(sniffMime(bytes)).toBe("image/jpeg");
  });

  it("detects PNG from magic bytes 89 50 4E 47 0D 0A 1A 0A", () => {
    const bytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
    ]);
    expect(sniffMime(bytes)).toBe("image/png");
  });

  it("detects PDF from magic bytes 25 50 44 46 (%PDF)", () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    expect(sniffMime(bytes)).toBe("application/pdf");
  });

  it("returns null for random bytes", () => {
    const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
    expect(sniffMime(bytes)).toBeNull();
  });

  it("returns null for PNG-named text bytes (content mismatch)", () => {
    const textBytes = new Uint8Array(Buffer.from("not a real png file content here"));
    expect(sniffMime(textBytes)).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(sniffMime(new Uint8Array(0))).toBeNull();
  });

  it("returns null for fewer bytes than the PNG signature", () => {
    // 7 bytes — one short of the 8-byte PNG signature
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a]);
    expect(sniffMime(bytes)).toBeNull();
  });
});
