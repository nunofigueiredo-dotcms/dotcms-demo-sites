import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALE_HEADER, splitLocale } from "@/utils/i18n";

/**
 * Language URLs: /es/articles/x is served by the same route as /articles/x,
 * with the locale passed down in a request header. The browser keeps the
 * /es/ URL. /en/… redirects to the unprefixed English URL.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  const { locale, path } = splitLocale(pathname);
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);

  if (locale === DEFAULT_LOCALE) {
    return NextResponse.next({ request: { headers } });
  }
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = search;
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  // Pages only — not Next.js assets, dotCMS images, or static files.
  matcher: ["/((?!_next/|dA/|api/|brand/|favicon.ico|icon.png|apple-icon.png).*)"],
};
