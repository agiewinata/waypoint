import { NextResponse } from "next/server";
import { route, readJson, readQuery } from "@/server/http";
import { requireUser, requireCustomer } from "@/server/authz";
import { BookingCreateInput, BookingListQuery } from "@/lib/validation/booking";
import {
  createBooking,
  listBookingsForOwner,
  listBookingsForCustomer,
} from "@/server/bookings";
import { HttpError } from "@/server/http";

// GET /api/bookings?as=owner|customer[&status=...]
// B1 — list bookings for the signed-in user in the requested role.
export const GET = route(async (req) => {
  const actor = await requireUser(req);
  const query = await readQuery(req, BookingListQuery);

  if (query.as === "owner") {
    if (!actor.renter) throw new HttpError(403, "Owner profile required");
    const result = await listBookingsForOwner(actor.renter.renterID, query.status);
    return NextResponse.json(result);
  } else {
    if (!actor.rentee) throw new HttpError(403, "Customer profile required");
    const result = await listBookingsForCustomer(actor.rentee.renteeID, query.status);
    return NextResponse.json(result);
  }
});

// POST /api/bookings
// B2 — create a new booking (customer only).
export const POST = route(async (req) => {
  const actor = await requireCustomer(req);
  const body = await readJson(req, BookingCreateInput);

  const result = await createBooking(
    actor.rentee.renteeID,
    actor.user.id,
    body.listingCode,
    body.startDate,
    body.endDate,
    body.locationConsent
  );

  return NextResponse.json(result, { status: 201 });
});
