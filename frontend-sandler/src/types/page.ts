import type { DotCMSNavigationItem } from "@dotcms/types";

export interface DotCMSPageNavigation extends DotCMSNavigationItem {
  children: DotCMSNavigationItem[];
}

/** A locally owned Sandler training center (content type `TrainingCenter`). */
export interface TrainingCenter {
  title: string;
  urlTitle: string;
  city: string;
  region: string;
  /** ISO 3166-1 alpha-2 code, e.g. "US". */
  country: string;
  address?: string;
  phone?: string;
  latitude?: string;
  longitude?: string;
  tagline?: string;
  summary?: string;
  /** Checkbox field: slugs from SOLUTIONS in utils/centers.ts. */
  solutions?: string | string[] | { value?: string; key?: string }[];
}

/**
 * One office in the worldwide Sandler network (content type `SandlerLocation`),
 * shown on the locations map. Most have no pages on this site; the ones whose
 * `urlTitle` matches a TrainingCenter link to that center's page.
 */
export interface SandlerLocation {
  title: string;
  urlTitle: string;
  city: string;
  region?: string;
  /** Two-letter state/province code (US, CA); region code elsewhere. */
  regionCode?: string;
  country: string;
  /** ISO 3166-1 alpha-2, e.g. "US". */
  countryCode: string;
  postalCode?: string;
  phone?: string;
  latitude: string;
  longitude: string;
  website?: string;
}

/** Where a visitor searched from (see /api/geocode). */
export interface SearchOrigin {
  label: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  /** State code for US/CA searches, e.g. "MA". */
  regionCode?: string;
}

/** Listing fields of a `SandlerArticle`. The body is only loaded on the detail page. */
export interface SandlerArticleSummary {
  title: string;
  urlTitle: string;
  category: string;
  publishDate: string;
  teaser?: string;
}

/** A class, workshop or webinar run by one training center (`SandlerEvent`). */
export interface SandlerEvent {
  identifier?: string;
  title: string;
  startDate: string;
  format: "Online" | "In person" | "Hybrid";
  venue?: string;
  summary?: string;
  /** Many-to-one relationship to the center that runs it. */
  center?: { urlTitle: string } | null;
}

/** A client testimonial for one training center (`SandlerTestimonial`). */
export interface SandlerTestimonial {
  quote: string;
  name?: string;
  role?: string;
  headline?: string;
  /** "1"–"5", or empty. */
  rating?: string;
  center?: { urlTitle: string } | null;
}

/** The extra GraphQL queries every page request carries (see utils/queries.ts). */
export interface DotCMSPageContent {
  navigation: DotCMSPageNavigation;
  centers?: TrainingCenter[];
  /** English centers and events, fetched on translated pages to fill the gaps. */
  centersEnglish?: TrainingCenter[];
  articles?: SandlerArticleSummary[];
  /** English articles, fetched on translated pages to fill the gaps. */
  articlesEnglish?: SandlerArticleSummary[];
  events?: SandlerEvent[];
  eventsEnglish?: SandlerEvent[];
  testimonials?: SandlerTestimonial[];
  /** dotCMS Language Variables for the interface labels (sandler.*). */
  languageVariables?: { key: string; value: string }[];
}
