import { NextResponse } from "next/server";
import { route } from "@/server/http";
import { requireAdmin } from "@/server/authz";
import { listOpenDisputes } from "@/server/admin";

/** AD3 — list open and under-review disputes */
export const GET = route(async (req) => {
  await requireAdmin(req);
  const items = await listOpenDisputes();
  return NextResponse.json(items);
});
