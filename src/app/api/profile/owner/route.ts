import { NextResponse } from "next/server";
import { ProfileInput } from "@/lib/validation/profile";
import { requireSession } from "@/server/session";
import {
  createRenterProfile,
  ProfileExistsError,
} from "@/server/profiles";

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid input", fields: {} }, { status: 400 });
  }

  const parsed = ProfileInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Get userId from session — never from body
  const userId = session.user.id;

  try {
    const profile = await createRenterProfile(userId, parsed.data);
    return NextResponse.json({ id: profile.renterID }, { status: 201 });
  } catch (err) {
    if (err instanceof ProfileExistsError) {
      return NextResponse.json({ error: "Profile already exists" }, { status: 409 });
    }
    console.error("[POST /api/profile/owner]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
