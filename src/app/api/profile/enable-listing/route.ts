import { NextResponse } from "next/server";
import { route } from "@/server/http";
import { requireUser } from "@/server/authz";
import { enableListing, ProfileExistsError, ProfileMissingError } from "@/server/profiles";
import { HttpError } from "@/server/http";

export const POST = route(async (req) => {
  const actor = await requireUser(req);

  try {
    const renter = await enableListing(actor.user.id);
    return NextResponse.json({ id: renter.renterID }, { status: 201 });
  } catch (err) {
    if (err instanceof ProfileExistsError) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    if (err instanceof ProfileMissingError) {
      throw new HttpError(409, "Complete onboarding first");
    }
    throw err;
  }
});
