/**
 * A YouTube video's thumbnail, served from this site (/api/video-thumbnail?id=…),
 * so a page with a video contacts no third party until the visitor presses play.
 */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return new Response("Invalid video id", { status: 400 });

  const res = await fetch(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`, { next: { revalidate: 86400 } });
  if (!res.ok) return new Response("Thumbnail not found", { status: 404 });
  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
