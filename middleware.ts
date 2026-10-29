
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const sessionCookie = request.cookies.get("mis_session");

  // Si l'utilisateur possède déjà une session, quitter la page de connexion
  if (pathname === "/login" && sessionCookie?.value) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Protéger le dashboard si aucune session n'existe
  if (pathname.startsWith("/dashboard") && !sessionCookie?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnUrl", pathname + search);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/dashboard/:path*"],
};
