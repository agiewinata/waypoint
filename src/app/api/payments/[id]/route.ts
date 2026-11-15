import { NextResponse } from "next/server";
import { route, readJson } from "@/server/http";
import { requireUser } from "@/server/authz";
import { PaymentAction } from "@/lib/validation/payment";
import { transitionPayment } from "@/server/payments";

type RouteCtx = { params: Promise<{ id: string }> };

export const PATCH = route(async (req, ctx) => {
  const actor = await requireUser(req);
  const { id } = await (ctx as RouteCtx).params;
  const input = await readJson(req, PaymentAction);
  const result = await transitionPayment(actor, id, input.action);
  return NextResponse.json(result, { status: 200 });
});
