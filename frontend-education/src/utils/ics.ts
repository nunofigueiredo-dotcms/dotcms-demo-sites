import type { CalendarEvent } from "@/types/page";

// iCalendar (RFC 5545) for the calendar feeds and "Add to calendar" files.
// Event times are school-local wall-clock values ("2026-10-21 08:00:00"),
// so they're written with TZID=America/Chicago and a matching VTIMEZONE.

const TZID = "America/Chicago";
const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  `TZID:${TZID}`,
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:-0600",
  "TZOFFSETTO:-0500",
  "TZNAME:CDT",
  "DTSTART:19700308T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0600",
  "TZNAME:CST",
  "DTSTART:19701101T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

interface Parts {
  y: number;
  m: number;
  d: number;
  h: number;
  min: number;
}

function parts(value: string | null | undefined): Parts | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value ?? "");
  return m ? { y: +m[1], m: +m[2], d: +m[3], h: +m[4], min: +m[5] } : undefined;
}

const pad = (n: number) => String(n).padStart(2, "0");
const date = (p: Parts) => `${p.y}${pad(p.m)}${pad(p.d)}`;
const dateTime = (p: Parts) => `${date(p)}T${pad(p.h)}${pad(p.min)}00`;

/** The day after, for an all-day event's exclusive end date. */
function nextDay(p: Parts): Parts {
  const d = new Date(Date.UTC(p.y, p.m - 1, p.d + 1));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: 0, min: 0 };
}

/** The end time from a time like "8 AM – 3 PM", on the start's day. */
function endFromTimeText(start: Parts, timeText: string | null | undefined): Parts | undefined {
  const m = /[–-]\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i.exec(timeText ?? "");
  if (!m) return undefined;
  const hour = (+m[1] % 12) + (m[3].toUpperCase() === "PM" ? 12 : 0);
  return { ...start, h: hour, min: m[2] ? +m[2] : 0 };
}

/** Escape text values (RFC 5545 §3.3.11). */
const text = (value: string) => value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Fold lines longer than 75 characters (RFC 5545 §3.1). */
function fold(line: string): string {
  const chunks: string[] = [];
  for (let i = 0; i < line.length; i += 73) chunks.push(line.slice(i, i + 73));
  return chunks.join("\r\n ");
}

function vevent(event: CalendarEvent, site: string, stamp: string): string[] {
  const start = parts(event.startDate);
  if (!start) return [];
  const end = parts(event.endDate);
  // No time given and starting at midnight: an all-day (or multi-day) event.
  const allDay = !event.timeText && start.h === 0 && start.min === 0;
  const lines = ["BEGIN:VEVENT", `UID:${event.identifier}@${site}`, `DTSTAMP:${stamp}`];
  if (allDay) {
    lines.push(`DTSTART;VALUE=DATE:${date(start)}`, `DTEND;VALUE=DATE:${date(nextDay(end ?? start))}`);
  } else {
    const finish = end ?? endFromTimeText(start, event.timeText) ?? { ...start, h: Math.min(start.h + 1, 23) };
    lines.push(`DTSTART;TZID=${TZID}:${dateTime(start)}`, `DTEND;TZID=${TZID}:${dateTime(finish)}`);
  }
  lines.push(`SUMMARY:${text(event.title)}`);
  if (event.location) lines.push(`LOCATION:${text(event.location)}`);
  const description = [event.description, event.timeText && `Time: ${event.timeText}`].filter(Boolean).join("\n");
  if (description) lines.push(`DESCRIPTION:${text(description)}`);
  const categories = (event.eventCategories ?? []).map((c) => text(c.name));
  if (categories.length) lines.push(`CATEGORIES:${categories.join(",")}`);
  lines.push("END:VEVENT");
  return lines;
}

/** A complete iCalendar file for these events. */
export function toICalendar(events: CalendarEvent[], calendarName: string, site: string): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Texas School for the Deaf//dotCMS demo//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${text(calendarName)}`,
    `X-WR-TIMEZONE:${TZID}`,
    ...VTIMEZONE,
    ...events.flatMap((e) => vevent(e, site, stamp)),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
