import { NextResponse } from "next/server";
import { route } from "@/server/http";
import { requireOwner } from "@/server/authz";
import { listVehiclesForOwner } from "@/server/vehicles";

// A2: owner lists their own vehicles
export const GET = route(async (req) => {
  const actor = await requireOwner(req);
  const result = await listVehiclesForOwner(actor.renter.renterID);
  return NextResponse.json(result);
});
