import { NextResponse } from "next/server";
import { route, readJson } from "@/server/http";
import { requireCustomer } from "@/server/authz";
import { LocationCreateInput } from "@/lib/validation/location";
import { recordLocation } from "@/server/location";

// POST /api/location — L1: record a GPS location point for an active booking
// Only the customer (Rentee) on the booking may submit location updates.
export const POST = route(async (req) => {
  const actor = await requireCustomer(req);
  const input = await readJson(req, LocationCreateInput);
  const result = await recordLocation(actor.rentee.renteeID, input);
  return NextResponse.json(result, { status: 201 });
});
