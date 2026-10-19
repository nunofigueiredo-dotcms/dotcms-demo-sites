"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Attraction, ExpoEventItem, Faq, Restaurant, Venue } from "@/types/page";

/**
 * Collections loaded with every page (see utils/queries.ts), in the page's
 * language. Collections, event lists and FAQ lists pick what they need.
 */
interface SiteData {
  attractions: Attraction[];
  events: ExpoEventItem[];
  restaurants: Restaurant[];
  venues: Venue[];
  faqs: Faq[];
}

const SiteDataContext = createContext<SiteData>({ attractions: [], events: [], restaurants: [], venues: [], faqs: [] });

export function SiteDataProvider({ children, ...data }: SiteData & { children: ReactNode }) {
  return <SiteDataContext.Provider value={data}>{children}</SiteDataContext.Provider>;
}

export function useSiteData(): SiteData {
  return useContext(SiteDataContext);
}
