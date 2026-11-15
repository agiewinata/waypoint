import { NextResponse } from "next/server";
import { route } from "@/server/http";
import { requireAdmin } from "@/server/authz";
import { listPendingVerifications } from "@/server/admin";

/** AD1 — list pending customer document verifications */
export const GET = route(async (req) => {
  await requireAdmin(req);
  const items = await listPendingVerifications();
  return NextResponse.json(items);
});
