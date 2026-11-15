import { NextResponse } from "next/server";
import { route, readJson } from "@/server/http";
import { requireOwner } from "@/server/authz";
import { VehicleSubmitInput } from "@/lib/validation/vehicle";
import { submitVehicle } from "@/server/vehicles";

// A4: owner submits a vehicle for admin review
export const PATCH = route(async (req, ctx) => {
  const actor = await requireOwner(req);
  const { code } = await ctx!.params;
  await readJson(req, VehicleSubmitInput);
  const result = await submitVehicle(actor.renter.renterID, code);
  return NextResponse.json(result);
});
