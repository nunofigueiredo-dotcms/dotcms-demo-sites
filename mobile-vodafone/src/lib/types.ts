import type { ImageField } from "./dotcms";

/** A contentlet's fields as dotCMS returns them in a page's `_map`. */
export type Contentlet = Record<string, unknown> & {
  identifier: string;
  contentType: string;
  title?: string;
};

export interface PageData {
  title: string;
  /** The page's content, top to bottom as laid out in dotCMS. */
  sections: Contentlet[];
}

export interface HeroSlide {
  identifier: string;
  title: string;
  highlight?: string | null;
  text?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  image?: ImageField;
  mobileImage?: ImageField;
}

/** An entertainment subscription RED plans can include (`VodafoneSubscription`). */
export interface Subscription {
  title: string;
  category?: string | null;
}

export interface Plan {
  identifier: string;
  title: string;
  family: string;
  data?: string | null;
  minutes?: string | null;
  price: string;
  priceNote?: string | null;
  badge?: string | null;
  benefits?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  displayOrder?: string | null;
  /** How many of the options a customer picks, e.g. "5". */
  subscriptionsIncluded?: string | null;
  /** Many-to-many relationship: the subscriptions this plan offers. */
  subscriptions?: Subscription[] | null;
}

export interface Store {
  identifier: string;
  title: string;
  storeType: string;
  governorate: string;
  area?: string | null;
  address: string;
  phone?: string | null;
  hours?: string | null;
  latitude: string;
  longitude: string;
  services?: string[] | string | null;
}
