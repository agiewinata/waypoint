import { NextResponse } from "next/server";
import { route, readJson, readQuery } from "@/server/http";
import { requireOwner } from "@/server/authz";
import { VehicleCreateInput, VehicleSearchQuery } from "@/lib/validation/vehicle";
import { listPublicVehicles, createVehicle } from "@/server/vehicles";

// A1: public vehicle listing (no auth)
export const GET = route(async (req) => {
  const query = await readQuery(req, VehicleSearchQuery);
  const result = await listPublicVehicles(query);
  return NextResponse.json(result);
});

// A3: owner creates a vehicle
export const POST = route(async (req) => {
  const actor = await requireOwner(req);
  const input = await readJson(req, VehicleCreateInput);
  const result = await createVehicle(actor.renter.renterID, input);
  return NextResponse.json(result, { status: 201 });
});
