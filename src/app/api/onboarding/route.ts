import { NextResponse } from "next/server";
import { route, readJson } from "@/server/http";
import { OnboardingInput } from "@/lib/validation/profile";
import { requireUser } from "@/server/authz";
import { createProfile, ProfileExistsError } from "@/server/profiles";

export const POST = route(async (req) => {
  const actor = await requireUser(req);
  const { name, phone, address } = await readJson(req, OnboardingInput);

  try {
    await createProfile(actor.user.id, name, phone, address);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof ProfileExistsError) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    throw err;
  }
});
