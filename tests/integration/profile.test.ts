/**
 * Integration tests for the Profile update API (PR1) and password change.
 *
 * Run with: npm run test:integration (requires dev server)
 *
 * Covers K23 (profile update, auth, validation, password change) and the
 * K8 mass-assignment case for PR1.
 */

import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import {
  api,
  newJar,
  newUser,
  asOwner,
  asCustomer,
  cleanup,
  type CookieJar,
} from "./helpers";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

const createdUserIds: string[] = [];

afterAll(async () => {
  await cleanup(...createdUserIds);
});

function cookieHeader(jar: CookieJar): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

/** Sends a PATCH /api/profile with a raw body (for malformed JSON cases). */
function rawPatch(jar: CookieJar, body: string, withOrigin = true): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Cookie: cookieHeader(jar),
  };
  if (withOrigin) headers.Origin = BASE;
  return fetch(`${BASE}/api/profile`, { method: "PATCH", headers, body });
}

const PR1_PATH = "/api/profile";

describe("PATCH /api/profile — dual-role sync (K23)", () => {
  let jar: CookieJar;
  let userId: string;
  let email: string;

  it("sets up a user who is both Owner and Customer", async () => {
    const u = await newUser();
    createdUserIds.push(u.userId);
    jar = u.jar;
    userId = u.userId;
    email = u.email;

    await asOwner(jar);
    await asCustomer(jar);

    const renter = await db.renter.findUnique({ where: { userID: userId } });
    const rentee = await db.rentee.findUnique({ where: { userID: userId } });
    expect(renter).not.toBeNull();
    expect(rentee).not.toBeNull();
  }, 30_000);

  it("PATCH { name, phone, address } returns 200 with the AccountOverview", async () => {
    const res = await api(jar, "PATCH", PR1_PATH, {
      name: "Renamed Person",
      phone: "+62811222333",
      address: "Jl. Baru No. 99",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      name: string;
      email: string;
      phone: string | null;
      address: string | null;
      roles: { owner: { status: string } | null; customer: { status: string } | null; admin: boolean };
    };
    expect(body.name).toBe("Renamed Person");
    expect(body.email).toBe(email);
    expect(body.phone).toBe("+62811222333");
    expect(body.address).toBe("Jl. Baru No. 99");
    expect(body.roles.owner).not.toBeNull();
    expect(body.roles.customer).not.toBeNull();
    expect(body.roles.admin).toBe(false);
  });

  it("persists name to User and phone/address to Profile, Renter and Rentee", async () => {
    const user = await db.user.findUnique({ where: { id: userId } });
    const profile = await db.profile.findUnique({ where: { userID: userId } });
    const renter = await db.renter.findUnique({ where: { userID: userId } });
    const rentee = await db.rentee.findUnique({ where: { userID: userId } });

    expect(user?.name).toBe("Renamed Person");
    expect(profile?.phone).toBe("+62811222333");
    expect(profile?.address).toBe("Jl. Baru No. 99");
    expect(renter?.name).toBe("Renamed Person");
    expect(renter?.phone).toBe("+62811222333");
    expect(renter?.address).toBe("Jl. Baru No. 99");
    expect(rentee?.name).toBe("Renamed Person");
    expect(rentee?.phone).toBe("+62811222333");
    expect(rentee?.address).toBe("Jl. Baru No. 99");
  });

  it("a partial update changes only the sent field everywhere", async () => {
    const res = await api(jar, "PATCH", PR1_PATH, { phone: "+62899000111" });
    expect(res.status).toBe(200);

    const profile = await db.profile.findUnique({ where: { userID: userId } });
    const renter = await db.renter.findUnique({ where: { userID: userId } });
    const rentee = await db.rentee.findUnique({ where: { userID: userId } });
    expect(profile?.phone).toBe("+62899000111");
    expect(profile?.address).toBe("Jl. Baru No. 99");
    expect(renter?.phone).toBe("+62899000111");
    expect(rentee?.phone).toBe("+62899000111");
    expect(rentee?.name).toBe("Renamed Person");
  });
});

describe("PATCH /api/profile — validation (K23)", () => {
  let jar: CookieJar;

  it("sets up a signed-in user with a Profile", async () => {
    const u = await newUser();
    createdUserIds.push(u.userId);
    jar = u.jar;
    await asOwner(jar);
  }, 30_000);

  it("invalid phone → 400", async () => {
    const res = await api(jar, "PATCH", PR1_PATH, { phone: "not-a-phone" });
    expect(res.status).toBe(400);
  });

  it("empty object {} → 400", async () => {
    const res = await api(jar, "PATCH", PR1_PATH, {});
    expect(res.status).toBe(400);
  });

  it("malformed JSON → 400", async () => {
    const res = await rawPatch(jar, "not json at all {{{");
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/profile — auth and preconditions (K23)", () => {
  it("no session → 401", async () => {
    const res = await api(newJar(), "PATCH", PR1_PATH, { name: "Nobody" });
    expect(res.status).toBe(401);
  });

  it("no Origin → 403", async () => {
    const u = await newUser();
    createdUserIds.push(u.userId);
    const res = await fetch(`${BASE}${PR1_PATH}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader(u.jar),
      },
      body: JSON.stringify({ name: "No Origin" }),
    });
    expect(res.status).toBe(403);
  }, 30_000);

  it("no Profile → 409", async () => {
    const u = await newUser();
    createdUserIds.push(u.userId);
    const res = await api(u.jar, "PATCH", PR1_PATH, { name: "No Profile Yet" });
    expect(res.status).toBe(409);
    const user = await db.user.findUnique({ where: { id: u.userId } });
    expect(user?.name).toBe("Test User");
  }, 30_000);
});

describe("POST /api/auth/change-password (K23)", () => {
  const oldPassword = "testpassword123";
  const newPassword = "brandnewpass456";
  let email: string;
  let jar: CookieJar;

  it("changes the password with the correct current password → 200", async () => {
    const u = await newUser();
    createdUserIds.push(u.userId);
    email = u.email;
    jar = u.jar;

    const res = await api(jar, "POST", "/api/auth/change-password", {
      currentPassword: oldPassword,
      newPassword,
    });
    expect(res.status).toBe(200);
  }, 30_000);

  it("sign-in with the new password → 200", async () => {
    const res = await api(newJar(), "POST", "/api/auth/sign-in/email", {
      email,
      password: newPassword,
    });
    expect(res.status).toBe(200);
  });

  it("sign-in with the old password → 401", async () => {
    const res = await api(newJar(), "POST", "/api/auth/sign-in/email", {
      email,
      password: oldPassword,
    });
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/profile — mass assignment (K8 PR1)", () => {
  it("email and userID in the body are ignored → 200, DB unchanged", async () => {
    const u = await newUser();
    createdUserIds.push(u.userId);
    await asOwner(u.jar);

    const res = await api(u.jar, "PATCH", PR1_PATH, {
      name: "New Name",
      email: "hacker@example.com",
      userID: "fake",
    });
    expect(res.status).toBe(200);

    const user = await db.user.findUnique({ where: { id: u.userId } });
    expect(user?.name).toBe("New Name");
    expect(user?.email).toBe(u.email);

    const profile = await db.profile.findUnique({ where: { userID: u.userId } });
    expect(profile).not.toBeNull();
    const fake = await db.profile.findUnique({ where: { userID: "fake" } });
    expect(fake).toBeNull();
  }, 30_000);
});
