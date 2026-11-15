import { NextResponse } from "next/server";
import { route, readJson } from "@/server/http";
import { requireCustomer } from "@/server/authz";
import { PaymentCreateInput } from "@/lib/validation/payment";
import { createPayment } from "@/server/payments";

export const POST = route(async (req) => {
  const actor = await requireCustomer(req);
  const input = await readJson(req, PaymentCreateInput);
  const result = await createPayment(actor.rentee.renteeID, input);
  return NextResponse.json(result, { status: 201 });
});
