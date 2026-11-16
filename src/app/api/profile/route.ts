import { NextResponse } from "next/server";
import { route, readJson, HttpError } from "@/server/http";
import { requireUser } from "@/server/authz";
import { ProfileUpdateInput } from "@/lib/validation/profile";
import { updateProfile, ProfileMissingError } from "@/server/profiles";

export const PATCH = route(async (req) => {
  const actor = await requireUser(req);
  const input = await readJson(req, ProfileUpdateInput);

  try {
    const overview = await updateProfile(actor.user.id, input);
    return NextResponse.json(overview);
  } catch (err) {
    if (err instanceof ProfileMissingError) {
      throw new HttpError(409, "Complete onboarding first");
    }
    throw err;
  }
});
