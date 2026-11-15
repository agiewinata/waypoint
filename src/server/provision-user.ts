import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { hashPassword } from "better-auth/crypto";

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
}

export interface EnsureAdminInput {
  userId: string;
  name: string;
  email: string;
  permission: string;
}

/**
 * Creates a User + credential Account row in a single transaction,
 * mirroring what Better Auth does for email+password signups.
 * Idempotent: returns the existing user if the email already exists.
 */
export async function createCredentialUser(
  input: CreateUserInput
): Promise<{ id: string; email: string }> {
  // Idempotency: return existing user if email already registered
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) return { id: existing.id, email: existing.email };

  const hash = await hashPassword(input.password);

  return await db.$transaction(async (tx) => {
    const userId = randomUUID();

    const user = await tx.user.create({
      data: {
        id: userId,
        email: input.email,
        name: input.name,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await tx.account.create({
      data: {
        id: randomUUID(),
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: hash,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return { id: user.id, email: user.email };
  });
}

/**
 * Ensures an Admin profile exists for the given user.
 * Safe to call multiple times — upserts on userID.
 */
export async function ensureAdmin(input: EnsureAdminInput): Promise<void> {
  await db.admin.upsert({
    where: { userID: input.userId },
    update: {},
    create: {
      userID: input.userId,
      name: input.name,
      email: input.email,
      permission: input.permission,
    },
  });
}
