import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";

// Use Node.js runtime because jsonwebtoken requires Node's crypto
export const runtime = "nodejs";

// Public paths that don't require authentication
const PUBLIC_PATHS = ["/login", "/_next", "/api/auth", "/favicon.ico"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  for (const publicPath of PUBLIC_PATHS) {
    if (pathname.startsWith(publicPath)) {
      return NextResponse.next();
    }
  }

  // Check session for protected routes
  const session = await getSessionFromRequest(request);

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (public login page)
     * - api/auth (public auth API routes)
     */
    "/((?!_next/static|_next/image|favicon.ico|login|api/auth).*)",
  ],
};
