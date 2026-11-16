import { db } from "@/lib/db";
import { isPrismaError } from "@/server/http";
import type { VerificationStatus } from "@/generated/prisma/client";
import type { ProfileUpdateInput } from "@/lib/validation/profile";

export type AccountOverview = {
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  hasPassword: boolean;
  roles: {
    owner: { status: VerificationStatus } | null;
    customer: { status: VerificationStatus } | null;
    admin: boolean;
  };
};

export class ProfileExistsError extends Error {
  constructor() {
    super("Profile already exists");
    this.name = "ProfileExistsError";
  }
}

export class ProfileMissingError extends Error {
  constructor() {
    super("Complete your profile before enabling this feature");
    this.name = "ProfileMissingError";
  }
}

export async function getProfilesForUser(userId: string) {
  const [profile, renter, rentee, admin] = await Promise.all([
    db.profile.findUnique({ where: { userID: userId } }),
    db.renter.findUnique({ where: { userID: userId } }),
    db.rentee.findUnique({ where: { userID: userId } }),
    db.admin.findUnique({ where: { userID: userId } }),
  ]);
  return { profile, renter, rentee, admin };
}

/** Creates the shared profile collected during onboarding. */
export async function createProfile(
  userId: string,
  name: string,
  phone: string,
  address: string
) {
  try {
    await db.$transaction([
      db.user.update({ where: { id: userId }, data: { name } }),
      db.profile.create({ data: { userID: userId, phone, address } }),
    ]);
  } catch (err: unknown) {
    if (isPrismaError(err, "P2002")) throw new ProfileExistsError();
    throw err;
  }
}

/** Enables the Owner (listing) capability for a user who has completed onboarding. */
export async function enableListing(userId: string) {
  const [user, profile] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.profile.findUnique({ where: { userID: userId } }),
  ]);
  if (!profile || !user) throw new ProfileMissingError();

  try {
    return await db.renter.create({
      data: {
        userID: userId,
        name: user.name,
        email: user.email,
        phone: profile.phone,
        address: profile.address,
        verificationStatus: "Unverified",
      },
    });
  } catch (err: unknown) {
    if (isPrismaError(err, "P2002")) throw new ProfileExistsError();
    throw err;
  }
}

/** Enables the Customer (renting) capability for a user who has completed onboarding. */
export async function enableRenting(userId: string) {
  const [user, profile] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.profile.findUnique({ where: { userID: userId } }),
  ]);
  if (!profile || !user) throw new ProfileMissingError();

  try {
    return await db.rentee.create({
      data: {
        userID: userId,
        name: user.name,
        email: user.email,
        phone: profile.phone,
        address: profile.address,
        verificationStatus: "Unverified",
      },
    });
  } catch (err: unknown) {
    if (isPrismaError(err, "P2002")) throw new ProfileExistsError();
    throw err;
  }
}

/** Loads the account page view for a user; null if the User row does not exist. */
export async function getAccountOverview(userId: string): Promise<AccountOverview | null> {
  const [user, profile, renter, rentee, admin, credential] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    db.profile.findUnique({ where: { userID: userId }, select: { phone: true, address: true } }),
    db.renter.findUnique({ where: { userID: userId }, select: { verificationStatus: true } }),
    db.rentee.findUnique({ where: { userID: userId }, select: { verificationStatus: true } }),
    db.admin.findUnique({ where: { userID: userId }, select: { adminID: true } }),
    db.account.findFirst({
      where: { userId, providerId: "credential" },
      select: { id: true },
    }),
  ]);
  if (!user) return null;

  return {
    name: user.name,
    email: user.email,
    phone: profile?.phone ?? null,
    address: profile?.address ?? null,
    hasPassword: credential !== null,
    roles: {
      owner: renter ? { status: renter.verificationStatus } : null,
      customer: rentee ? { status: rentee.verificationStatus } : null,
      admin: admin !== null,
    },
  };
}

/**
 * Updates the shared profile and syncs the copied name, phone and address
 * onto every Renter and Rentee row for the user, in one transaction.
 */
export async function updateProfile(
  userId: string,
  input: ProfileUpdateInput
): Promise<AccountOverview> {
  const { name, phone, address } = input;
  const touchesCopies = name !== undefined || phone !== undefined || address !== undefined;

  await db.$transaction(async (tx) => {
    const profile = await tx.profile.findUnique({
      where: { userID: userId },
      select: { profileID: true },
    });
    if (!profile) throw new ProfileMissingError();

    if (name !== undefined) {
      await tx.user.update({ where: { id: userId }, data: { name } });
    }
    if (phone !== undefined || address !== undefined) {
      await tx.profile.update({
        where: { userID: userId },
        data: { phone, address },
      });
    }
    if (touchesCopies) {
      await tx.renter.updateMany({
        where: { userID: userId },
        data: { name, phone, address },
      });
      await tx.rentee.updateMany({
        where: { userID: userId },
        data: { name, phone, address },
      });
    }
  });

  const overview = await getAccountOverview(userId);
  if (!overview) throw new ProfileMissingError();
  return overview;
}
