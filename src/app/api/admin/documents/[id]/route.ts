import { NextResponse } from "next/server";
import { route, readJson } from "@/server/http";
import { requireAdmin } from "@/server/authz";
import { DocumentActionInput } from "@/lib/validation/admin";
import { verifyDocument } from "@/server/admin";

/** AD4 — verify or reject a customer document */
export const PATCH = route(async (req, ctx) => {
  const actor = await requireAdmin(req);
  const { id } = await ctx!.params;
  const body = await readJson(req, DocumentActionInput);
  const result = await verifyDocument(actor.admin.adminID, id, body.action);
  return NextResponse.json(result);
});
