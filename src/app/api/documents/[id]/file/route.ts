import { route } from "@/server/http";
import { requireUser } from "@/server/authz";
import { getDocumentFileForViewer } from "@/server/documents";

// Map MIME types to file extensions for Content-Disposition
const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

type RouteContext = { params: Promise<Record<string, string>> };

export const GET = route(async (req, ctx) => {
  const params = await ctx!.params;
  const documentId = params.id;

  // GET is exempt from Origin/CSRF check (handled by route()), but auth is still required
  const actor = await requireUser(req);

  const result = await getDocumentFileForViewer(actor, documentId);

  const ext = EXT_MAP[result.contentType] ?? "bin";
  const filename = `${result.type}-${result.id}.${ext}`;

  // Copy Buffer into a plain Uint8Array<ArrayBuffer> so it satisfies BodyInit
  const body = new Uint8Array(result.bytes);
  return new Response(body, {
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
