import type { Attraction, ExpoEventItem, ExpoRecord, Faq, Restaurant, Venue } from "@/types/page";
import { parseDate, isoDubai } from "./dates";
import { localizePath, type Locale } from "./i18n";
import { imageSrc } from "./images";
import { recordPath } from "./records";
import { absoluteUrl, SITE_NAME } from "./seo";

/**
 * schema.org structured data. Search engines use it for rich results, and AI
 * answer engines (the "GEO" side of SEO) quote it when they answer questions
 * such as "what's on at Expo City Dubai this weekend?".
 */
type JsonLd = Record<string, unknown>;

const ADDRESS = {
  "@type": "PostalAddress",
  streetAddress: "Expo Road",
  addressLocality: "Dubai",
  addressCountry: "AE",
};

function imageUrl(image: ExpoRecord["image"]): string | undefined {
  const src = imageSrc(image);
  return src ? absoluteUrl(src.split("?")[0]) : undefined;
}

function place(name: string | null | undefined, locale: Locale): JsonLd {
  return {
    "@type": "Place",
    name: name ? `${name}, ${SITE_NAME[locale]}` : SITE_NAME[locale],
    address: ADDRESS,
  };
}

export function organizationJsonLd(locale: Locale): JsonLd[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": ["Organization", "TouristDestination"],
      name: SITE_NAME[locale],
      url: absoluteUrl(localizePath("/", locale)),
      logo: absoluteUrl("/logo-en.png"),
      address: ADDRESS,
      sameAs: ["https://www.expocitydubai.com", "https://www.instagram.com/expocitydubai"],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME[locale],
      url: absoluteUrl(localizePath("/", locale)),
      inLanguage: locale === "ar" ? "ar-AE" : "en",
    },
  ];
}

export function breadcrumbJsonLd(crumbs: { name: string; path: string }[], locale: Locale): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(localizePath(c.path, locale)),
    })),
  };
}

export function recordJsonLd(item: ExpoRecord, locale: Locale): JsonLd {
  const base = {
    "@context": "https://schema.org",
    name: item.title,
    description: item.teaser,
    image: imageUrl(item.image),
    url: absoluteUrl(localizePath(recordPath(item), locale)),
    inLanguage: locale === "ar" ? "ar-AE" : "en",
  };
  switch (item.contentType) {
    case "ExpoEvent": {
      const e = item as ExpoEventItem;
      const start = parseDate(e.startDate);
      const end = parseDate(e.endDate);
      return {
        ...base,
        "@type": "Event",
        startDate: start && isoDubai(start),
        endDate: end && isoDubai(end),
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: place(e.venue, locale),
        organizer: { "@type": "Organization", name: SITE_NAME[locale], url: absoluteUrl("/") },
        ...(e.ticketLink && {
          offers: { "@type": "Offer", url: e.ticketLink, availability: "https://schema.org/InStock" },
        }),
      };
    }
    case "ExpoRestaurant": {
      const r = item as Restaurant;
      return {
        ...base,
        "@type": "Restaurant",
        servesCuisine: r.cuisine || undefined,
        address: ADDRESS,
        openingHours: r.hours || undefined,
        containedInPlace: place(null, locale),
      };
    }
    case "ExpoVenue": {
      const v = item as Venue;
      return {
        ...base,
        "@type": "EventVenue",
        maximumAttendeeCapacity: Number(String(v.capacity ?? "").replace(/[^\d]/g, "")) || undefined,
        address: ADDRESS,
        containedInPlace: place(null, locale),
      };
    }
    default: {
      const a = item as Attraction;
      return {
        ...base,
        "@type": "TouristAttraction",
        address: ADDRESS,
        openingHours: a.hours || undefined,
        isAccessibleForFree: a.price ? undefined : true,
        containedInPlace: place(null, locale),
      };
    }
  }
}

export function faqJsonLd(faqs: Faq[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.title,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function eventsListJsonLd(events: ExpoEventItem[], locale: Locale): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: events.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: recordJsonLd(e, locale),
    })),
  };
}
