import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes without authentication
  const publicPaths = ["/login", "/api/auth", "/_next", "/favicon.ico"];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  if (isPublicPath) {
    return NextResponse.next();
  }

  // In development without a database, skip auth redirect
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  // Check for session token — NextAuth stores it in a cookie.
  // The actual session validation happens server-side in tRPC procedures.
  const sessionToken =
    req.cookies.get("authjs.session-token")?.value ??
    req.cookies.get("__Secure-authjs.session-token")?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
