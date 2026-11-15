import { NextResponse } from "next/server";
import { route, readJson } from "@/server/http";
import { requireUser } from "@/server/authz";
import {
  listNotifications,
  countUnread,
  markRead,
} from "@/server/notifications";
import { db } from "@/lib/db";
import { MarkReadInput } from "@/lib/validation/notification";

// ---------------------------------------------------------------------------
// GET /api/notifications — N1
// Returns the latest 50 notifications and the unread count for the caller.
// ---------------------------------------------------------------------------

export const GET = route(async (req) => {
  const actor = await requireUser(req);
  const [items, unread] = await Promise.all([
    listNotifications(actor.user.id),
    countUnread(actor.user.id),
  ]);
  return NextResponse.json({ items, unread });
});

// ---------------------------------------------------------------------------
// PATCH /api/notifications — N2
// Marks notifications as read (all or a specific list of IDs).
// Always scoped to the caller — cannot affect another user's notifications.
// Returns the number of rows that were actually updated.
// ---------------------------------------------------------------------------

export const PATCH = route(async (req) => {
  const actor = await requireUser(req);
  const input = await readJson(req, MarkReadInput);

  let updated: number;

  if ("all" in input) {
    // Count first, then mark — gives an accurate count without a race condition
    // that matters in practice (single-user scope, no concurrent marks expected).
    updated = await countUnread(actor.user.id);
    await markRead(actor.user.id, "all");
  } else {
    // Count only unread rows that belong to this user and match the given IDs.
    // Rows that belong to another user will not be counted or updated.
    updated = await db.notification.count({
      where: {
        userID: actor.user.id,
        notificationID: { in: input.ids },
        readAt: null,
      },
    });
    await markRead(actor.user.id, input.ids);
  }

  return NextResponse.json({ updated });
});
