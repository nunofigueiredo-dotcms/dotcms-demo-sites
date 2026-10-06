import type { CalendarEvent, NewsArticle } from "@/types/page";
import { isChecked } from "./content";

// Every date on the site is shown in the school's own time zone, so the
// server render and the browser always agree.
const TIME_ZONE = "America/Chicago";

/**
 * dotCMS dates arrive as "2026-10-21 08:00:00.0" (GraphQL) or as an ISO
 * string or epoch number (page API). They are stored as school-local times,
 * so the wall-clock parts are read as they are, without time-zone shifts.
 */
export function parseDate(value: string | number | null | undefined): Date | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return new Date(value);
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function format(date: Date, options: Intl.DateTimeFormatOptions): string {
  // parseDate keeps wall-clock values in UTC fields; format them back as UTC.
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options }).format(date);
}

/** "September 10, 2026" */
export function longDate(value: string | number | null | undefined): string {
  const d = parseDate(value);
  return d ? format(d, { month: "long", day: "numeric", year: "numeric" }) : "";
}

/** { month: "Oct", day: "21", weekday: "Wednesday" } for date tiles. */
export function dateParts(value: string | null | undefined) {
  const d = parseDate(value);
  if (!d) return { month: "", day: "", weekday: "" };
  return {
    month: format(d, { month: "short" }),
    day: format(d, { day: "numeric" }),
    weekday: format(d, { weekday: "long" }),
  };
}

/** "November 2026", for grouping events by month. */
export function monthLabel(value: string | null | undefined): string {
  const d = parseDate(value);
  return d ? format(d, { month: "long", year: "numeric" }) : "";
}

/** "Nov 23 – 27" or "Dec 21 – Jan 1" for multi-day events; "" for one-day ones. */
export function dateRange(start: string, end?: string | null): string {
  const s = parseDate(start);
  const e = parseDate(end);
  if (!s || !e || s.toISOString().slice(0, 10) === e.toISOString().slice(0, 10)) return "";
  const sameMonth = s.getUTCMonth() === e.getUTCMonth();
  return `${format(s, { month: "short", day: "numeric" })} – ${format(e, sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" })}`;
}

/** "August 2026" */
export function monthYear(value: string | null | undefined): string {
  const d = parseDate(value);
  return d ? format(d, { month: "long", year: "numeric" }) : "";
}

/**
 * Now in Austin, as a wall-clock Date like the ones parseDate returns, so it
 * can be compared with dotCMS dates directly.
 */
export function austinNow(): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, Number(p.value)]),
  );
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute));
}

/** True when a date is more than `months` months before now. */
export function olderThan(value: string | null | undefined, months: number): boolean {
  const d = parseDate(value);
  if (!d) return false;
  const limit = austinNow();
  limit.setUTCMonth(limit.getUTCMonth() - months);
  return d < limit;
}

/** Today's date in Austin as "YYYY-MM-DD", comparable with parsed event dates. */
function todayInAustin(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

/** Events that haven't finished yet, soonest first. */
export function upcomingEvents(events: CalendarEvent[]): CalendarEvent[] {
  const today = todayInAustin();
  return events
    .filter((e) => (parseDate(e.endDate || e.startDate)?.toISOString().slice(0, 10) ?? "") >= today)
    .sort((a, b) => (parseDate(a.startDate)?.getTime() ?? 0) - (parseDate(b.startDate)?.getTime() ?? 0));
}

/** Pinned articles first, then newest first. */
export function latestNews(news: NewsArticle[]): NewsArticle[] {
  const pinned = (n: NewsArticle) => (isChecked(n.pinned, "pinned") ? 1 : 0);
  return [...news].sort(
    (a, b) =>
      pinned(b) - pinned(a) ||
      (parseDate(b.publishDate)?.getTime() ?? 0) - (parseDate(a.publishDate)?.getTime() ?? 0),
  );
}
