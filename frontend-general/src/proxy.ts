import { NextResponse, type NextRequest } from "next/server";
import { localeForLanguageId, splitLocale } from "@/utils/i18n";

/**
 * Tells the root layout which language the page is in, so <html> gets the
 * right lang and dir (Arabic is right to left). Arabic pages are /ar/…; the
 * Universal Visual Editor instead asks for a page with ?language_id=….
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const locale = localeForLanguageId(searchParams.get("language_id")) ?? splitLocale(pathname).locale;
  const headers = new Headers(request.headers);
  headers.set("x-locale", locale);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Pages only: not Next's own files, the image proxy or files with an extension.
  matcher: ["/((?!_next/|dA/|api/|.*\\.[a-z0-9]+$).*)"],
};
