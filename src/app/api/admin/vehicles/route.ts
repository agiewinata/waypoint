import { NextResponse } from "next/server";
import { route } from "@/server/http";
import { requireAdmin } from "@/server/authz";
import { listPendingVehicles } from "@/server/admin";

/** AD2 — list vehicles awaiting admin approval */
export const GET = route(async (req) => {
  await requireAdmin(req);
  const items = await listPendingVehicles();
  return NextResponse.json(items);
});
