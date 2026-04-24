import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/landing", "/login", "/signup", "/api/auth"];

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isPublic = PUBLIC_PATHS.some((p) => nextUrl.pathname.startsWith(p));

  if (!session && !isPublic) {
    const url = nextUrl.clone();
    url.pathname = "/landing";
    return NextResponse.redirect(url);
  }
  if (session && (nextUrl.pathname === "/login" || nextUrl.pathname === "/signup")) {
    const url = nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)",
  ],
};
