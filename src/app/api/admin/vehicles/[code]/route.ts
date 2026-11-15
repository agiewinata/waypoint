import { NextResponse } from "next/server";
import { route, readJson } from "@/server/http";
import { requireAdmin } from "@/server/authz";
import { VehicleActionInput } from "@/lib/validation/admin";
import { approveVehicle } from "@/server/admin";

/** AD5 — approve or reject a vehicle listing */
export const PATCH = route(async (req, ctx) => {
  const actor = await requireAdmin(req);
  const { code } = await ctx!.params;
  const body = await readJson(req, VehicleActionInput);
  const result = await approveVehicle(actor.admin.adminID, code, body.action);
  return NextResponse.json(result);
});
