"use client";

import Image from "next/image";
import { DotCMSBlockEditorRenderer } from "@dotcms/react";
import { CalendarDays, Clock, MapPin, Maximize2, Tag, Ticket, Users, UtensilsCrossed } from "lucide-react";
import type { Attraction, ExpoEventItem, ExpoRecord, Restaurant, Venue } from "@/types/page";
import { JsonLd } from "@/components/site/JsonLd";
import { useLocale } from "@/components/site/Locale";
import { SmartLink } from "@/components/SmartLink";
import { toBlocks } from "@/utils/blocks";
import { checkboxValues, selectValue } from "@/utils/content";
import { formatRange, parseDate } from "@/utils/dates";
import { optionLabel, type StringKey } from "@/utils/i18n";
import { imageSrc } from "@/utils/images";
import { breadcrumbJsonLd, recordJsonLd } from "@/utils/jsonld";
import { RECORD_PATHS, recordPath } from "@/utils/records";

// The listing page each record type belongs to, for the breadcrumb.
const PARENT: Record<string, { en: string; ar: string }> = {
  ExpoAttraction: { en: "Attractions", ar: "المعالم" },
  ExpoEvent: { en: "Events & Workshops", ar: "الفعاليات وورش العمل" },
  ExpoRestaurant: { en: "Restaurants & Cafés", ar: "المطاعم والمقاهي" },
  ExpoVenue: { en: "Event spaces", ar: "القاعات والمساحات" },
};

type Fact = { icon: typeof Clock; label: StringKey; value?: string | null };

function facts(item: ExpoRecord, locale: "en" | "ar"): Fact[] {
  switch (item.contentType) {
    case "ExpoEvent": {
      const e = item as ExpoEventItem;
      const start = parseDate(e.startDate);
      const when = start && [formatRange(start, parseDate(e.endDate), locale), e.timeText].filter(Boolean).join(" · ");
      return [
        { icon: CalendarDays, label: "when", value: when },
        { icon: MapPin, label: "venue", value: e.venue },
        { icon: Tag, label: "price", value: e.price },
      ];
    }
    case "ExpoRestaurant": {
      const r = item as Restaurant;
      return [
        { icon: UtensilsCrossed, label: "cuisine", value: r.cuisine },
        { icon: MapPin, label: "location", value: r.location },
        { icon: Clock, label: "hours", value: r.hours },
      ];
    }
    case "ExpoVenue": {
      const v = item as Venue;
      const suits = checkboxValues(v.eventTypes).map((x) => optionLabel(x, locale)).join(" · ");
      return [
        { icon: Users, label: "capacity", value: v.capacity },
        { icon: Maximize2, label: "area", value: v.area },
        { icon: Tag, label: "suits", value: suits },
      ];
    }
    default: {
      const a = item as Attraction;
      return [
        { icon: MapPin, label: "location", value: a.location },
        { icon: Clock, label: "hours", value: a.hours },
        { icon: Ticket, label: "price", value: a.price },
      ];
    }
  }
}

/**
 * The page of an attraction, event, restaurant or event space. dotCMS
 * matches the URL to the item (URL maps); the sections editors place on the
 * type's detail page appear underneath.
 */
export function RecordDetail({ item }: { item: ExpoRecord }) {
  const { locale, t, href } = useLocale();
  const src = imageSrc(item.image);
  const blocks = toBlocks(item.body);
  const category =
    item.contentType === "ExpoVenue"
      ? checkboxValues((item as Venue).flagship).length
        ? optionLabel("flagship", locale)
        : ""
      : optionLabel(selectValue((item as { category?: unknown }).category), locale);
  const ticketLink = (item as Attraction | ExpoEventItem).ticketLink;
  const highlights = item.contentType === "ExpoVenue" ? ((item as Venue).highlights ?? "").split(/\r?\n/).filter(Boolean) : [];
  const parentPath = RECORD_PATHS[item.contentType];
  const shownFacts = facts(item, locale).filter((f) => f.value);

  return (
    <article className="record">
      <JsonLd
        data={[
          recordJsonLd(item, locale),
          breadcrumbJsonLd(
            [
              { name: t("home"), path: "/" },
              { name: PARENT[item.contentType][locale], path: parentPath },
              { name: item.title, path: recordPath(item) },
            ],
            locale,
          ),
        ]}
      />
      <div className="record__hero">
        {src && <Image src={src} alt={item.imageAlt ?? ""} fill priority sizes="100vw" />}
        <div className="hero__shade" aria-hidden />
        <div className="container-expo record__heading">
          <nav aria-label="Breadcrumb" className="breadcrumb">
            <SmartLink href="/">{t("home")}</SmartLink>
            <span aria-hidden>/</span>
            <SmartLink href={parentPath}>{PARENT[item.contentType][locale]}</SmartLink>
          </nav>
          {category && <p className="record__tag">{category}</p>}
          <h1>{item.title}</h1>
        </div>
      </div>

      <div className="container-expo record__layout">
        <div className="record__main">
          <p className="record__teaser">{item.teaser}</p>
          {blocks && (
            <div className="prose-expo">
              <DotCMSBlockEditorRenderer blocks={blocks} />
            </div>
          )}
          {highlights.length > 0 && (
            <>
              <h2 className="record__subheading">{t("highlights")}</h2>
              <ul className="record__highlights">
                {highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </>
          )}
        </div>

        <aside className="record__facts">
          {shownFacts.length > 0 && (
            <dl>
              {shownFacts.map(({ icon: FactIcon, label, value }) => (
                <div key={label}>
                  <dt>
                    <FactIcon aria-hidden className="h-4 w-4" />
                    {t(label)}
                  </dt>
                  <dd dir="auto">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {ticketLink && (
            <a href={ticketLink} target="_blank" rel="noopener" className="btn btn--accent btn--block">
              {t("bookTickets")}
            </a>
          )}
          {item.contentType === "ExpoVenue" && (
            <a href="mailto:venues@expocitydubai.ae" className="btn btn--accent btn--block">
              {t("makeEnquiry")}
            </a>
          )}
          <a href={href(parentPath)} className="link-arrow record__back">
            {PARENT[item.contentType][locale]}
          </a>
        </aside>
      </div>
    </article>
  );
}
