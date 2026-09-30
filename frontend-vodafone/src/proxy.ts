import { NextResponse, type NextRequest } from "next/server";
import { DEVICE_PAGES, PERSONA_COOKIE, isPersona, resolvePersona } from "@/utils/personaTargeting";

/**
 * Remember the visitor's persona for the rest of the visit (a session
 * cookie), so arriving from a campaign link personalizes every later page.
 * Browsing /devices makes someone a device shopper, unless a campaign has
 * already given them a persona. Pages resolve the persona themselves too
 * (see page.tsx), because this cookie only reaches them on the next request.
 */
export function proxy(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const current = request.cookies.get(PERSONA_COOKIE)?.value;
  const { persona, reset } = resolvePersona({
    override: params.get("persona"),
    utmCampaign: params.get("utm_campaign"),
    utmSource: params.get("utm_source"),
    country: request.headers.get("x-vercel-ip-country"),
    cookie: current,
  });
  const next = !persona && request.nextUrl.pathname.startsWith(DEVICE_PAGES) ? "VodafoneDeviceShopper" : persona;

  const response = NextResponse.next();
  if (reset) response.cookies.delete(PERSONA_COOKIE);
  else if (isPersona(next) && next !== current) {
    response.cookies.set(PERSONA_COOKIE, next, { path: "/", sameSite: "lax" });
  }
  return response;
}

export const config = {
  // Pages only — not Next.js assets, dotCMS images, API routes or files.
  matcher: ["/((?!_next/|dA/|api/|favicon.ico|.*\\.[a-z0-9]+$).*)"],
};
