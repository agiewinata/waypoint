import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProfilesForUser } from "@/server/profiles";
import type { Profile, Renter, Rentee, Admin, User } from "@/generated/prisma/client";
import { HttpError } from "@/server/http";

// ---------------------------------------------------------------------------
// Shared actor shape
// ---------------------------------------------------------------------------

export interface Actor {
  user: User;
  profile: Profile | null;
  renter: Renter | null;
  rentee: Rentee | null;
  admin: Admin | null;
}

export interface ActorWithOwner extends Actor {
  renter: Renter;
}

export interface ActorWithCustomer extends Actor {
  rentee: Rentee;
}

export interface ActorWithAdmin extends Actor {
  admin: Admin;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Builds an Actor from a session result + DB profile lookup. */
async function buildActor(user: User): Promise<Actor> {
  const profiles = await getProfilesForUser(user.id);
  return { user, ...profiles };
}

// ---------------------------------------------------------------------------
// API variants — take a Request and throw HttpError on auth failures.
// Use these inside route handlers.
// ---------------------------------------------------------------------------

/** Resolves the actor from the request's session cookies; returns null for unauthenticated requests. */
export async function getActor(req: Request): Promise<Actor | null> {
  const result = await auth.api.getSession({ headers: req.headers });
  if (!result) return null;
  return buildActor(result.user as User);
}

/** Throws 401 if no active session. */
export async function requireUser(req: Request): Promise<Actor> {
  const actor = await getActor(req);
  if (!actor) throw new HttpError(401, "Unauthorized");
  return actor;
}

/** Throws 401 if no session, 403 if no Owner (Renter) profile. */
export async function requireOwner(req: Request): Promise<ActorWithOwner> {
  const actor = await requireUser(req);
  if (!actor.renter) throw new HttpError(403, "Owner profile required");
  return actor as ActorWithOwner;
}

/** Throws 401 if no session, 403 if no Customer (Rentee) profile. */
export async function requireCustomer(req: Request): Promise<ActorWithCustomer> {
  const actor = await requireUser(req);
  if (!actor.rentee) throw new HttpError(403, "Customer profile required");
  return actor as ActorWithCustomer;
}

/** Throws 401 if no session, 403 if no Admin profile. */
export async function requireAdmin(req: Request): Promise<ActorWithAdmin> {
  const actor = await requireUser(req);
  if (!actor.admin) throw new HttpError(403, "Admin access required");
  return actor as ActorWithAdmin;
}

// ---------------------------------------------------------------------------
// Page variants — use inside Server Components / page layouts.
// Redirect or return notFound() instead of throwing.
// ---------------------------------------------------------------------------

/** Redirects to /auth/signin if no session; otherwise returns the actor. */
export async function requireUserPage(): Promise<Actor> {
  const result = await auth.api.getSession({ headers: await headers() });
  if (!result) redirect("/auth/signin");
  return buildActor(result.user as User);
}

/** Redirects to /auth/signin if no session, /dashboard/owner/new if no Owner profile. */
export async function requireOwnerPage(): Promise<ActorWithOwner> {
  const actor = await requireUserPage();
  if (!actor.renter) redirect("/dashboard/owner/new");
  return actor as ActorWithOwner;
}

/** Redirects to /auth/signin if no session, /dashboard/customer/new if no Customer profile. */
export async function requireCustomerPage(): Promise<ActorWithCustomer> {
  const actor = await requireUserPage();
  if (!actor.rentee) redirect("/dashboard/customer/new");
  return actor as ActorWithCustomer;
}

/** Redirects to /auth/signin if no session, returns notFound() if no Admin profile. */
export async function requireAdminPage(): Promise<ActorWithAdmin> {
  const actor = await requireUserPage();
  if (!actor.admin) notFound();
  return actor as ActorWithAdmin;
}
