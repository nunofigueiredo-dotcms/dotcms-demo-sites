import { INTL_LOCALE, type Locale } from "./i18n";

/**
 * Event dates are entered in Dubai time (UTC+4, no daylight saving) and
 * arrive as "2026-10-25 20:00:00.0", an ISO string or epoch milliseconds,
 * depending on the API. They're handled as Dubai wall-clock times held in a
 * UTC Date, so formatting with timeZone "UTC" shows them as entered.
 */
const DUBAI_OFFSET_MS = 4 * 60 * 60 * 1000;

export function parseDate(value: unknown): Date | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return new Date(value + DUBAI_OFFSET_MS);
  const s = String(value);
  if (/^\d+$/.test(s)) return new Date(Number(s) + DUBAI_OFFSET_MS);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return undefined;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0)));
}

/** Now, as a Dubai wall-clock time. */
export function dubaiNow(): Date {
  return new Date(Date.now() + DUBAI_OFFSET_MS);
}

export function formatDate(date: Date, locale: Locale, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
    ...options,
  }).format(date);
}

/** "25 Oct 2026", or "25 Oct – 2 Nov 2026" for an event over several days. */
export function formatRange(start: Date, end: Date | undefined, locale: Locale): string {
  const sameDay = !end || start.toISOString().slice(0, 10) === end.toISOString().slice(0, 10);
  if (sameDay) return formatDate(start, locale);
  return `${formatDate(start, locale, { year: undefined })} – ${formatDate(end, locale)}`;
}

/** As a schema.org date with Dubai's offset: "2026-10-25T20:00:00+04:00". */
export function isoDubai(date: Date): string {
  return `${date.toISOString().slice(0, 19)}+04:00`;
}
