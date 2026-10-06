"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CalendarEvent, NewsArticle, PromoBanner } from "@/types/page";

/**
 * Collections loaded with every page (see utils/queries.ts). News lists,
 * event lists and promo carousels pick what they need.
 */
interface SiteData {
  news: NewsArticle[];
  events: CalendarEvent[];
  promos: PromoBanner[];
}

const SiteDataContext = createContext<SiteData>({ news: [], events: [], promos: [] });

export function SiteDataProvider({ children, ...data }: SiteData & { children: ReactNode }) {
  return <SiteDataContext.Provider value={data}>{children}</SiteDataContext.Provider>;
}

export function useSiteData(): SiteData {
  return useContext(SiteDataContext);
}
