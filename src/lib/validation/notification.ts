import { z } from "zod";

// ---------------------------------------------------------------------------
// MarkReadInput — PATCH /api/notifications
// Either mark all unread, or mark a specific set of IDs.
// ---------------------------------------------------------------------------

export const MarkReadInput = z.union([
  z.object({ all: z.literal(true) }),
  z.object({ ids: z.array(z.string()).min(1).max(100) }),
]);
export type MarkReadInput = z.infer<typeof MarkReadInput>;
