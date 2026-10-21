const HOST = process.env.NEXT_PUBLIC_DOTCMS_HOST;

/**
 * A WebVTT captions file from the dotCMS media library, served as text/vtt:
 *   /api/captions/{file identifier}.vtt
 * dotCMS doesn't know the .vtt type and sends "unknown", which some browsers
 * refuse for <track>. Captions kept next to a video on Google Cloud Storage
 * don't need this; GCS sends the type set on upload (text/vtt).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const match = /^([0-9a-f]{32})\.vtt$/.exec((await params).file);
  if (!match) return new Response("Not found", { status: 404 });

  const res = await fetch(`${HOST}/dA/${match[1]}`, { next: { revalidate: 3600 } });
  if (!res.ok) return new Response("Not found", { status: 404 });
  const text = await res.text();
  if (!text.startsWith("WEBVTT")) return new Response("Not a WebVTT file", { status: 415 });

  return new Response(text, {
    headers: {
      "Content-Type": "text/vtt; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      // <track> loads cross-origin with CORS, so the link also works from other hosts (local dev).
      "Access-Control-Allow-Origin": "*",
    },
  });
}
