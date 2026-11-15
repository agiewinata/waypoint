/**
 * N1/N2 — Notifications API integration tests.
 *
 * Run with: npm run test:integration (requires dev server at http://localhost:3000)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { api, newUser, cleanup, type CookieJar } from "./helpers";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Directly create a notification row for a user (bypasses auth). */
async function seedNotification(
  userID: string,
  overrides: Partial<{
    type: string;
    title: string;
    body: string;
    href: string;
  }> = {}
): Promise<string> {
  const notif = await db.notification.create({
    data: {
      userID,
      type: overrides.type ?? "booking_created",
      title: overrides.title ?? "Test notification",
      body: overrides.body ?? "Test body",
      href: overrides.href ?? null,
    },
  });
  return notif.notificationID;
}

// ---------------------------------------------------------------------------
// N1 — GET /api/notifications
// ---------------------------------------------------------------------------

describe("GET /api/notifications (N1)", () => {
  it("returns 401 without a session", async () => {
    const res = await fetch(`${BASE}/api/notifications`);
    expect(res.status).toBe(401);
  });

  describe("when signed in", () => {
    let jar: CookieJar;
    let userId: string;
    let notifId: string;

    beforeAll(async () => {
      ({ jar, userId } = await newUser());
      notifId = await seedNotification(userId, { title: "Hello" });
    });

    afterAll(() => cleanup(userId));

    it("returns 200 with an items array and unread count", async () => {
      const res = await api(jar, "GET", "/api/notifications");
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        items: unknown[];
        unread: number;
      };
      expect(Array.isArray(body.items)).toBe(true);
      expect(typeof body.unread).toBe("number");
      expect(body.unread).toBeGreaterThanOrEqual(1);

      // The seeded notification should appear in the list
      const ids = (
        body.items as Array<{ notificationID: string }>
      ).map((n) => n.notificationID);
      expect(ids).toContain(notifId);
    });
  });
});

// ---------------------------------------------------------------------------
// N2 — PATCH /api/notifications
// ---------------------------------------------------------------------------

describe("PATCH /api/notifications (N2)", () => {
  it("returns 403 when Origin header is missing", async () => {
    const { userId } = await newUser();
    const res = await fetch(`${BASE}/api/notifications`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    expect(res.status).toBe(403);
    // No cleanup needed — the user will be garbage-collected via @waypoint.test
    // cleanupAll; we do an explicit cleanup anyway for tidiness
    await cleanup(userId);
  });

  it("returns 401 without a session", async () => {
    const res = await fetch(`${BASE}/api/notifications`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Origin: BASE,
      },
      body: JSON.stringify({ all: true }),
    });
    expect(res.status).toBe(401);
  });

  describe("mark all read", () => {
    let jar: CookieJar;
    let userId: string;

    beforeAll(async () => {
      ({ jar, userId } = await newUser());
      // Seed two unread notifications
      await seedNotification(userId, { title: "Notif 1" });
      await seedNotification(userId, { title: "Notif 2" });
    });

    afterAll(() => cleanup(userId));

    it("returns 200 { updated } and sets readAt on all unread", async () => {
      const patchRes = await api(jar, "PATCH", "/api/notifications", {
        all: true,
      });
      expect(patchRes.status).toBe(200);
      const { updated } = (await patchRes.json()) as { updated: number };
      expect(updated).toBeGreaterThanOrEqual(2);

      // Follow-up GET must show 0 unread
      const getRes = await api(jar, "GET", "/api/notifications");
      const body = (await getRes.json()) as {
        items: Array<{ readAt: string | null }>;
        unread: number;
      };
      expect(body.unread).toBe(0);
      for (const item of body.items) {
        expect(item.readAt).not.toBeNull();
      }
    });
  });

  describe("mark specific IDs", () => {
    let jar: CookieJar;
    let userId: string;
    let id1: string;
    let id2: string;

    beforeAll(async () => {
      ({ jar, userId } = await newUser());
      id1 = await seedNotification(userId, { title: "Mark this one" });
      id2 = await seedNotification(userId, { title: "Leave this unread" });
    });

    afterAll(() => cleanup(userId));

    it("marks only the specified IDs and leaves others unread", async () => {
      const patchRes = await api(jar, "PATCH", "/api/notifications", {
        ids: [id1],
      });
      expect(patchRes.status).toBe(200);
      const { updated } = (await patchRes.json()) as { updated: number };
      expect(updated).toBe(1);

      // Verify via DB
      const n1 = await db.notification.findUnique({
        where: { notificationID: id1 },
      });
      const n2 = await db.notification.findUnique({
        where: { notificationID: id2 },
      });
      expect(n1?.readAt).not.toBeNull();
      expect(n2?.readAt).toBeNull();
    });
  });

  describe("cross-user isolation", () => {
    let userAId: string;
    let userBId: string;
    let userBJar: CookieJar;
    let notifId: string;

    beforeAll(async () => {
      const a = await newUser();
      userAId = a.userId;

      const b = await newUser();
      userBId = b.userId;
      userBJar = b.jar;

      // Seed a notification for user A only
      notifId = await seedNotification(userAId, {
        title: "Only for A",
      });
    });

    afterAll(() => cleanup(userAId, userBId));

    it("returns updated=0 when user B tries to mark user A's notification", async () => {
      const patchRes = await api(userBJar, "PATCH", "/api/notifications", {
        ids: [notifId],
      });
      expect(patchRes.status).toBe(200);
      const { updated } = (await patchRes.json()) as { updated: number };
      expect(updated).toBe(0);

      // User A's notification must still be unread
      const notif = await db.notification.findUnique({
        where: { notificationID: notifId },
      });
      expect(notif?.readAt).toBeNull();
    });
  });
});
