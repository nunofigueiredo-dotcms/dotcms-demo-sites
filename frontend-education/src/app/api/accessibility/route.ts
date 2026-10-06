const HOST = process.env.NEXT_PUBLIC_DOTCMS_HOST;
const TOKEN = process.env.NEXT_PUBLIC_DOTCMS_AUTH_TOKEN;
const SITE_ID = process.env.NEXT_PUBLIC_DOTCMS_SITE_ID;

/**
 * The accessibility report for a page's sections (draft versions), for the
 * editor panel. It asks the TSD accessibility plugin in dotCMS
 * (osgi/tsd-accessibility-check), which applies the same rules as the
 * "Check accessibility" workflow step:
 *   /api/accessibility?path=/outreach
 */
export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path") || "/";
  if (!/^\/[A-Za-z0-9/_-]*$/.test(path)) return Response.json({ error: "Invalid path" }, { status: 400 });

  const url = `${HOST}/api/v1/tsd/accessibility/page?site=${SITE_ID}&path=${encodeURIComponent(path)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` }, cache: "no-store" });
  if (!res.ok) return Response.json({ error: `dotCMS answered ${res.status}` }, { status: 502 });
  return Response.json((await res.json()).entity, { headers: { "Cache-Control": "no-store" } });
}
