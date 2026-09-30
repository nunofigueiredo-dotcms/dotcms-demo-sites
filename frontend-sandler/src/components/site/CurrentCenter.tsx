"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { TrainingCenter } from "@/types/page";

/**
 * The center whose pages are being viewed (/locations/{center}/…). Not the
 * same as the visitor's *selected* center: someone whose center is London can
 * still browse Minnesota's pages, and those pages should show Minnesota.
 */
const CurrentCenterContext = createContext<TrainingCenter | undefined>(undefined);

export function CurrentCenterProvider({
  center,
  children,
}: {
  center?: TrainingCenter;
  children: ReactNode;
}) {
  return <CurrentCenterContext.Provider value={center}>{children}</CurrentCenterContext.Provider>;
}

export function useCurrentCenter(): TrainingCenter | undefined {
  return useContext(CurrentCenterContext);
}
