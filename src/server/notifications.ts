import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Notification type union — all event types used in the app
// ---------------------------------------------------------------------------

export type NotificationType =
  | "booking_created"
  | "booking_confirmed"
  | "booking_declined"
  | "booking_started"
  | "booking_completed"
  | "payment_held"
  | "payment_released"
  | "payment_failed"
  | "document_verified"
  | "document_rejected"
  | "vehicle_approved"
  | "vehicle_rejected"
  | "dispute_opened"
  | "dispute_resolved"
  | "dispute_rejected";

// ---------------------------------------------------------------------------
// Tx — a Prisma transaction client or the main db instance
// PrismaClient is structurally a superset of TransactionClient so it is
// assignable to this type.
// ---------------------------------------------------------------------------

type Tx = Prisma.TransactionClient | typeof db;

// ---------------------------------------------------------------------------
// DTO returned to callers (safe subset of the Notification model)
// ---------------------------------------------------------------------------

export interface NotificationDTO {
  notificationID: string;
  userID: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// notify — create a single notification row.
// A null/undefined userID is silently ignored (useful when a profile may not exist).
// ---------------------------------------------------------------------------

export async function notify(
  tx: Tx,
  input: {
    userID: string | null | undefined;
    type: NotificationType;
    title: string;
    body: string;
    href?: string;
  }
): Promise<void> {
  if (!input.userID) return;
  await tx.notification.create({
    data: {
      userID: input.userID,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// notifyAdmins — send the same notification to every Admin user.
// ---------------------------------------------------------------------------

export async function notifyAdmins(
  tx: Tx,
  input: {
    type: NotificationType;
    title: string;
    body: string;
    href?: string;
  }
): Promise<void> {
  const admins = await tx.admin.findMany({ select: { userID: true } });
  await Promise.all(
    admins.map((a) =>
      notify(tx, {
        userID: a.userID,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href,
      })
    )
  );
}

// ---------------------------------------------------------------------------
// listNotifications — fetch the latest N notifications for a user, newest first.
// ---------------------------------------------------------------------------

export async function listNotifications(
  userId: string,
  limit = 50
): Promise<NotificationDTO[]> {
  return db.notification.findMany({
    where: { userID: userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// ---------------------------------------------------------------------------
// countUnread — count unread notifications for a user.
// ---------------------------------------------------------------------------

export async function countUnread(userId: string): Promise<number> {
  return db.notification.count({
    where: { userID: userId, readAt: null },
  });
}

// ---------------------------------------------------------------------------
// markRead — set readAt=now for specified notification IDs (or all) scoped
// to the given user. Scoping to userId prevents one user marking another's.
// ---------------------------------------------------------------------------

export async function markRead(
  userId: string,
  ids: string[] | "all"
): Promise<void> {
  const now = new Date();
  if (ids === "all") {
    await db.notification.updateMany({
      where: { userID: userId, readAt: null },
      data: { readAt: now },
    });
  } else {
    await db.notification.updateMany({
      where: {
        userID: userId,
        notificationID: { in: ids },
        readAt: null,
      },
      data: { readAt: now },
    });
  }
}
