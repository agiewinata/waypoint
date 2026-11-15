import { describe, it, expect } from "vitest";
import { PLATFORM_FEE_RATE, toRupiah, ownerPayout } from "@/lib/money";
import { Prisma } from "@/generated/prisma/client";

describe("PLATFORM_FEE_RATE", () => {
  it("is 0.05 (5%)", () => {
    expect(PLATFORM_FEE_RATE).toBe(0.05);
  });
});

describe("toRupiah", () => {
  it("converts a plain number", () => {
    expect(toRupiah(150_000)).toBe(150_000);
  });

  it("rounds fractional amounts", () => {
    expect(toRupiah(150_000.6)).toBe(150_001);
    expect(toRupiah(150_000.4)).toBe(150_000);
  });

  it("converts a Prisma Decimal", () => {
    const d = new Prisma.Decimal("200000");
    expect(toRupiah(d)).toBe(200_000);
  });

  it("handles zero", () => {
    expect(toRupiah(0)).toBe(0);
  });
});

describe("ownerPayout", () => {
  it("1,000,000 → fee=50,000, payout=950,000", () => {
    const { fee, payout } = ownerPayout(1_000_000);
    expect(fee).toBe(50_000);
    expect(payout).toBe(950_000);
  });

  it("fee + payout equals the original amount", () => {
    const amount = 375_000;
    const { fee, payout } = ownerPayout(amount);
    expect(fee + payout).toBe(amount);
  });

  it("works with a Prisma Decimal input", () => {
    const d = new Prisma.Decimal("500000");
    const { fee, payout } = ownerPayout(d);
    expect(fee).toBe(25_000);
    expect(payout).toBe(475_000);
  });

  it("handles zero amount", () => {
    const { fee, payout } = ownerPayout(0);
    expect(fee).toBe(0);
    expect(payout).toBe(0);
  });

  it("rounds the fee correctly", () => {
    // 100,001 * 0.05 = 5000.05 → rounds to 5000
    const { fee, payout } = ownerPayout(100_001);
    expect(fee).toBe(5_000);
    expect(payout).toBe(95_001);
  });
});
