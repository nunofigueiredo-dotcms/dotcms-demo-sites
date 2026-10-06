import type { NewsArticle } from "@/types/page";
import { latestNews, parseDate } from "@/utils/dates";

const HOST = process.env.NEXT_PUBLIC_DOTCMS_HOST;
const TOKEN = process.env.NEXT_PUBLIC_DOTCMS_AUTH_TOKEN;
const SITE_ID = process.env.NEXT_PUBLIC_DOTCMS_SITE_ID;
const SCHOOL = "Texas School for the Deaf";

const SAFE = /^[A-Za-z0-9_-]{1,64}$/;

async function loadNews(): Promise<NewsArticle[]> {
  const query = `{
    TsdNewsCollection(query: "+conHost:${SITE_ID} +live:true +deleted:false +languageId:1", limit: 200) {
      identifier title urlTitle publishDate teaser pinned
      newsCategories { key name }
    }
  }`;
  const res = await fetch(`${HOST}/api/v1/graphql`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`dotCMS GraphQL ${res.status}`);
  return (await res.json()).data?.TsdNewsCollection ?? [];
}

const xml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const austinHour = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", hourCycle: "h23" });

/**
 * RFC 822 date for RSS. Publish dates are school-local wall-clock times, so
 * find the instant that is that time in Austin (UTC−5 in summer, −6 in winter).
 */
function rssDate(value: string): string {
  const local = parseDate(value);
  if (!local) return "";
  const instant = [5, 6]
    .map((offset) => new Date(local.getTime() + offset * 3600 * 1000))
    .find((d) => Number(austinHour.format(d)) === local.getUTCHours());
  return (instant ?? local).toUTCString();
}

/**
 * RSS 2.0 feeds of the news, for feed readers, newsletters and other sites:
 *   /api/news                  every article
 *   /api/news?category=KEY     one category, e.g. tsd-news-lone-star
 * Newest first (RSS readers sort by date, so pinning doesn't apply here).
 */
export async function GET(request: Request) {
  const category = new URL(request.url).searchParams.get("category") ?? "";
  if (category && !SAFE.test(category)) return new Response("Invalid category", { status: 400 });

  const origin = new URL(request.url).origin;
  const all = await loadNews();
  const articles = latestNews(all.map((a) => ({ ...a, pinned: undefined }))).filter(
    (a) => !category || (a.newsCategories ?? []).some((c) => c.key === category),
  );
  const categoryName = all.flatMap((a) => a.newsCategories ?? []).find((c) => c.key === category)?.name;
  const title = categoryName ? `${SCHOOL} — ${categoryName}` : `${SCHOOL} — News`;
  const self = `${origin}/api/news${category ? `?category=${category}` : ""}`;

  const items = articles.map((a) => {
    const link = `${origin}/news/${a.urlTitle}`;
    return [
      "<item>",
      `<title>${xml(a.title)}</title>`,
      `<link>${xml(link)}</link>`,
      `<guid isPermaLink="false">${a.identifier}@educationdemo.com</guid>`,
      `<pubDate>${rssDate(a.publishDate)}</pubDate>`,
      `<description>${xml(a.teaser ?? "")}</description>`,
      ...(a.newsCategories ?? []).map((c) => `<category>${xml(c.name)}</category>`),
      "</item>",
    ].join("");
  });

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>${xml(title)}</title>
<link>${xml(`${origin}/news${category ? `?category=${category}` : ""}`)}</link>
<description>${xml(`News and announcements from ${SCHOOL}`)}</description>
<language>en-us</language>
<atom:link href="${xml(self)}" rel="self" type="application/rss+xml"/>
${items.join("\n")}
</channel></rss>
`;
  return new Response(body, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}
