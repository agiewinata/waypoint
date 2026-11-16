import { z } from "zod";

export const ProfileInput = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().max(191).optional(),
  phone: z.string().regex(/^\+?[0-9 ()-]{7,20}$/),
  address: z.string().min(1).max(500),
});

export type ProfileInput = z.infer<typeof ProfileInput>;

export const OnboardingInput = z.object({
  name: z.string().min(1).max(100).trim(),
  phone: z.string().regex(/^\+?[0-9 ()-]{7,20}$/),
  address: z.string().min(1).max(500),
});

export type OnboardingInput = z.infer<typeof OnboardingInput>;
