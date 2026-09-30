/**
 * dotCMS connection settings, from `.env.local` (see `.env.example`).
 * Expo inlines EXPO_PUBLIC_* variables into the app bundle at build time.
 */
export const DOTCMS_HOST = (process.env.EXPO_PUBLIC_DOTCMS_HOST ?? "https://awesomedemo-dev.dotcms.dev").replace(/\/$/, "");
export const DOTCMS_TOKEN = process.env.EXPO_PUBLIC_DOTCMS_AUTH_TOKEN ?? "";
export const DOTCMS_SITE_ID = process.env.EXPO_PUBLIC_DOTCMS_SITE_ID ?? "c81fca370b6afed12062f71739234638";
