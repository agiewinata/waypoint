/**
 * Formats an integer amount as Indonesian Rupiah.
 * e.g. 150000 → "Rp 150.000"
 */
export function formatIDR(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Formats a date/ISO string as a human-readable date in the Jakarta timezone.
 * e.g. "15 Mar 2024" (id-ID locale with medium dateStyle)
 */
export function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(d);
}
