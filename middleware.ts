import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("mis_session");

  // Redirect legacy /login to /connexion
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }

  // If visiting /connexion while already having a session cookie, redirect to /dashboard
  if (pathname === "/connexion" && sessionCookie?.value) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If visiting /dashboard without a session cookie, redirect to /connexion
  if (pathname.startsWith("/dashboard") && !sessionCookie?.value) {
    const loginUrl = new URL("/connexion", request.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/connexion", "/dashboard/:path*"],
};
