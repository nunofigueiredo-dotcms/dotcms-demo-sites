"use client";

import { useState } from "react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { JsonLd } from "@/components/site/JsonLd";
import { RecordCard } from "@/components/site/RecordCard";
import { SectionHeader } from "@/components/site/SectionHeader";
import { useLocale } from "@/components/site/Locale";
import { useSiteData } from "@/components/site/SiteData";
import { checkboxValues, selectValue } from "@/utils/content";
import { optionLabel } from "@/utils/i18n";
import { eventsListJsonLd } from "@/utils/jsonld";
import { upcomingEvents } from "@/utils/records";

type ExpoEventListProps = DotCMSBasicContentlet & {
  eyebrow?: string;
  heading?: string;
  intro?: string;
  count?: unknown;
  /** Checkbox: "filters" shows the category buttons. */
  showFilters?: unknown;
  theme?: "white" | "sand" | "charcoal" | "teal";
  ctaText?: string;
  ctaLink?: string;
};

/** Upcoming events, soonest first; past events drop off by themselves. */
export default function ExpoEventList(props: ExpoEventListProps) {
  const { locale, t } = useLocale();
  const { events } = useSiteData();
  const [category, setCategory] = useState("");
  const count = selectValue(props.count) || "all";
  const upcoming = upcomingEvents(events);
  const categories = [...new Set(upcoming.map((e) => selectValue(e.category)).filter(Boolean))];
  const filtered = category ? upcoming.filter((e) => selectValue(e.category) === category) : upcoming;
  const shown = count === "all" ? filtered : filtered.slice(0, Number(count));
  const filters = checkboxValues(props.showFilters).includes("filters") && categories.length > 1;

  return (
    <section className={`section section--${props.theme ?? "white"}`}>
      <div className="container-expo">
        <SectionHeader contentlet={props} />
        {filters && (
          <div className="filters" role="group" aria-label={t("filterEvents")}>
            {["", ...categories].map((c) => (
              <button key={c || "all"} type="button" aria-pressed={category === c} onClick={() => setCategory(c)}>
                {c ? optionLabel(c, locale) : t("all")}
              </button>
            ))}
          </div>
        )}
        {shown.length ? (
          <ul className="card-list card-list--grid" style={{ "--columns": "3" } as React.CSSProperties}>
            {shown.map((e) => (
              <li key={e.identifier}>
                <RecordCard item={e} ratio="landscape" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">{t("noEvents")}</p>
        )}
        {/* The full list carries Event data for search and AI answer engines. */}
        {count === "all" && !category && shown.length > 0 && <JsonLd data={eventsListJsonLd(shown, locale)} />}
      </div>
    </section>
  );
}
