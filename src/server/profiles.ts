import { db } from "@/lib/db";
import type { ProfileInput } from "@/lib/validation/profile";

export class ProfileExistsError extends Error {
  constructor() {
    super("Profile already exists");
    this.name = "ProfileExistsError";
  }
}

export async function getProfilesForUser(userId: string) {
  const [renter, rentee, admin] = await Promise.all([
    db.renter.findUnique({ where: { userID: userId } }),
    db.rentee.findUnique({ where: { userID: userId } }),
    db.admin.findUnique({ where: { userID: userId } }),
  ]);
  return { renter, rentee, admin };
}

export async function createRenterProfile(userId: string, input: ProfileInput) {
  try {
    return await db.renter.create({
      data: {
        userID: userId,
        name: input.name,
        email: input.email ?? "",
        phone: input.phone,
        address: input.address,
        verificationStatus: "Unverified",
      },
    });
  } catch (err: unknown) {
    if (isPrismaUniqueError(err)) throw new ProfileExistsError();
    throw err;
  }
}

export async function createRenteeProfile(userId: string, input: ProfileInput) {
  try {
    return await db.rentee.create({
      data: {
        userID: userId,
        name: input.name,
        email: input.email ?? "",
        phone: input.phone,
        address: input.address,
        verificationStatus: "Unverified",
      },
    });
  } catch (err: unknown) {
    if (isPrismaUniqueError(err)) throw new ProfileExistsError();
    throw err;
  }
}

function isPrismaUniqueError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "P2002"
  );
}
