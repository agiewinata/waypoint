import { db } from "@/lib/db";
import { toRupiah } from "@/lib/money";
import { HttpError, isPrismaError } from "@/server/http";
import type {
  VehicleCreateInputType,
  VehicleSearchQueryType,
  VehicleUpdateFields,
} from "@/lib/validation/vehicle";
import { Prisma } from "@/generated/prisma/client";
import type { DocumentType, VerificationStatus } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// DTOs — no Prisma models leave this module; all Decimal/Date are primitives
// ---------------------------------------------------------------------------

export interface PublicVehicle {
  listingCode: string;
  make: string;
  model: string;
  year: number;
  type: string;
  city: string;
  pricePerDay: number;
  ownerFirstName: string;
  ownerVerified: boolean;
}

export interface OwnerVehicle {
  listingCode: string;
  make: string;
  model: string;
  year: number;
  type: string;
  city: string;
  pricePerDay: number;
  status: string;
  vin: string;
  plateNumber: string;
  createdAt: string;
  ownerVerified: boolean;
}

export type OwnerVehicleDetail = OwnerVehicle & {
  docs: { id: string; type: DocumentType; status: VerificationStatus; createdAt: Date }[];
  editable: "all" | "price" | "none";
};

type VehicleWithRenter = Prisma.VehicleGetPayload<{
  include: { renter: { select: { verificationStatus: true } } };
}>;

function toOwnerVehicle(v: VehicleWithRenter): OwnerVehicle {
  return {
    listingCode: v.listingCode,
    make: v.make,
    model: v.model,
    year: v.year,
    type: v.type,
    city: v.city,
    pricePerDay: toRupiah(v.pricePerDay),
    status: v.status,
    vin: v.VIN,
    plateNumber: v.plateNumber,
    createdAt: v.createdAt.toISOString(),
    ownerVerified: v.renter.verificationStatus === "Verified",
  };
}

function editableFor(status: string): "all" | "price" | "none" {
  if (status === "Approved") return "price";
  if (status === "Pending") return "none";
  return "all";
}

// ---------------------------------------------------------------------------
// Crockford base32: 0-9 A-Z excluding I L O U
// ---------------------------------------------------------------------------

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function randomListingCode(): string {
  let code = "WP-";
  for (let i = 0; i < 6; i++) {
    code += CROCKFORD[Math.floor(Math.random() * 32)];
  }
  return code;
}

// ---------------------------------------------------------------------------
// A1: list public (Approved) vehicles with optional filters + pagination
// ---------------------------------------------------------------------------

