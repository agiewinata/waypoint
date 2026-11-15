// Mirrors VehicleStatus enum without importing Prisma types
export type VehicleStatusLike = "Draft" | "Pending" | "Approved" | "Rejected";

export interface VehiclePriceInput {
  status: VehicleStatusLike | string;
  pricePerDay: number | string | { toNumber(): number };
}

export function assertVehiclePriceValid(input: VehiclePriceInput): void {
  if (input.status !== "Approved") return;
  const price =
    typeof input.pricePerDay === "object" && "toNumber" in input.pricePerDay
      ? input.pricePerDay.toNumber()
      : Number(input.pricePerDay);
  if (isNaN(price) || price <= 0) {
    throw new Error(
      `An Approved vehicle must have pricePerDay > 0, got ${input.pricePerDay}`
    );
  }
}
