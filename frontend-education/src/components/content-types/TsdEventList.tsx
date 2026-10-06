"use client";

import Link from "next/link";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { useSiteData } from "@/components/site/SiteData";
import { useIsInEditor } from "@/hooks/useIsEditing";
import type { CalendarEvent } from "@/types/page";
import { EVENT_CATEGORIES, isChecked } from "@/utils/content";
import { dateParts, dateRange, monthLabel, upcomingEvents } from "@/utils/dates";

type TsdEventListProps = DotCMSBasicContentlet & {
  heading?: string;
  /** "5", "10" or "all" */
  count?: string;
  layout?: "compact" | "full";
  showAllLink?: unknown;
};

function EventItem({ event, full }: { event: CalendarEvent; full: boolean }) {
  const { month, day, weekday } = dateParts(event.startDate);
  const range = dateRange(event.startDate, event.endDate);
  return (
    <article className={`event event--${event.category}`}>
      <p className="event__date" aria-hidden>
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
          {(event.timeText || event.category === "holiday") && (
            <span>
              <Clock aria-hidden className="h-4 w-4" /> {event.timeText || "All day"}
            </span>
          )}
          {event.location && (
            <span>
              <MapPin aria-hidden className="h-4 w-4" /> {event.location}
            </span>
          )}
          {full && <span className="chip">{EVENT_CATEGORIES[event.category] ?? event.category}</span>}
        </p>
        {full && event.description && <p className="event__description">{event.description}</p>}
      </div>
    </article>
  );
}

/** Upcoming calendar events, soonest first: date tiles, or grouped by month. */
export default function TsdEventList({ heading, count = "5", layout = "compact", showAllLink }: TsdEventListProps) {
  const inEditor = useIsInEditor();
  const upcoming = upcomingEvents(useSiteData().events);
  const events = count === "all" ? upcoming : upcoming.slice(0, Number(count) || 5);
  const full = layout === "full";

  if (!events.length) {
    return inEditor ? <p className="editor-note">No upcoming published events.</p> : null;
  }

  // Grouped by month in the full layout; one group otherwise.
  const groups = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = full ? monthLabel(event.startDate) : "";
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

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
        {[...groups].map(([month, items]) => (
          <div key={month || "events"} className="event-group">
            {month && <h3 className="event-group__month">{month}</h3>}
            <ul className={`event-list event-list--${layout}`}>
              {items.map((event) => (
                <li key={event.identifier}>
                  <EventItem event={event} full={full} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
