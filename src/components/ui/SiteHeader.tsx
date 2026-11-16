import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { countUnread } from "@/server/notifications";
import { Header } from "@/components/ui/Header";
import { initials } from "@/lib/format";

interface SiteHeaderProps {
  variant?: "default" | "ink";
}

/**
 * Async server component — resolves the current session and renders
 * the site header with real user data and unread notification count.
 */
export async function SiteHeader({ variant = "default" }: SiteHeaderProps) {
  const result = await auth.api.getSession({ headers: await headers() });

  if (!result) {
    return <Header variant={variant === "ink" ? "ink" : "paper"} />;
  }

  const { user } = result;
  const unreadCount = await countUnread(user.id);
  const userInitials = initials(user.name.trim() || user.email);

  return (
    <Header
      variant={variant === "ink" ? "ink" : "paper"}
      userName={user.name || user.email}
      userInitials={userInitials}
      notifCount={unreadCount}
    />
  );
}
