import { z } from "zod";

export const OnboardingInput = z.object({
  name: z.string().min(1).max(100).trim(),
  phone: z.string().regex(/^\+?[0-9 ()-]{7,20}$/),
  address: z.string().min(1).max(500),
});

export type OnboardingInput = z.infer<typeof OnboardingInput>;
