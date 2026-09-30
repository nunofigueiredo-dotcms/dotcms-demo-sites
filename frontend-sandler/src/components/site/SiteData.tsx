"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { SandlerArticleSummary, SandlerEvent, SandlerTestimonial, TrainingCenter } from "@/types/page";
import { CENTER_COOKIE, sortCenters } from "@/utils/centers";

interface SiteDataValue {
  centers: TrainingCenter[];
  articles: SandlerArticleSummary[];
  events: SandlerEvent[];
  testimonials: SandlerTestimonial[];
  selectedCenter?: TrainingCenter;
  selectCenter: (center: TrainingCenter | undefined) => void;
}

const SiteDataContext = createContext<SiteDataValue | null>(null);

const ONE_YEAR = 60 * 60 * 24 * 365;

interface SiteDataProviderProps {
  centers: TrainingCenter[];
  articles: SandlerArticleSummary[];
  events: SandlerEvent[];
  testimonials: SandlerTestimonial[];
  /** Slug from the center cookie, read on the server. */
  initialCenterSlug?: string;
  children: ReactNode;
}

/**
 * Site-wide data loaded with every page, plus the visitor's chosen training
 * center. The choice is kept in a cookie so the server can personalise the
 * next page before it reaches the browser.
 */
export function SiteDataProvider({
  centers,
  articles,
  events,
  testimonials,
  initialCenterSlug,
  children,
}: SiteDataProviderProps) {
  const sorted = useMemo(() => sortCenters(centers), [centers]);
  const [selectedSlug, setSelectedSlug] = useState(initialCenterSlug);

  const selectCenter = useCallback((center: TrainingCenter | undefined) => {
    setSelectedSlug(center?.urlTitle);
    document.cookie = center
      ? `${CENTER_COOKIE}=${encodeURIComponent(center.urlTitle)}; path=/; max-age=${ONE_YEAR}; samesite=lax`
      : `${CENTER_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }, []);

  const value = useMemo<SiteDataValue>(
    () => ({
      centers: sorted,
      articles,
      events,
      testimonials,
      selectedCenter: sorted.find((c) => c.urlTitle === selectedSlug),
      selectCenter,
    }),
    [sorted, articles, events, testimonials, selectedSlug, selectCenter]
  );

  return <SiteDataContext.Provider value={value}>{children}</SiteDataContext.Provider>;
}

export function useSiteData(): SiteDataValue {
  const value = useContext(SiteDataContext);
  if (!value) throw new Error("useSiteData must be used inside <SiteDataProvider>");
  return value;
}
