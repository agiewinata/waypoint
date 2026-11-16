import { NextResponse } from "next/server";
import { route, readJson } from "@/server/http";
import { requireOwner } from "@/server/authz";
import { VehiclePatchInput } from "@/lib/validation/vehicle";
import { submitVehicle, updateVehicle } from "@/server/vehicles";

// A4: owner submits a vehicle for admin review, or edits it (update)
export const PATCH = route(async (req, ctx) => {
  const actor = await requireOwner(req);
  const { code } = await ctx!.params;
  const input = await readJson(req, VehiclePatchInput);

  if (input.action === "submit") {
    const result = await submitVehicle(actor.renter.renterID, code);
    return NextResponse.json(result);
  }

  const updated = await updateVehicle(actor.renter.renterID, code, input);
  return NextResponse.json(updated);
});
