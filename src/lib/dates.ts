/**
 * Date utilities for the Jakarta timezone (Asia/Jakarta, UTC+7).
 * All "date-only" values are represented as UTC midnight Date objects
 * whose calendar date in Jakarta is what matters.
 */

/**
 * Returns a Date at UTC midnight whose calendar date matches today in Jakarta.
 * e.g. if Jakarta is 2024-03-15 00:30 (UTC+7), returns 2024-03-15T00:00:00.000Z
 */
export function todayJakarta(): Date {
  return new Date(
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" })
  );
}

/**
 * Parses a "YYYY-MM-DD" string to a UTC midnight Date.
 * Throws if the string does not match the expected format.
 */
export function parseDateOnly(s: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error(`Invalid date string: "${s}". Expected YYYY-MM-DD`);
  }
  return new Date(`${s}T00:00:00.000Z`);
}

/**
 * Formats a Date to a "YYYY-MM-DD" string in the Jakarta timezone.
 */
export function toDateOnly(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

/**
 * Returns the integer number of nights (days) between two dates.
 * Uses (end - start) in milliseconds divided by one day.
 */
export function nightsBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
}

/**
 * Returns true when two date ranges overlap.
 * Overlap condition: aStart < bEnd && aEnd > bStart
 * (exclusive on both endpoints — adjacent ranges do NOT overlap)
 */
export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart < bEnd && aEnd > bStart;
}
