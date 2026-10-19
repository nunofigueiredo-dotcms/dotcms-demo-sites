import type { DotCMSNavigationItem } from "@dotcms/types";
import type { BlockField } from "@/utils/blocks";
import type { DotCMSImageField } from "@/utils/images";

export interface DotCMSPageNavigation extends DotCMSNavigationItem {
  children: (DotCMSNavigationItem & { children?: DotCMSNavigationItem[] })[];
}

/** Fields every record shares. Each has its own page, URL-mapped by urlTitle. */
interface RecordBase {
  identifier: string;
  contentType: string;
  title: string;
  urlTitle: string;
  teaser: string;
  image?: DotCMSImageField;
  imageAlt?: string | null;
  body?: BlockField | null;
}

/** An attraction, park or wellness spot (`ExpoAttraction`): /visit/attractions/{urlTitle}. */
export interface Attraction extends RecordBase {
  /** attraction | park | wellness */
  category: unknown;
  location?: string | null;
  hours?: string | null;
  price?: string | null;
  ticketLink?: string | null;
}

/** An event or workshop (`ExpoEvent`): /visit/events/{urlTitle}. */
export interface ExpoEventItem extends RecordBase {
  startDate: string | number;
  endDate?: string | number | null;
  timeText?: string | null;
  /** concert | family | workshop | festival | sports | culture */
  category: unknown;
  venue?: string | null;
  price?: string | null;
  ticketLink?: string | null;
}

/** A restaurant, café or lounge (`ExpoRestaurant`): /visit/dining/{urlTitle}. */
export interface Restaurant extends RecordBase {
  /** restaurant | cafe | lounge */
  category: unknown;
  cuisine?: string | null;
  location?: string | null;
  hours?: string | null;
}

/** An event space (`ExpoVenue`): /spaces/{urlTitle}. */
export interface Venue extends RecordBase {
  /** Checkbox: "flagship" when ticked. */
  flagship?: unknown;
  /** Checkbox: weddings, meetings, fitness, festivals. */
  eventTypes?: unknown;
  capacity?: string | null;
  area?: string | null;
  /** One per line. */
  highlights?: string | null;
}

/** A visitor question (`ExpoFaq`). */
export interface Faq {
  identifier: string;
  title: string;
  answer: string;
  topic: unknown;
  /** Lower numbers first. */
  position?: string | null;
}

/** Site-wide settings (`ExpoSiteSettings`, one item per site and language). */
export interface SiteSettings {
  gaMeasurementId?: string | null;
  /** The ticker under the header, one per line: Label | Text | link. */
  announcements?: string | null;
  /** Menu titles in this language, one per line: /folder | Title. */
  menuLabels?: string | null;
  socialLinks?: string | null;
  footerLinks?: string | null;
  tagline?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

/** The extra GraphQL queries every page request carries (see utils/queries.ts). */
export interface DotCMSPageContent {
  navigation: DotCMSPageNavigation;
  settings?: SiteSettings[];
  attractions?: Attraction[];
  events?: ExpoEventItem[];
  restaurants?: Restaurant[];
  venues?: Venue[];
  faqs?: Faq[];
}

export type ExpoRecord = Attraction | ExpoEventItem | Restaurant | Venue;
