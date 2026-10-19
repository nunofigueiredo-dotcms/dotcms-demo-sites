import type { Attraction, ExpoEventItem, ExpoRecord, Faq, Restaurant, Venue } from "@/types/page";
import { checkboxValues, selectValue } from "./content";
import { dubaiNow, parseDate } from "./dates";

/** Where each record type's pages live (the URL map patterns in dotCMS). */
export const RECORD_PATHS: Record<string, string> = {
  ExpoAttraction: "/visit/attractions",
  ExpoEvent: "/visit/events",
  ExpoRestaurant: "/visit/dining",
  ExpoVenue: "/spaces",
};

export const RECORD_TYPES = Object.keys(RECORD_PATHS);

/** The page of a record: "/visit/attractions/terra-pavilion". */
export function recordPath(item: { contentType: string; urlTitle: string }): string {
  return `${RECORD_PATHS[item.contentType] ?? ""}/${item.urlTitle}`;
}

export function isRecord(value: unknown): value is ExpoRecord {
  const type = (value as { contentType?: string } | null)?.contentType;
  return !!type && RECORD_TYPES.includes(type);
}

/** Upcoming events (not yet ended, in Dubai time), soonest first. */
export function upcomingEvents(events: ExpoEventItem[]): ExpoEventItem[] {
  const now = dubaiNow();
  return events
    .filter((e) => (parseDate(e.endDate) ?? parseDate(e.startDate) ?? now) >= now)
    .sort((a, b) => (parseDate(a.startDate)?.getTime() ?? 0) - (parseDate(b.startDate)?.getTime() ?? 0));
}

export function sortFaqs(faqs: Faq[]): Faq[] {
  return [...faqs].sort((a, b) => Number(a.position || 999) - Number(b.position || 999));
}

const byTitle = <T extends { title: string }>(items: T[]) =>
  [...items].sort((a, b) => a.title.localeCompare(b.title));

/** An Expo Collection's cards: its source, filtered by category, flagship venues first. */
export function collectionItems(
  source: string,
  category: string,
  data: { attractions: Attraction[]; restaurants: Restaurant[]; venues: Venue[] },
): ExpoRecord[] {
  if (source === "venues") {
    const venues = category
      ? data.venues.filter((v) => [...checkboxValues(v.flagship), ...checkboxValues(v.eventTypes)].includes(category))
      : data.venues;
    return byTitle(venues).sort(
      (a, b) => Number(checkboxValues(b.flagship).length > 0) - Number(checkboxValues(a.flagship).length > 0),
    );
  }
  const items: (Attraction | Restaurant)[] = source === "restaurants" ? data.restaurants : data.attractions;
  return byTitle(category ? items.filter((i) => selectValue(i.category) === category) : items);
}
