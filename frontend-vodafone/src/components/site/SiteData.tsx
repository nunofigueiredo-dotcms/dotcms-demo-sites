"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { HeroSlide, Plan, Store } from "@/types/page";

/**
 * Collections loaded with every page (see utils/queries.ts). Hero carousels,
 * the plan list and the store locator pick what they need.
 */
interface SiteData {
  slides: HeroSlide[];
  plans: Plan[];
  stores: Store[];
}

const SiteDataContext = createContext<SiteData>({ slides: [], plans: [], stores: [] });

export function SiteDataProvider({ children, ...data }: SiteData & { children: ReactNode }) {
  return <SiteDataContext.Provider value={data}>{children}</SiteDataContext.Provider>;
}

export function useSiteData(): SiteData {
  return useContext(SiteDataContext);
}