export async function listPublicVehicles(
  query: VehicleSearchQueryType
): Promise<{ items: PublicVehicle[]; page: number; pageSize: number; total: number }> {
  const { city, type, minPrice, maxPrice, q, page, pageSize } = query;

  // Build AND conditions so individual filters don't interfere with each other
  const andConditions: Prisma.VehicleWhereInput[] = [
    { status: "Approved" },
    { pricePerDay: { gt: 0 } },
  ];

  if (city) andConditions.push({ city });
  if (type) andConditions.push({ type });
  if (minPrice !== undefined) andConditions.push({ pricePerDay: { gte: minPrice } });
  if (maxPrice !== undefined) andConditions.push({ pricePerDay: { lte: maxPrice } });
  if (q) {
    andConditions.push({
      OR: [
        { make: { contains: q } },
        { model: { contains: q } },
      ],
    });
  }

  const where: Prisma.VehicleWhereInput = { AND: andConditions };

  const [vehicles, total] = await Promise.all([
    db.vehicle.findMany({
      where,
      include: { renter: { select: { name: true, verificationStatus: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.vehicle.count({ where }),
  ]);

  const items: PublicVehicle[] = vehicles.map((v) => ({
    listingCode: v.listingCode,
    make: v.make,
    model: v.model,
    year: v.year,
    type: v.type,
    city: v.city,
    pricePerDay: toRupiah(v.pricePerDay),
    // First word of the renter's name as the "first name"
    ownerFirstName: v.renter.name.split(" ")[0] ?? v.renter.name,
    ownerVerified: v.renter.verificationStatus === "Verified",
  }));

  return { items, page, pageSize, total };
}

// ---------------------------------------------------------------------------
// A1 single: get one public vehicle by listing code
// ---------------------------------------------------------------------------

export async function getPublicVehicle(
  listingCode: string
): Promise<PublicVehicle | null> {
  const v = await db.vehicle.findFirst({
    where: { listingCode, status: "Approved", pricePerDay: { gt: 0 } },
    include: { renter: { select: { name: true, verificationStatus: true } } },
  });
  if (!v) return null;
  return {
    listingCode: v.listingCode,
    make: v.make,
    model: v.model,
    year: v.year,
    type: v.type,
    city: v.city,
    pricePerDay: toRupiah(v.pricePerDay),
    ownerFirstName: v.renter.name.split(" ")[0] ?? v.renter.name,
    ownerVerified: v.renter.verificationStatus === "Verified",
  };
}

// ---------------------------------------------------------------------------
// A2: list vehicles belonging to an owner (all statuses)
// ---------------------------------------------------------------------------

export async function listVehiclesForOwner(
  renterID: string
): Promise<{ items: OwnerVehicle[] }> {
  const vehicles = await db.vehicle.findMany({
    where: { renterID },
    include: { renter: { select: { verificationStatus: true } } },
    orderBy: { createdAt: "desc" },
  });

  const items: OwnerVehicle[] = vehicles.map(toOwnerVehicle);

  return { items };
}

// ---------------------------------------------------------------------------
// A2 single: one vehicle owned by this renter, with its documents (all types)
// ---------------------------------------------------------------------------

export async function getOwnerVehicle(
  renterID: string,
  listingCode: string
): Promise<OwnerVehicleDetail | null> {
  const v = await db.vehicle.findFirst({
    where: { listingCode, renterID },
    include: {
      renter: { select: { verificationStatus: true } },
      documents: {
        select: { documentID: true, type: true, verificationStatus: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!v) return null;

  return {
    ...toOwnerVehicle(v),
    docs: v.documents.map((d) => ({
      id: d.documentID,
      type: d.type,
      status: d.verificationStatus,
      createdAt: d.createdAt,
    })),
    editable: editableFor(v.status),
  };
}

// ---------------------------------------------------------------------------
// A3: create a vehicle (Draft)
// ---------------------------------------------------------------------------

export async function createVehicle(
  renterID: string,
  input: VehicleCreateInputType
): Promise<{ listingCode: string }> {
  // Check VIN and plate uniqueness upfront inside a transaction
  await db.$transaction(async (tx) => {
    const vinConflict = await tx.vehicle.findUnique({
      where: { VIN: input.vin },
      select: { VIN: true },
    });
    if (vinConflict) throw new HttpError(409, "A vehicle with this VIN already exists");

    const plateConflict = await tx.vehicle.findUnique({
      where: { plateNumber: input.plateNumber },
      select: { plateNumber: true },
    });
    if (plateConflict)
      throw new HttpError(409, "A vehicle with this plate number already exists");
  });

  // Generate a unique listing code, retrying up to 3 times on P2002 collision
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const listingCode = randomListingCode();
    try {
      await db.vehicle.create({
        data: {
          VIN: input.vin,
          renterID,
          listingCode,
          make: input.make,
          model: input.model,
          year: input.year,
          plateNumber: input.plateNumber,
          type: input.type,
          city: input.city,
          pricePerDay: input.pricePerDay,
          status: "Draft",
        },
      });
      return { listingCode };
    } catch (err) {
      if (isPrismaError(err, "P2002")) {
        // Check if collision was on listingCode vs VIN/plate (which we already pre-checked)
        const target = (err as { meta?: { target?: string[] } }).meta?.target;
        if (Array.isArray(target) && target.includes("listingCode")) {
          lastError = err;
          continue; // retry with new code
        }
        // VIN or plate collision from a concurrent insert — give a clear message
        throw new HttpError(409, "Duplicate VIN or plate number");
      }
      throw err;
    }
  }
  throw new HttpError(500, "Could not generate a unique listing code, please try again");
}

// ---------------------------------------------------------------------------
// A4: submit a vehicle for admin review
// ---------------------------------------------------------------------------

export async function submitVehicle(
  renterID: string,
  listingCode: string
): Promise<{ listingCode: string; status: string }> {
  const vehicle = await db.vehicle.findFirst({
    where: { listingCode, renterID },
    select: { VIN: true, status: true, pricePerDay: true, listingCode: true },
  });

  if (!vehicle) throw new HttpError(404, "Vehicle not found");

  if (vehicle.status !== "Draft" && vehicle.status !== "Rejected") {
    throw new HttpError(
      409,
      `Cannot submit a vehicle with status "${vehicle.status}"`
    );
  }

  if (Number(vehicle.pricePerDay) <= 0) {
    throw new HttpError(409, "Price must be greater than 0");
  }

  // Must have BOTH an STNK and an Insurance document, each Pending or Verified
  const [stnkCount, insuranceCount] = await Promise.all(
    (["STNK", "Insurance"] as const).map((type) =>
      db.document.count({
        where: {
          vehicleVIN: vehicle.VIN,
          type,
          verificationStatus: { in: ["Pending", "Verified"] },
        },
      })
    )
  );

  if (stnkCount === 0 || insuranceCount === 0) {
    throw new HttpError(
      409,
      "Vehicle must have an STNK and an Insurance document before submission"
    );
  }

  await db.vehicle.update({
    where: { listingCode },
    data: { status: "Pending" },
  });

  return { listingCode, status: "Pending" };
}

// ---------------------------------------------------------------------------
// A4 update: edit a vehicle the owner controls, following the §3.5 status rules
// ---------------------------------------------------------------------------

const UPDATABLE_FIELDS = [
  "make",
  "model",
  "year",
  "plateNumber",
  "type",
  "city",
  "pricePerDay",
] as const;

export async function updateVehicle(
  renterID: string,
  listingCode: string,
  fields: VehicleUpdateFields
): Promise<OwnerVehicle> {
  const provided = UPDATABLE_FIELDS.filter((k) => fields[k] !== undefined);

  try {
    return await db.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findFirst({
        where: { listingCode, renterID },
        select: { status: true },
      });
      if (!vehicle) throw new HttpError(404, "Vehicle not found");

      if (vehicle.status === "Pending") {
        throw new HttpError(409, "Vehicle is under review and cannot be edited");
      }
      if (vehicle.status === "Approved" && provided.some((k) => k !== "pricePerDay")) {
        throw new HttpError(409, "Only price can be updated for approved listings");
      }

      if (fields.plateNumber !== undefined) {
        const plateTaken = await tx.vehicle.findFirst({
          where: { plateNumber: fields.plateNumber, NOT: { listingCode } },
          select: { VIN: true },
        });
        if (plateTaken) throw new HttpError(409, "Plate number already taken");
      }

      const updated = await tx.vehicle.update({
        where: { listingCode },
        data: {
          make: fields.make,
          model: fields.model,
          year: fields.year,
          plateNumber: fields.plateNumber,
          type: fields.type,
          city: fields.city,
          pricePerDay: fields.pricePerDay,
        },
        include: { renter: { select: { verificationStatus: true } } },
      });
      return toOwnerVehicle(updated);
    });
  } catch (err) {
    if (isPrismaError(err, "P2002")) {
      throw new HttpError(409, "Plate number already taken");
    }
    throw err;
  }
}
