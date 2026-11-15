import { z } from "zod";

export const PaymentCreateInput = z.object({
  bookingId: z.string(),
  method: z.enum(["BankTransfer", "EWallet", "Card"]),
});

export type PaymentCreateInput = z.infer<typeof PaymentCreateInput>;

export const PaymentAction = z.object({
  action: z.enum(["release", "fail"]),
});

export type PaymentAction = z.infer<typeof PaymentAction>;
