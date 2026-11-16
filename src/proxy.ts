import { type NextRequest, NextResponse } from "next/server";

// Routes that require a session. Proxy does a lightweight cookie-presence check;
// the page itself does full session validation.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/trips",
  "/notifications",
  "/disputes",
  "/booking/success",
  "/account",
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!isProtected) return NextResponse.next();

  // Better Auth's session cookie prefix + name
  const sessionCookie =
    req.cookies.get("better-auth.session_token") ??
    req.cookies.get("__Secure-better-auth.session_token");

  if (!sessionCookie) {
    const signinUrl = req.nextUrl.clone();
    signinUrl.pathname = "/auth/signin";
    return NextResponse.redirect(signinUrl, { status: 307 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/trips/:path*",
    "/notifications",
    "/disputes/:path*",
    "/booking/success",
    "/account",
  ],
};
