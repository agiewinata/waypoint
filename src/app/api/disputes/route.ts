import { NextResponse } from "next/server";
import { route, readJson } from "@/server/http";
import { requireUser } from "@/server/authz";
import { DisputeCreateInput } from "@/lib/validation/dispute";
import { raiseDispute } from "@/server/disputes";

// POST /api/disputes — D1: raise a dispute on a booking
// Both owners (Renters) and customers (Rentees) may raise disputes.
// The service determines the caller's role by matching IDs against the booking.
export const POST = route(async (req) => {
  const actor = await requireUser(req);
  const input = await readJson(req, DisputeCreateInput);
  const result = await raiseDispute(actor, input);
  return NextResponse.json(result, { status: 201 });
});
