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
  /** From the TSD News Categories tree in dotCMS; an article can have several. */
  newsCategories?: Category[] | null;
  /** Options checkbox: contains "pinned" when pinned to the top of lists. */
  pinned?: unknown;
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

/** A staff member (content type `TsdStaff`). Their page is /staff/{urlTitle}. */
export interface StaffMember {
  identifier: string;
  title: string;
  lastName: string;
  urlTitle: string;
  jobTitle: string;
  /** From the TSD Departments tree in dotCMS (page data gives another shape: see toCategories). */
  departments?: unknown;
  email?: string | null;
  phone?: string | null;
  videophone?: string | null;
  languages?: string | null;
  office?: string | null;
  photo?: DotCMSImageField;
  photoAlt?: string | null;
  bio?: BlockField | null;
}

/** A file from the media library, as GraphQL returns a File field. */
export interface DotCMSFile {
  identifier: string;
  fileName?: string | null;
  fileAsset?: { idPath?: string | null; name?: string | null; size?: number | null; mime?: string | null } | null;
}

/** A knowledge base entry (content type `TsdResource`). Its page is /resources/{urlTitle}. */
export interface Resource {
  identifier: string;
  title: string;
  urlTitle: string;
  summary: string;
  /** From the TSD Resource Topics tree (page data gives another shape: see toCategories). */
  topics?: unknown;
  /** Checkbox: families, students, staff, public. */
  audience?: unknown;
  ownerDepartment?: unknown;
  /** "2026-08-15 00:00:00.0" */
  lastReviewed?: string | null;
  /** GraphQL gives the file; the page API's urlContentMap only its identifier. */
  document?: DotCMSFile | string | null;
  documentDescription?: string | null;
  externalUrl?: string | null;
  body?: BlockField | null;
}

/** A site-wide alert banner (content type `TsdAlert`). */
export interface SiteAlert {
  identifier: string;
  title: string;
  message?: string | null;
  severity: "emergency" | "closure" | "info";
  ctaText?: string | null;
  ctaLink?: string | null;
  aslVideoUrl?: string | null;
  startDate: string;
  endDate: string;
  scope?: "all" | "home" | null;
}

/** Site-wide settings (content type `TsdSiteSettings`, one item per site). */
export interface SiteSettings {
  /** GA4 measurement ID; empty turns Google Analytics off. */
  gaMeasurementId?: string | null;
  /** The header's top bar, one per line: Label | link. */
  utilityLinks?: string | null;
  /** Header and footer icons, one per line: Facebook | link. */
  socialLinks?: string | null;
  address?: string | null;
  phone?: string | null;
  videophone?: string | null;
  /** Footer columns, one per line: Label | link. */
  footerCommunity?: string | null;
  footerUseful?: string | null;
}

/** The extra GraphQL queries every page request carries (see utils/queries.ts). */
export interface DotCMSPageContent {
  navigation: DotCMSPageNavigation;
  settings?: SiteSettings[];
  news?: NewsArticle[];
  events?: CalendarEvent[];
  promos?: PromoBanner[];
  staff?: StaffMember[];
  resources?: Resource[];
  alerts?: SiteAlert[];
}
