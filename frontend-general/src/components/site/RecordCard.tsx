"use client";

import Image from "next/image";
import { ArrowUpRight, CalendarDays, MapPin, Users } from "lucide-react";
import type { ExpoEventItem, ExpoRecord, Restaurant, Venue } from "@/types/page";
import { checkboxValues, selectValue } from "@/utils/content";
import { formatRange, parseDate } from "@/utils/dates";
import { optionLabel } from "@/utils/i18n";
import { imageSrc } from "@/utils/images";
import { recordPath } from "@/utils/records";
import { SmartLink } from "../SmartLink";
import { useLocale } from "./Locale";

/** One card in a collection or event list: photo, category, name, teaser. Links to the item's page. */
export function RecordCard({ item, ratio = "portrait" }: { item: ExpoRecord; ratio?: "portrait" | "landscape" }) {
  const { locale } = useLocale();
  const src = imageSrc(item.image);
  const category =
    item.contentType === "ExpoVenue"
      ? checkboxValues((item as Venue).flagship).length
        ? optionLabel("flagship", locale)
        : ""
      : optionLabel(selectValue((item as { category?: unknown }).category), locale);

  let meta: React.ReactNode = null;
  if (item.contentType === "ExpoEvent") {
    const e = item as ExpoEventItem;
    const start = parseDate(e.startDate);
    meta = start && (
      <span className="card__meta">
        <CalendarDays aria-hidden className="h-4 w-4" />
        {formatRange(start, parseDate(e.endDate), locale)}
        {e.timeText && <span dir="auto"> · {e.timeText}</span>}
      </span>
    );
  } else if (item.contentType === "ExpoRestaurant" && (item as Restaurant).cuisine) {
    meta = <span className="card__meta">{(item as Restaurant).cuisine}</span>;
  } else if (item.contentType === "ExpoVenue" && (item as Venue).capacity) {
    meta = (
      <span className="card__meta">
        <Users aria-hidden className="h-4 w-4" />
        {(item as Venue).capacity}
      </span>
    );
  } else if ("location" in item && item.location) {
    meta = (
      <span className="card__meta">
        <MapPin aria-hidden className="h-4 w-4" />
        {item.location}
      </span>
    );
  }

  return (
    <SmartLink href={recordPath(item)} className={`record-card record-card--${ratio}`}>
      <span className="record-card__media">
        {src && (
          <Image src={src} alt={item.imageAlt ?? ""} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
        )}
        {category && <span className="record-card__tag">{category}</span>}
      </span>
      <span className="record-card__body">
        {meta}
        <span className="record-card__title">
          {item.title}
          <ArrowUpRight aria-hidden className="h-5 w-5 flip-rtl" />
        </span>
        <span className="record-card__teaser">{item.teaser}</span>
      </span>
    </SmartLink>
  );
}
