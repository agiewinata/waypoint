import { NextResponse } from "next/server";
import { z } from "zod";

// ---------------------------------------------------------------------------
// HttpError — carry a status code + optional field-level validation details
// ---------------------------------------------------------------------------

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fields?: Record<string, string[]>
  ) {
    super(message);
    this.name = "HttpError";
  }
}

// ---------------------------------------------------------------------------
// Route handler types
// ---------------------------------------------------------------------------

type RouteContext = { params: Promise<Record<string, string>> };
type Handler = (req: Request, ctx?: RouteContext) => Promise<Response>;

// ---------------------------------------------------------------------------
// Origin / CSRF guard
// Trusted origins are taken from BETTER_AUTH_TRUSTED_ORIGINS (comma-separated)
// with BETTER_AUTH_URL as a fallback.
// ---------------------------------------------------------------------------

function getTrustedOrigins(): string[] {
  const raw =
    process.env.BETTER_AUTH_TRUSTED_ORIGINS ??
    process.env.BETTER_AUTH_URL ??
    "";
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// route() — wraps a Next.js route handler with:
//   • Origin check for non-GET requests → 403 on mismatch
//   • HttpError → its status + { error, fields? }
//   • ZodError → 400 { error: "Validation error", fields }
//   • anything else → console.error + 500 { error: "Internal error" }
// ---------------------------------------------------------------------------

export function route(handler: Handler): Handler {
  return async (req: Request, ctx?: RouteContext): Promise<Response> => {
    try {
      if (req.method !== "GET") {
        const origin = req.headers.get("Origin");
        const trusted = getTrustedOrigins();
        if (!origin || (trusted.length > 0 && !trusted.includes(origin))) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) {
        const body: { error: string; fields?: Record<string, string[]> } = {
          error: err.message,
        };
        if (err.fields) body.fields = err.fields;
        return NextResponse.json(body, { status: err.status });
      }

      if (err instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: "Validation error",
            fields: z.flattenError(err).fieldErrors as Record<string, string[]>,
          },
          { status: 400 }
        );
      }

      const url = new URL(req.url);
      console.error(`[${req.method} ${url.pathname}]`, err);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  };
}

// ---------------------------------------------------------------------------
// readJson — parse + validate a JSON request body
// Throws HttpError 400 on malformed JSON; throws HttpError 400 with field
// errors on schema validation failure.
// ---------------------------------------------------------------------------

export async function readJson<T>(
  req: Request,
  schema: z.ZodType<T>
): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HttpError(
      400,
      "Validation error",
      z.flattenError(result.error).fieldErrors as Record<string, string[]>
    );
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// readQuery — parse + validate URL search params as a plain object
// ---------------------------------------------------------------------------

export async function readQuery<T>(
  req: Request,
  schema: z.ZodType<T>
): Promise<T> {
  const url = new URL(req.url);
  const raw: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    raw[k] = v;
  });
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new HttpError(
      400,
      "Validation error",
      z.flattenError(result.error).fieldErrors as Record<string, string[]>
    );
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// isPrismaError — check whether an unknown thrown value is a Prisma error
// with a specific error code (e.g. "P2002" for unique constraint violation).
// ---------------------------------------------------------------------------

export function isPrismaError(err: unknown, code: string | string[]): boolean {
  if (typeof err !== "object" || err === null || !("code" in err)) return false;
  const prismaCode = (err as { code: unknown }).code;
  if (typeof prismaCode !== "string") return false;
  return Array.isArray(code) ? code.includes(prismaCode) : prismaCode === code;
}
