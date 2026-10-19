# Expo City Dubai demo website (dotCMS, Next.js)

The web front end for site **general.com** on
https://awesomedemo-dev.dotcms.dev, styled after expocitydubai.com with Expo
City Dubai's real logo, colours, copy and photos, in **English and Arabic**.
Part of the `~/headless/generaldemos` npm workspace — install from the
workspace root, never here.

Scope: Home, Visit (attractions, events & workshops, parks & wellness,
restaurants & cafés, plan your visit), Spaces (event venues) and Explore
(about, sustainability, accessibility, FAQs). Live (real estate), Free Zone
and Stories are not built.

## Running

```bash
cd ~/headless/generaldemos
npm run dev:general           # http://localhost:3009 (Arabic: /ar)
```

`.env.local` (gitignored, copy from `.env.local.example`) holds the dotCMS
host, token, site id and the Arabic language id. No test suite: check with
`npx tsc --noEmit`, `npm run lint`, `npm run build`, and by loading the pages.

## How it fits together

- `src/app/[[...slug]]/page.tsx` — every URL is a dotCMS page. `/ar/…` is the
  same page in Arabic (`utils/i18n.ts`). The Universal Visual Editor loads
  pages with `?mode=EDIT_MODE|PREVIEW_MODE&language_id=…`; both are passed to
  dotCMS, and links stay unprefixed in the editor.
- `src/proxy.ts` sets `x-locale` so `app/layout.tsx` can put `lang` and
  `dir="rtl"` on `<html>`. CSS uses logical properties (inline-start/end), so
  one stylesheet serves both directions; `.flip-rtl` mirrors arrows.
- Interface words (buttons, labels, category names) are in `utils/i18n.ts`.
  Everything else is content, translated in dotCMS. Folder titles have one
  language, so Arabic menu titles come from the Arabic `ExpoSiteSettings`
  item (Menu labels: `/folder | Title`).
- `src/views/Page.tsx` — `useEditableDotCMSPage` + `DotCMSLayoutBody`.
  URL-mapped records (`ExpoAttraction` /visit/attractions/…, `ExpoEvent`
  /visit/events/…, `ExpoRestaurant` /visit/dining/…, `ExpoVenue` /spaces/…)
  render with `views/RecordDetail.tsx` above the sections placed on the type's
  detail page (`…/attraction-detail` etc.).
- `src/components/content-types/` — one component per `Expo*` section type;
  `index.tsx` maps type variables to components. `ExpoCollection`,
  `ExpoEventList` and `ExpoFaqList` only say what to show: their items come
  from the collections in `utils/queries.ts` (loaded with every page, in the
  page's language; `+live:true` on the site, `+working:true` in the editor).
- `dotcms/style-schemas/` — Style editor options for ExpoHero,
  ExpoPageBanner, ExpoFeatureSplit, ExpoFeatureGrid, ExpoCollection and
  ExpoCallout, pushed with `npm run style-schemas`; each component reads
  `dotStyleProperties`.
- Events: dates are Dubai time (`utils/dates.ts`); lists show only upcoming
  events, soonest first.
- SEO/GEO: `utils/seo.ts` (canonical + hreflang en/ar), `utils/jsonld.ts`
  (Organization, TouristAttraction, Event, Restaurant, EventVenue, FAQPage,
  BreadcrumbList), `app/sitemap.ts`, `app/robots.ts` and `app/llms.txt` —
  all built from published dotCMS content (`utils/siteIndex.ts`).
- Analytics: dotCMS Content Analytics in `app/layout.tsx`
  (`utils/analytics.ts`, needs `NEXT_PUBLIC_DOTCMS_ANALYTICS_SITE_KEY` and the
  site opened at http://general.localhost:3009); Google Analytics from the GA4
  ID in ExpoSiteSettings (public site only).
- `src/app/globals.css` — Expo tokens (charcoal `#1e1c23`, sand `#f9f6f3`,
  magenta `#a12167`, teal `#2c7486`, yellow `#fbbb03`), Readex Pro (Latin and
  Arabic) and all component styles.

dotCMS side: `../docs/build-general.py` (copy in `../docs/expo-content.json`,
photos and logos in `../docs/expo-assets/`).
