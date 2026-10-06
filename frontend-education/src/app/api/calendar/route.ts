import type { CalendarEvent } from "@/types/page";
import { parseDate } from "@/utils/dates";
import { toICalendar } from "@/utils/ics";

const HOST = process.env.NEXT_PUBLIC_DOTCMS_HOST;
const TOKEN = process.env.NEXT_PUBLIC_DOTCMS_AUTH_TOKEN;
const SITE_ID = process.env.NEXT_PUBLIC_DOTCMS_SITE_ID;
const SCHOOL = "Texas School for the Deaf";

// Category keys and event ids go into a Lucene query: allow only safe characters.
const SAFE = /^[A-Za-z0-9_-]{1,64}$/;

async function loadEvents(filter: string): Promise<CalendarEvent[]> {
  const query = `{
    TsdEventCollection(query: "+conHost:${SITE_ID} +live:true +deleted:false +languageId:1${filter}", limit: 500) {
      identifier title startDate endDate timeText location description
      eventCategories { key name }
    }
  }`;
  const res = await fetch(`${HOST}/api/v1/graphql`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    // Calendar apps poll feeds; five minutes old is fresh enough.
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`dotCMS GraphQL ${res.status}`);
  return (await res.json()).data?.TsdEventCollection ?? [];
}

/**
 * iCalendar feeds of the school calendar, for Google, Outlook and Apple
 * calendars to subscribe to (webcal://…/api/calendar) or download:
 *   /api/calendar                  every event
 *   /api/calendar?category=KEY     one category, e.g. tsd-testing
 *   /api/calendar?event=ID         one event ("Add to calendar")
 * Includes the last 60 days, so recent events don't vanish from calendars.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const category = params.get("category") ?? "";
  const eventId = params.get("event") ?? "";
  if ((category && !SAFE.test(category)) || (eventId && !SAFE.test(eventId))) {
    return new Response("Invalid category or event", { status: 400 });
  }

  // Filtered by category key here rather than in the query: the search
  // index stores categories by variable name, not by key.
  const since = Date.now() - 60 * 24 * 3600 * 1000;
  const events = (await loadEvents(eventId ? ` +identifier:${eventId}` : ""))
    .filter((e) => !category || (e.eventCategories ?? []).some((c) => c.key === category))
    .filter((e) => eventId || (parseDate(e.endDate || e.startDate)?.getTime() ?? 0) >= since)
    .sort((a, b) => (parseDate(a.startDate)?.getTime() ?? 0) - (parseDate(b.startDate)?.getTime() ?? 0));
  if (eventId && !events.length) return new Response("Event not found", { status: 404 });

  const categoryName = events.flatMap((e) => e.eventCategories ?? []).find((c) => c.key === category)?.name;
  const name = eventId ? events[0].title : categoryName ? `${SCHOOL} — ${categoryName}` : SCHOOL;
  const file = eventId ? "event" : category || "tsd-calendar";

  // Event ids stay the same wherever the feed is served from (local, Vercel),
  // so calendar apps never see an event twice.
  return new Response(toICalendar(events, name, "educationdemo.com"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      // A single event downloads as a file; feeds open inline for subscribers.
      "Content-Disposition": `${eventId ? "attachment" : "inline"}; filename="${file}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
