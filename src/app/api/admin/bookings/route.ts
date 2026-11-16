import { NextResponse } from "next/server";
import { route } from "@/server/http";
import { requireAdmin } from "@/server/authz";
import { listBookingsAwaitingApproval } from "@/server/bookings";

/** AD7 — list Confirmed bookings that no Admin has approved yet */
export const GET = route(async (req) => {
  await requireAdmin(req);
  const items = await listBookingsAwaitingApproval();
  return NextResponse.json({ items });
});
