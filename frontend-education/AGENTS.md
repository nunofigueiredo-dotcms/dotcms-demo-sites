# Texas School for the Deaf demo website (dotCMS, Next.js)

**Read `DEMO-CONTEXT.md` first** — what was built, where every piece lives,
gotchas and the demo talk track.

The web front end for site **educationdemo.com** on
https://awesomedemo-dev.dotcms.dev, styled after tsd.texas.gov with TSD's
real logo, colours, copy and photos. Part of the `~/headless/generaldemos`
npm workspace — install from the workspace root, never here.

## Running

```bash
cd ~/headless/generaldemos
npm run dev:education         # http://localhost:3008
```

`.env.local` (gitignored, copy from `.env.local.example`) holds the dotCMS
host, token and site id. No test suite: check with `npx tsc --noEmit`,
`npm run lint`, `npm run build`, and by loading the pages.

## How it fits together

- `src/app/[[...slug]]/page.tsx` — every URL is a dotCMS page. The
  Universal Visual Editor loads pages with `?mode=EDIT_MODE|PREVIEW_MODE`;
  that mode is passed to dotCMS (draft content, Style editor schemas).
- `src/views/Page.tsx` — `useEditableDotCMSPage` + `DotCMSLayoutBody`.
  `/news/{urlTitle}` is a URL-mapped `TsdNews` article (`views/NewsDetail.tsx`)
  above the sections placed on the `/news/news-detail` page.
- `src/components/content-types/` — one component per `Tsd*` section type;
  `index.tsx` maps type variables to components.
- `src/utils/queries.ts` — extra GraphQL loaded with each page: menu (depth
  3, for the Academics dropdown), news, events and promo banners. `+live:true`
  on the site, `+working:true` in the editor. Sorting happens in
  `utils/dates.ts`, not in the query.
- `src/utils/images.ts` / `imageLoader.ts` — image fields reference the
  media library; images are served resized from `/dA/{id}/{w}w/80q`.
- `dotcms/style-schemas/` — Style editor options for TsdHero, TsdPageBanner,
  TsdFeatureGrid, TsdFeatureSplit and TsdCallout, pushed with
  `npm run style-schemas`; each component reads `dotStyleProperties`.
- Header and footer read TSD Site Settings (`components/social.ts` parses
  its `Label | link` lines). Video and social embeds load third-party content
  only on the visitor's click; video posters come through
  `app/api/video-thumbnail`.
- Calendar: event categories come from the dotCMS category tree "TSD Event
  Categories" (`utils/categories.ts` for colours and the three API shapes of
  a category field); `TsdEventList` filters by category (`?category=` in the
  URL); `app/api/calendar/route.ts` serves iCalendar feeds (`utils/ics.ts`).
- News: categories from the tree "TSD News Categories", pinned articles first
  (`utils/dates.ts → latestNews`); `TsdNewsList` filters like the calendar
  (`components/site/CategoryFilter.tsx`); `app/api/news/route.ts` serves RSS.
- Accessibility: `components/site/AccessibilityPanel.tsx` (editor only) via
  `app/api/accessibility/route.ts` → the TSD accessibility plugin
  (`../osgi/tsd-accessibility-check`), which also blocks submit/publish.
- Analytics: dotCMS Content Analytics in `app/layout.tsx`
  (`utils/analytics.ts`, needs `NEXT_PUBLIC_DOTCMS_ANALYTICS_SITE_KEY` and the
  site opened at http://educationdemo.localhost:3008); Google Analytics from
  the GA4 ID in the TsdSiteSettings item (`components/site/GoogleAnalytics.tsx`,
  public site only).
- `src/app/globals.css` — TSD tokens (navy `#041436`, steel `#3e6581`,
  pink `#d73576`), Libre Baskerville + Jost, and all component styles.

dotCMS side: `../docs/build-education.py` (assets in
`../docs/education-assets/`).
