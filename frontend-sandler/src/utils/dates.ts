/**
 * dotCMS returns dates as "2026-08-18 09:00:00.0" in GraphQL and as epoch
 * milliseconds in the page API's _map. Accept both.
 */
function parse(value: string | number): Date {
  return typeof value === "number"
    ? new Date(value)
    : new Date(value.replace(" ", "T").replace(/\.\d+$/, ""));
}

/** Parts for an event's date badge and time line, e.g. OCT · 6 · 11:30 AM. */
export function eventDateParts(value: string, locale = "en-US") {
  const date = parse(value);
  return {
    month: date.toLocaleDateString(locale, { month: "short" }),
    day: date.getDate(),
    weekday: date.toLocaleDateString(locale, { weekday: "long" }),
    time: date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" }),
    iso: date.toISOString(),
  };
}

export function formatDate(value: string | number | undefined, locale = "en-US"): string {
  if (value === undefined || value === "") return "";
  const date = parse(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
}
