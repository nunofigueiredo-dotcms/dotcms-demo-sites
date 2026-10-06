import type { DotCMSAnalyticsConfig } from "@dotcms/analytics/react";

const SITE_KEY = process.env.NEXT_PUBLIC_DOTCMS_ANALYTICS_SITE_KEY;

/**
 * dotCMS Content Analytics: page views plus, for every component on a page,
 * when it was seen (impressions) and clicked. Off when no site key is set.
 * The SDK turns itself off inside the Universal Visual Editor.
 */
export const contentAnalyticsConfig: DotCMSAnalyticsConfig | null = SITE_KEY
  ? {
      siteAuth: SITE_KEY,
      server: process.env.NEXT_PUBLIC_DOTCMS_HOST,
      autoPageView: true,
      impressions: true,
      clicks: true,
      debug: process.env.NEXT_PUBLIC_DOTCMS_ANALYTICS_DEBUG === "true",
    }
  : null;
