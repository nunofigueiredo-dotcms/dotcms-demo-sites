"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, CalendarPlus, Clock, Download, MapPin, Rss } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { CategoryChip, CategoryFilter, useCategoryFilter } from "@/components/site/CategoryFilter";
import { useSiteData } from "@/components/site/SiteData";
import { useIsInEditor } from "@/hooks/useIsEditing";
import type { CalendarEvent } from "@/types/page";
import { categoryColor, distinctCategories, toCategories, type Category } from "@/utils/categories";
import { isChecked } from "@/utils/content";
import { dateParts, dateRange, monthLabel, upcomingEvents } from "@/utils/dates";

type TsdEventListProps = DotCMSBasicContentlet & {
  heading?: string;
  /** "5", "10" or "all" */
  count?: string;
  layout?: "compact" | "full";
  /** "Only these categories": a category field; empty shows every category. */
  eventCategories?: unknown;
  /** Options checkbox: "true" (All events link), "filter", "ics". */
  showAllLink?: unknown;
};

function EventItem({ event, full, calendarLinks }: { event: CalendarEvent; full: boolean; calendarLinks: boolean }) {
  const { month, day, weekday } = dateParts(event.startDate);
  const range = dateRange(event.startDate, event.endDate);
  const categories = event.eventCategories ?? [];
  return (
    <article className="event">
      {/* The tile takes the colour of the event's first category. */}
      <p className="event__date" style={{ background: categoryColor(categories[0]?.key) }} aria-hidden>
        <span>{month}</span>
        <strong>{day}</strong>
      </p>
      <div className="event__body">
        <h3>
          <span className="sr-only">
            {weekday}, {month} {day}:{" "}
          </span>
          {event.title}
        </h3>
        <p className="event__meta">
          {range && <span>{range}</span>}
          {event.timeText && (
            <span>
              <Clock aria-hidden className="h-4 w-4" /> {event.timeText}
            </span>
          )}
          {event.location && (
            <span>
              <MapPin aria-hidden className="h-4 w-4" /> {event.location}
            </span>
          )}
          {categories.map((c) => (
            <CategoryChip key={c.key} category={c} />
          ))}
        </p>
        {full && event.description && <p className="event__description">{event.description}</p>}
        {calendarLinks && (
          <a className="event__add" href={`/api/calendar?event=${event.identifier}`} download>
            <CalendarPlus aria-hidden className="h-4 w-4" /> Add to calendar
            <span className="sr-only">: {event.title}</span>
          </a>
        )}
      </div>
    </article>
  );
}

/**
 * Subscribe (webcal://, kept up to date by the visitor's calendar app) and
 * download links for the feed of the selected category. webcal needs the
 * site's host, known only in the browser, so it appears after hydration.
 */
const noSubscribe = () => () => {};

function FeedLinks({ category }: { category?: Category }) {
  // The browser's host; "" during the server render.
  const host = useSyncExternalStore(noSubscribe, () => window.location.host, () => "");
  const feed = `/api/calendar${category ? `?category=${category.key}` : ""}`;
  const label = category ? `${category.name} events` : "the full calendar";
  return (
    <p className="feed-links">
      {host && (
        <a href={`webcal://${host}${feed}`} className="feed-links__link">
          <Rss aria-hidden className="h-4 w-4" /> Subscribe to {label}
        </a>
      )}
      <a href={feed} className="feed-links__link" download>
        <Download aria-hidden className="h-4 w-4" /> Download .ics
      </a>
    </p>
  );
}

/**
 * Upcoming calendar events, soonest first: date tiles, or grouped by month.
 * Editors can limit a list to some categories (e.g. Outreach on the Outreach
 * page) and turn on category filter buttons for visitors. The chosen filter
 * is kept in the address (?category=tsd-testing), so it can be shared.
 */
export default function TsdEventList({ heading, count = "5", layout = "compact", eventCategories, showAllLink }: TsdEventListProps) {
  const inEditor = useIsInEditor();
  const scope = toCategories(eventCategories).map((c) => c.key);
  const upcoming = upcomingEvents(useSiteData().events).filter(
    (e) => !scope.length || (e.eventCategories ?? []).some((c) => scope.includes(c.key)),
  );
  const showFilter = isChecked(showAllLink, "filter");
  const calendarLinks = isChecked(showAllLink, "ics");
  const filters = distinctCategories(upcoming.map((e) => e.eventCategories ?? []));
  const [selected, select] = useCategoryFilter(filters, showFilter);

  const filtered = selected ? upcoming.filter((e) => (e.eventCategories ?? []).some((c) => c.key === selected)) : upcoming;
  const events = count === "all" ? filtered : filtered.slice(0, Number(count) || 5);
  const full = layout === "full";

  if (!upcoming.length) {
    return inEditor ? (
      <p className="editor-note">No upcoming published events{scope.length ? " in the chosen categories" : ""}.</p>
    ) : null;
  }

  // Grouped by month in the full layout; one group otherwise.
  const groups = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = full ? monthLabel(event.startDate) : "";
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  const selectedCategory = filters.find((c) => c.key === selected);

  return (
    <section className="section section--white list-section">
      <div className="container-tsd">
        {heading && (
          <header className="list-section__header">
            <h2 className="section__title">{heading}</h2>
            {isChecked(showAllLink) && (
              <Link href="/calendar" className="text-link">
                All events <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            )}
          </header>
        )}
        {showFilter && (
          <CategoryFilter label="Filter events by category" filters={filters} selected={selected} onSelect={select} />
        )}
        {calendarLinks && <FeedLinks category={selectedCategory} />}
        {/* Announces how many events match after a filter change. */}
        <p className="sr-only" role="status">
          {showFilter ? `Showing ${events.length} ${selectedCategory ? `${selectedCategory.name} ` : ""}events` : ""}
        </p>
        {events.length === 0 && <p className="event-list__empty">No upcoming events in this category.</p>}
        {[...groups].map(([month, items]) => (
          <div key={month || "events"} className="event-group">
            {month && <h3 className="event-group__month">{month}</h3>}
            <ul className={`event-list event-list--${layout}`}>
              {items.map((event) => (
                <li key={event.identifier}>
                  <EventItem event={event} full={full} calendarLinks={calendarLinks} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
