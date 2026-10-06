import type { DotCMSNavigationItem } from "@dotcms/types";
import type { Category } from "@/utils/categories";
import type { BlockField } from "@/utils/blocks";
import type { DotCMSImageField } from "@/utils/images";

export interface DotCMSPageNavigation extends DotCMSNavigationItem {
  children: (DotCMSNavigationItem & { children?: DotCMSNavigationItem[] })[];
}

/** A news article (content type `TsdNews`). Its page is /news/{urlTitle}. */
export interface NewsArticle {
  identifier: string;
  title: string;
  urlTitle: string;
  category: string;
  /** "2026-09-10 09:00:00.0" or an ISO string, depending on the API. */
  publishDate: string;
  teaser: string;
  image?: DotCMSImageField;
  imageAlt?: string | null;
  body?: BlockField | null;
}

/** A calendar event (content type `TsdEvent`). */
export interface CalendarEvent {
  identifier: string;
  title: string;
  startDate: string;
  endDate?: string | null;
  /** As shown, e.g. "8 AM – 3 PM". Empty means all day. */
  timeText?: string | null;
  location?: string | null;
  /** From the TSD Event Categories tree in dotCMS; an event can have several. */
  eventCategories?: Category[] | null;
  description?: string | null;
}

/** A promotional graphic (content type `TsdPromoBanner`), shown by promo carousels. */
export interface PromoBanner {
  identifier: string;
  inode: string;
  contentType: string;
  conLanguage?: { id: number } | null;
  title: string;
  image?: DotCMSImageField;
  imageAlt: string;
  link?: string | null;
}

/** Site-wide settings (content type `TsdSiteSettings`, one item per site). */
export interface SiteSettings {
  /** GA4 measurement ID; empty turns Google Analytics off. */
  gaMeasurementId?: string | null;
}

/** The extra GraphQL queries every page request carries (see utils/queries.ts). */
export interface DotCMSPageContent {
  navigation: DotCMSPageNavigation;
  settings?: SiteSettings[];
  news?: NewsArticle[];
  events?: CalendarEvent[];
  promos?: PromoBanner[];
}
