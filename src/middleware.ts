import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { rolePages } from "./lib/rolePages";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const role = request.cookies.get("user_role")?.value;

  if (!role || !(role in rolePages)) {
    return NextResponse.redirect(new URL("/401", request.url));
  }

  const pagesForRole = rolePages[role as keyof typeof rolePages];

  if (!pagesForRole.includes(pathname)) {
    return NextResponse.redirect(new URL("/401", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/master-coding",
    "/phase-in-out",
    "/results",
    "/prices",
    "/price-group",
    "/upload-center",
    "/branch-master",
    "/branch-rfc",
    "/marketing-rfc",
    "/dawlance-rfc",
    "/access-timeframe",
    "/roles",
    "/users",
  ],
};
