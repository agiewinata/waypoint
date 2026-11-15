import { z } from "zod";

// ---------------------------------------------------------------------------
// Status-aware price check (used by admin/approval flows and seed)
// ---------------------------------------------------------------------------

// Mirrors VehicleStatus enum without importing Prisma types
export type VehicleStatusLike = "Draft" | "Pending" | "Approved" | "Rejected";

export interface VehiclePriceInput {
  status: VehicleStatusLike | string;
  pricePerDay: number | string | { toNumber(): number };
}

/**
 * Throws if the vehicle is Approved but its pricePerDay is not > 0.
 * Used in admin/approval flows and seed scripts where the status context matters.
 */
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

// ---------------------------------------------------------------------------
// City and type constants
// ---------------------------------------------------------------------------

export const CITIES = [
  "Jakarta",
  "Bandung",
  "Surabaya",
  "Yogyakarta",
  "Bali",
  "Medan",
  "Semarang",
  "Makassar",
] as const;
export type City = (typeof CITIES)[number];

export const VEHICLE_TYPES = [
  "Sedan",
  "SUV",
  "MPV",
  "Hatchback",
  "Pickup",
  "Motorcycle",
] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const currentYear = new Date().getFullYear();

export const VehicleCreateInput = z.object({
  // Transform to uppercase first, then validate — allows lowercase input from users
  vin: z
    .string()
    .transform((s) => s.toUpperCase())
    .pipe(
      z
        .string()
        .regex(
          /^[A-HJ-NPR-Z0-9]{17}$/,
          "VIN must be 17 alphanumeric characters (excluding I, O, Q)"
        )
    ),
  make: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z.number().int().min(1990).max(currentYear + 1),
  // Transform to uppercase first, then validate — allows lowercase input from users
  plateNumber: z
    .string()
    .transform((s) => s.toUpperCase())
    .pipe(
      z
        .string()
        .regex(
          /^[A-Z]{1,2} \d{1,4} [A-Z]{0,3}$/,
          "Plate number format: e.g. B 1234 ABC"
        )
    ),
  type: z.enum(VEHICLE_TYPES),
  city: z.enum(CITIES),
  pricePerDay: z.number().int().min(50_000).max(10_000_000),
});
export type VehicleCreateInputType = z.infer<typeof VehicleCreateInput>;

export const VehicleSearchQuery = z
  .object({
    city: z.enum(CITIES).optional(),
    type: z.enum(VEHICLE_TYPES).optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    q: z.string().max(60).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(24),
  })
  .refine(
    (d) => !d.minPrice || !d.maxPrice || d.minPrice <= d.maxPrice,
    { message: "minPrice must be <= maxPrice" }
  );
export type VehicleSearchQueryType = z.infer<typeof VehicleSearchQuery>;

export const VehicleSubmitInput = z.object({
  action: z.literal("submit"),
});
export type VehicleSubmitInputType = z.infer<typeof VehicleSubmitInput>;
