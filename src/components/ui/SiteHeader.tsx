import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { countUnread } from "@/server/notifications";
import { Header } from "@/components/ui/Header";

interface SiteHeaderProps {
  variant?: "default" | "ink";
}

/** Derives two-letter initials from a display name or email address. */
function getInitials(name: string, email: string): string {
  const trimmed = name.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
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
  const userInitials = getInitials(user.name, user.email);

  return (
    <Header
      variant={variant === "ink" ? "ink" : "paper"}
      userName={user.name || user.email}
      userInitials={userInitials}
      notifCount={unreadCount}
    />
  );
}
