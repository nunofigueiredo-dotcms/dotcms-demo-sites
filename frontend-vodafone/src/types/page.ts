import type { DotCMSNavigationItem } from "@dotcms/types";
import type { DotCMSImageField } from "@/utils/images";

export interface DotCMSPageNavigation extends DotCMSNavigationItem {
  children: DotCMSNavigationItem[];
}

/** A hero slide (content type `VodafoneHeroSlide`), as loaded for carousels. */
export interface HeroSlide {
  identifier: string;
  inode: string;
  contentType: string;
  conLanguage?: { id: number } | null;
  title: string;
  highlight?: string | null;
  text?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  image?: DotCMSImageField;
  mobileImage?: DotCMSImageField;
}

/** A rate plan (content type `VodafonePlan`). */
export interface Plan {
  identifier: string;
  title: string;
  family: string;
  data?: string;
  minutes?: string;
  /** Monthly price in EGP, e.g. "3450". */
  price: string;
  priceNote?: string;
  badge?: string;
  /** One benefit per line. */
  benefits?: string;
  ctaText?: string;
  ctaLink?: string;
  displayOrder?: string;
  /** How many of the subscription options a customer picks, e.g. "5". */
  subscriptionsIncluded?: string;
  /** Many-to-many relationship to VodafoneSubscription: the options. */
  subscriptions?: Subscription[] | null;
}

/** An entertainment subscription RED plans can include (`VodafoneSubscription`). */
export interface Subscription {
  title: string;
  category?: string;
}

/** A store or dealer (content type `VodafoneStore`). */
export interface Store {
  identifier: string;
  title: string;
  storeType: string;
  governorate: string;
  area?: string;
  address: string;
  phone?: string;
  hours?: string;
  latitude: string;
  longitude: string;
  /** Checkbox field, e.g. "cash,lines" or a list, depending on the API. */
  services?: unknown;
}

/** The extra GraphQL queries every page request carries (see utils/queries.ts). */
export interface DotCMSPageContent {
  navigation: DotCMSPageNavigation;
  slides?: HeroSlide[];
  plans?: Plan[];
  stores?: Store[];
}
