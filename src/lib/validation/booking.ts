import { z } from "zod";
import { BookingStatus } from "@/generated/prisma/client";
import { todayJakarta, nightsBetween } from "@/lib/dates";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const BookingCreateInput = z.object({
  listingCode: z.string(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  locationConsent: z.boolean(),
});
export type BookingCreateInput = z.infer<typeof BookingCreateInput>;

export const BookingListQuery = z.object({
  as: z.enum(["owner", "customer"]),
  status: z.nativeEnum(BookingStatus).optional(),
});
export type BookingListQuery = z.infer<typeof BookingListQuery>;

export const BookingAction = z.object({
  action: z.enum(["confirm", "decline", "start", "complete"]),
});
export type BookingAction = z.infer<typeof BookingAction>;

export class BookingDateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingDateError";
  }
}

// ---------------------------------------------------------------------------
// Server-side date range validation (pure, no DB).
// Called by the booking service after parsing string inputs to Dates.
//
// @param today - Defaults to todayJakarta(). Pass explicitly in tests to
//   avoid depending on the system clock.
// ---------------------------------------------------------------------------

export function validateBookingDates(
  startDate: Date,
  endDate: Date,
  today = todayJakarta()
): void {
  if (endDate <= startDate) {
    throw new BookingDateError("End date must be after start date");
  }
  if (startDate < today) {
    throw new BookingDateError("Start date cannot be in the past");
  }
  const nights = nightsBetween(startDate, endDate);
  if (nights > 30) {
    throw new BookingDateError("Booking cannot exceed 30 nights");
  }
  const maxAhead = new Date(today.getTime() + 180 * 86_400_000);
  if (startDate > maxAhead) {
    throw new BookingDateError("Start date cannot be more than 180 days in the future");
  }
}
