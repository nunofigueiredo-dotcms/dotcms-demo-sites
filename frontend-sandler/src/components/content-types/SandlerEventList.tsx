"use client";

import { Link } from "@/components/site/Locale";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { EventCard } from "@/components/site/EventCard";
import { useCurrentCenter } from "@/components/site/CurrentCenter";
import { useSiteData } from "@/components/site/SiteData";
import { useT } from "@/components/site/Strings";

type SandlerEventListProps = DotCMSBasicContentlet & {
  heading?: string;
  emptyText?: string;
};

/** The current center's upcoming events (each `SandlerEvent` is related to one center). */
export default function SandlerEventList({ heading, emptyText }: SandlerEventListProps) {
  const t = useT();
  const { events, selectedCenter } = useSiteData();
  const center = useCurrentCenter() ?? selectedCenter;
  const upcoming = center
    ? events.filter((event) => event.center?.urlTitle === center.urlTitle)
    : [];

  return (
    <section className="section section--light">
      <div className="section__inner">
        {heading && (
          <header className="section__header">
            {center && <p className="eyebrow">{center.title}</p>}
            <h2>{heading}</h2>
          </header>
        )}
        {center && upcoming.length > 0 ? (
          <ul className="event-list">
            {upcoming.map((event) => (
              <EventCard key={`${event.title}|${event.startDate}`} event={event} center={center} />
            ))}
          </ul>
        ) : (
          <p className="text-lg text-brand-slate">
            {center ? emptyText : `${t("events.choose")} `}
            {!center && (
              <Link href="/locations" className="font-semibold text-brand-royal">
                {t("footer.findCenter")}
              </Link>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
