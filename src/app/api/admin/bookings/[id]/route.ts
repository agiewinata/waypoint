import { NextResponse } from "next/server";
import { route, readJson } from "@/server/http";
import { requireAdmin } from "@/server/authz";
import { AdminBookingAction } from "@/lib/validation/booking";
import { reviewBookingAsAdmin } from "@/server/bookings";

/** AD8 — approve or reject a Confirmed booking */
export const PATCH = route(async (req, ctx) => {
  const actor = await requireAdmin(req);
  const { id } = await ctx!.params;
  const body = await readJson(req, AdminBookingAction);
  const result = await reviewBookingAsAdmin(actor.admin, id, body.action);
  return NextResponse.json(result);
});
