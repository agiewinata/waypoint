import { z } from "zod";

export const DocumentActionInput = z.object({
  action: z.enum(["verify", "reject"]),
});
export type DocumentActionInputType = z.infer<typeof DocumentActionInput>;

export const VehicleActionInput = z.object({
  action: z.enum(["approve", "reject"]),
});
export type VehicleActionInputType = z.infer<typeof VehicleActionInput>;

export const DisputeActionInput = z.object({
  action: z.enum(["review", "resolve", "reject"]),
});
export type DisputeActionInputType = z.infer<typeof DisputeActionInput>;
