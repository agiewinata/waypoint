import { db } from "@/lib/db";
import { isPrismaError } from "@/server/http";

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
