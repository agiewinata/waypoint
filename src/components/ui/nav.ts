export type NavItem = { href: string; label: string; icon: string };

export const OWNER_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/owner",           label: "Overview",      icon: "ph:squares-four" },
  { href: "/dashboard/owner/cars",      label: "My Cars",       icon: "ph:car" },
  { href: "/dashboard/owner/list",      label: "List a car",    icon: "ph:plus-circle" },
  { href: "/dashboard/owner/verify",    label: "Verification",  icon: "ph:shield-check" },
  { href: "/dashboard/owner/earnings",  label: "Earnings",      icon: "ph:currency-circle-dollar" },
  { href: "/messages",                  label: "Messages",      icon: "ph:chat-dots" },
  { href: "/notifications",             label: "Notifications", icon: "ph:bell" },
  { href: "/account",                   label: "Account",       icon: "ph:user" },
];

export const CUSTOMER_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/customer",        label: "My Trips",      icon: "ph:car" },
  { href: "/dashboard/customer/verify", label: "Verification",  icon: "ph:identification-card" },
  { href: "/messages",                  label: "Messages",      icon: "ph:chat-dots" },
  { href: "/notifications",             label: "Notifications", icon: "ph:bell" },
  { href: "/account",                   label: "Account",       icon: "ph:user" },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/admin",               label: "Overview",      icon: "ph:squares-four" },
  { href: "/dashboard/admin#verifications", label: "Verifications", icon: "ph:identification-card" },
  { href: "/dashboard/admin#vehicles",      label: "Vehicles",      icon: "ph:car" },
  { href: "/dashboard/admin#bookings",      label: "Bookings",      icon: "ph:calendar" },
  { href: "/dashboard/admin#disputes",      label: "Disputes",      icon: "ph:scales" },
];
