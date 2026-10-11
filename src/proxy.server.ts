import { NextResponse, type NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE, matchLocale } from "@/i18n/config";

/**
 * Prefixes paths without a locale with the visitor's saved or
 * browser-preferred language ("/" → "/ar", "/foo" → "/en/foo").
 * Unknown paths then resolve to the global 404 page.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];
  if (isLocale(first)) return NextResponse.next();

  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved) ? saved : matchLocale(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip API routes, Next internals and files (icon.svg, robots.txt, …).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
