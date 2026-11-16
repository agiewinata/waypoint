import { NextResponse } from "next/server";
import { route, readJson, HttpError } from "@/server/http";
import { requireUser } from "@/server/authz";
import { BookingAction } from "@/lib/validation/booking";
import { transitionBooking, cancelBooking } from "@/server/bookings";

// PATCH /api/bookings/:id
// B3 — owner transitions a booking (confirm, decline, start, complete);
// customer cancels a booking (cancel).
export const PATCH = route(async (req, ctx) => {
  const actor = await requireUser(req);
  const params = await ctx?.params;
  const id = params?.["id"] ?? "";
  const body = await readJson(req, BookingAction);
  const action = body.action;

  if (action === "cancel") {
    const renteeID = actor.rentee?.renteeID;
    if (!renteeID) throw new HttpError(403, "Customer profile required");
    const result = await cancelBooking(renteeID, id);
    return NextResponse.json(result);
  }

  if (!actor.renter) throw new HttpError(403, "Owner profile required");
  const result = await transitionBooking(actor.renter.renterID, id, action);

  return NextResponse.json(result);
});
