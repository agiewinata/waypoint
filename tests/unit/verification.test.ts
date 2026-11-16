import { describe, it, expect } from "vitest";
import { computeVerificationStatus, REQUIRED_DOCS } from "@/lib/verification";
import type { DocumentType, VerificationStatus } from "@/generated/prisma/client";

function doc(
  type: DocumentType,
  status: VerificationStatus,
  createdAt: Date,
) {
  return { type, status, createdAt };
}

const T0 = new Date("2024-01-01T00:00:00Z");
const T1 = new Date("2024-01-02T00:00:00Z");
const T2 = new Date("2024-01-03T00:00:00Z");

const customer = REQUIRED_DOCS.customer;
const owner = REQUIRED_DOCS.owner;

describe("computeVerificationStatus", () => {
  it("all Verified (customer) → Verified", () => {
    const docs = [
      doc("KTP", "Verified", T0),
      doc("SIM", "Verified", T0),
    ];
    expect(computeVerificationStatus(docs, customer)).toBe("Verified");
  });

  it("one Rejected, rest Verified → Rejected", () => {
    const docs = [
      doc("KTP", "Verified", T0),
      doc("SIM", "Rejected", T0),
    ];
    expect(computeVerificationStatus(docs, customer)).toBe("Rejected");
  });

  it("one Pending, rest Verified → Pending", () => {
    const docs = [
      doc("KTP", "Pending", T0),
      doc("SIM", "Verified", T0),
    ];
    expect(computeVerificationStatus(docs, customer)).toBe("Pending");
  });

  it("no docs → Unverified", () => {
    expect(computeVerificationStatus([], customer)).toBe("Unverified");
  });

  it("missing one required type (SIM absent) → Unverified", () => {
    const docs = [doc("KTP", "Verified", T0)];
    expect(computeVerificationStatus(docs, customer)).toBe("Unverified");
  });

  it("docs only for non-required type → Unverified", () => {
    const docs = [doc("BPKB", "Verified", T0)];
    expect(computeVerificationStatus(docs, customer)).toBe("Unverified");
  });

  it("old Rejected + newer Verified of same type → Verified (bug fix)", () => {
    const docs = [
      doc("KTP", "Rejected", T0),
      doc("KTP", "Verified", T2),
      doc("SIM", "Verified", T1),
    ];
    expect(computeVerificationStatus(docs, customer)).toBe("Verified");
  });

  it("owner required (KTP+SIM+BPKB) all Verified → Verified", () => {
    const docs = [
      doc("KTP", "Verified", T0),
      doc("SIM", "Verified", T0),
      doc("BPKB", "Verified", T0),
    ];
    expect(computeVerificationStatus(docs, owner)).toBe("Verified");
  });

  it("owner required: missing BPKB → Unverified", () => {
    const docs = [
      doc("KTP", "Verified", T0),
      doc("SIM", "Verified", T0),
    ];
    expect(computeVerificationStatus(docs, owner)).toBe("Unverified");
  });

  it("extra non-required type does not affect result → Verified", () => {
    const docs = [
      doc("KTP", "Verified", T0),
      doc("SIM", "Verified", T0),
      doc("BPKB", "Rejected", T0),
    ];
    // customer only requires KTP + SIM; BPKB is irrelevant
    expect(computeVerificationStatus(docs, customer)).toBe("Verified");
  });
});
