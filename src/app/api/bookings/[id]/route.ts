import { NextResponse } from "next/server";
import { route, readJson } from "@/server/http";
import { requireOwner } from "@/server/authz";
import { BookingAction } from "@/lib/validation/booking";
import { transitionBooking } from "@/server/bookings";

// PATCH /api/bookings/:id
// B3 — owner transitions a booking (confirm, decline, start, complete).
export const PATCH = route(async (req, ctx) => {
  const actor = await requireOwner(req);
  const params = await ctx?.params;
  const id = params?.["id"] ?? "";
  const body = await readJson(req, BookingAction);

  const result = await transitionBooking(
    actor.renter.renterID,
    id,
    body.action
  );

  return NextResponse.json(result);
});
