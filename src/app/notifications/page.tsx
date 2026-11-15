export const dynamic = "force-dynamic";

import { requireUserPage } from "@/server/authz";
import { listNotifications, countUnread } from "@/server/notifications";
import { SiteHeader } from "@/components/ui/SiteHeader";
import {
  NotificationList,
  type NotifItem,
} from "@/components/notifications/NotificationList";

export default async function NotificationsPage() {
  const actor = await requireUserPage();

  const [rawItems, unread] = await Promise.all([
    listNotifications(actor.user.id),
    countUnread(actor.user.id),
  ]);

  // Serialize Date fields to ISO strings for the client component.
  const items: NotifItem[] = rawItems.map((n) => ({
    notificationID: n.notificationID,
    type: n.type,
    title: n.title,
    body: n.body,
    href: n.href,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <>
      <SiteHeader />

      <main style={{ padding: "36px 0 80px" }}>
        <div className="page-container" style={{ maxWidth: 680 }}>
          <NotificationList initialItems={items} initialUnread={unread} />
        </div>
      </main>
    </>
  );
}
