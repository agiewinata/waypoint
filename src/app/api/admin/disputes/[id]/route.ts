import { NextResponse } from "next/server";
import { route, readJson } from "@/server/http";
import { requireAdmin } from "@/server/authz";
import { DisputeActionInput } from "@/lib/validation/admin";
import { resolveDispute } from "@/server/admin";

/** AD6 — review, resolve, or reject a dispute */
export const PATCH = route(async (req, ctx) => {
  const actor = await requireAdmin(req);
  const { id } = await ctx!.params;
  const body = await readJson(req, DisputeActionInput);
  const result = await resolveDispute(actor.admin.adminID, id, body.action);
  return NextResponse.json(result);
});
