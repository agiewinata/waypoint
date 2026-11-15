import { z } from "zod";

// ---------------------------------------------------------------------------
// L1: record a GPS location point for an active booking
// ---------------------------------------------------------------------------

export const LocationCreateInput = z.object({
  bookingId: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(10000).optional(),
  speedKph: z.number().min(0).max(400).optional(),
});
export type LocationCreateInputType = z.infer<typeof LocationCreateInput>;
