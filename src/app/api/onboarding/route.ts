import { NextResponse } from "next/server";
import { route } from "@/server/http";
import { OnboardingInput } from "@/lib/validation/profile";
import { requireUser } from "@/server/authz";
import { createProfile, ProfileExistsError } from "@/server/profiles";

export const POST = route(async (req) => {
  const actor = await requireUser(req);
  const body = await req.json();

  const parsed = OnboardingInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, phone, address } = parsed.data;
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
