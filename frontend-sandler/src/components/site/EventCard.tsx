"use client";

import { Link } from "@/components/site/Locale";
import { Clock, MapPin, Monitor } from "lucide-react";
import type { SandlerEvent, TrainingCenter } from "@/types/page";
import { centerHref } from "@/utils/centers";
import { eventDateParts } from "@/utils/dates";
import { useT } from "@/components/site/Strings";
import { useLocale } from "@/components/site/Locale";
import { dateLocale } from "@/utils/i18n";

/** One upcoming event, with a calendar-style date badge. */
export function EventCard({ event, center }: { event: SandlerEvent; center: TrainingCenter }) {
  const t = useT();
  const date = eventDateParts(event.startDate, dateLocale(useLocale()));

  return (
    <li className="event-card">
      <time className="event-card__date" dateTime={date.iso}>
        <span>{date.month}</span>
        <strong>{date.day}</strong>
      </time>
      <div className="event-card__body">
        <p className="event-card__format">{t(`event.format.${event.format}`, undefined, event.format)}</p>
        <h3>{event.title}</h3>
        <p className="event-card__meta">
          <Clock aria-hidden className="h-4 w-4 shrink-0" />
          {date.weekday}, {date.time}
        </p>
        <p className="event-card__meta">
          {event.venue ? (
            <MapPin aria-hidden className="h-4 w-4 shrink-0" />
          ) : (
            <Monitor aria-hidden className="h-4 w-4 shrink-0" />
          )}
          {event.venue || t("event.liveOnline")}
        </p>
        {event.summary && <p className="event-card__summary">{event.summary}</p>}
      </div>
      <Link href={`${centerHref(center)}/contact-us`} className="btn btn--outline btn--sm self-center">
        {t("event.saveSeat")}
      </Link>
    </li>
  );
}
