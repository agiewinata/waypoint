import { Prisma } from "@/generated/prisma/client";

export const PLATFORM_FEE_RATE = 0.05;

/**
 * Converts a Prisma Decimal or plain number to an integer rupiah amount.
 */
export function toRupiah(d: Prisma.Decimal | number): number {
  return Math.round(Number(d));
}

/**
 * Splits a rental amount into platform fee and owner payout.
 * fee = round(amount * PLATFORM_FEE_RATE)
 * payout = amount - fee
 */
export function ownerPayout(amount: Prisma.Decimal | number): {
  fee: number;
  payout: number;
} {
  const total = toRupiah(amount);
  const fee = Math.round(total * PLATFORM_FEE_RATE);
  return { fee, payout: total - fee };
}
