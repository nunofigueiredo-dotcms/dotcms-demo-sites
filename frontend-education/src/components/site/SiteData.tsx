"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CalendarEvent, NewsArticle, PromoBanner, StaffMember } from "@/types/page";

/**
 * Collections loaded with every page (see utils/queries.ts). News lists,
 * event lists, promo carousels and staff directories pick what they need.
 */
interface SiteData {
  news: NewsArticle[];
  events: CalendarEvent[];
  promos: PromoBanner[];
  staff: StaffMember[];
}

const SiteDataContext = createContext<SiteData>({ news: [], events: [], promos: [], staff: [] });

export function SiteDataProvider({ children, ...data }: SiteData & { children: ReactNode }) {
  return <SiteDataContext.Provider value={data}>{children}</SiteDataContext.Provider>;
}

export function useSiteData(): SiteData {
  return useContext(SiteDataContext);
}
