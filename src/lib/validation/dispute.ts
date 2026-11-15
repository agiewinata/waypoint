import { z } from "zod";

// ---------------------------------------------------------------------------
// D1: raise a dispute on a booking
// ---------------------------------------------------------------------------

export const DisputeCreateInput = z.object({
  bookingId: z.string(),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(2000, "Description must be at most 2000 characters")
    .transform((s) => s.trim()),
});
export type DisputeCreateInputType = z.infer<typeof DisputeCreateInput>;
