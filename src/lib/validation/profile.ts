import { z } from "zod";

export const OnboardingInput = z.object({
  name: z.string().min(1).max(100).trim(),
  phone: z.string().regex(/^\+?[0-9 ()-]{7,20}$/),
  address: z.string().min(1).max(500),
});

export type OnboardingInput = z.infer<typeof OnboardingInput>;

export const ProfileUpdateInput = OnboardingInput.partial().superRefine((val, ctx) => {
  if (Object.keys(val).length === 0) {
    ctx.addIssue({ code: "custom", message: "At least one field is required" });
  }
});

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateInput>;
