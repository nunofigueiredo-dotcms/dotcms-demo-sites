# Texas School for the Deaf demo — context

A dotCMS demo for the Texas School for the Deaf (tsd.texas.gov), focused on
**page building in the Universal Visual Editor**. Real TSD brand: logo,
colours, fonts, copy, phone numbers and photos all come from tsd.texas.gov.

Last updated 2026-10-06.

---

## Where things live

| Piece | Location | Notes |
|---|---|---|
| dotCMS content | site **educationdemo.com** on https://awesomedemo-dev.dotcms.dev | site id `5875220ead521d2fe31cedd1aad6b594` |
| Website (deployed) | https://dotcms-demo-sites-45sr.vercel.app | Vercel, branch `education-demo`, root directory `frontend-education` |
| Website (local) | `~/headless/generaldemos/frontend-education` | Next.js, port **3008**, `npm run dev:education` from `~/headless/generaldemos` |
| Build script | `~/headless/generaldemos/docs/build-education.py` | rebuilds educationdemo.com from scratch |
| Brand assets | `~/headless/generaldemos/docs/education-assets/` | from tsd.texas.gov |

UVE on educationdemo.com loads pages from the Vercel deployment, so editing
needs no local server. `http://localhost:3008` and
`http://educationdemo.localhost:3008` are allowed dev URLs in the editor.
Site aliases: `educationdemo.localhost` and `dotcms-demo-sites-45sr.vercel.app`
(Content Analytics finds the site from the browser's Origin).

---

## What was built

### Pages (all in the menu; Academics has a dropdown of its five schools)
- `/` home — photo hero, quick links (Calendar · Staff Directory ·
  Enrollment · News), "Discover TSD" school cards, promo carousel (170th
  anniversary, back to school, hiring), latest news beside upcoming events,
  mission statement. Template **TSD Home** (row 5 is two columns, 7 + 5).
- `/about` — mission, vision, beliefs, TSD at a glance, visiting.
- `/admissions` — apply-by-April-1 callout, eligibility checklist, four
  steps, FAQ, contacts.
- `/academics` + `/academics/{early-learning-center, elementary,
  middle-school, high-school, access}`.
- `/outreach` — Statewide Outreach Center, programs, goals, contacts.
- `/news` (all articles) and `/news/{urlTitle}` (URL map → `/news/news-detail`).
- `/calendar` — all upcoming events, grouped by month.
- `/contact` — office cards, visiting, directions.

Every other page uses template **TSD Full Width** (8 rows).

### Content types (all `Tsd*`, each with a Site field)
Sections editors drag onto pages: **TsdHero**, **TsdPageBanner**,
**TsdQuickLinks**, **TsdFeatureGrid** (cards / checklist / steps / stats),
**TsdFeatureSplit**, **TsdCallout**, **TsdPromoCarousel**, **TsdNewsList**,
**TsdEventList**, **TsdFaq**, **TsdContactList**, plus rich text
(`webPageContent`). Records: **TsdNews** (9 real articles), **TsdEvent**
(16, in categories), **TsdPromoBanner** (3), **TsdSiteSettings** (1: integrations such as
the Google Analytics ID).

The pages use a **TSD Sections** container that accepts only those section
types, so the editor's palette on this site lists TSD components and nothing
from the other demos.

**Style editor**: TsdHero (text position, height, overlay colour) and
TsdPageBanner (background, alignment).

### Real vs sample content
Real (tsd.texas.gov): all page copy, phone/VP numbers, news articles, the six
testing dates (ACT Oct 21; end-of-course Dec 1–10). Sample: parent
conferences, Family Weekend Retreat, breaks, the winter showcase, classes
resuming, and the volleyball, basketball, dorm festival and online workshop
events added for the category filters. Program descriptions on `/outreach` for Discovery Retreat,
Communication Skills Workshop, Parent Infant Program and On The Road are
short paraphrases, not TSD copy. Sensitive recent news (the homecoming
incident, media statements) was deliberately left out.

### Calendar categories (requirement 2)
- Event categories are a dotCMS **category tree**: Content → Categories →
  **TSD Event Categories** (Academic, Testing, No School, Family, Athletics,
  Student Life, Community, Outreach). Editors add or rename categories there,
  no developer needed; an event can be in several (TsdEvent → Categories).
  Keys are `tsd-*`; the frontend colours the known keys
  (`src/utils/categories.ts`), new ones show in navy.
- **TSD Event List** section options: *Only these categories* (pick from the
  tree; empty = all) and checkboxes for *category filter buttons* and
  *Add to calendar / subscribe links*. The Outreach page has a list scoped to
  Outreach; the calendar page has filters and calendar links on.
- Filters keep the choice in the address, so links are shareable:
  `/calendar?category=tsd-testing`. A status message announces the result
  count to screen readers.
- **iCalendar feeds** (`src/app/api/calendar/route.ts`): `/api/calendar`
  (all), `?category=tsd-testing` (one category), `?event=ID` (one event,
  downloads). Subscribe with `webcal://…` in Google, Outlook or Apple
  Calendar; times are America/Chicago, breaks are all-day. Feeds include the
  last 60 days and are cached 5 minutes.
- Search-index gotcha: Lucene matches categories by variable name
  (`+categories:tsdtesting`), not by key — the feed filters by key in code.

### Analytics (requirement 1)
Two options, both live in the code; either can run alone.

- **dotCMS Content Analytics** (built in). The Content Analytics app is
  configured on educationdemo.com (site key in `.env.local` as
  `NEXT_PUBLIC_DOTCMS_ANALYTICS_SITE_KEY`; page views, impressions and clicks
  on). `@dotcms/analytics` in `app/layout.tsx` records page views and, per
  component, which sections were seen and clicked. That component-level data
  is what Google Analytics can't give out of the box. Off inside the editor.
  **Open the site as http://educationdemo.localhost:3008** — the analytics
  service finds the site from the browser's Origin, and
  `educationdemo.localhost` is a site alias (localhost:3008 is not).
  **Not recording yet:** dotCMS answers 502 until an administrator enters the
  analytics event manager's admin user/password once in Apps → Content
  Analytics → educationdemo.com (exchanged for a token, not stored).
- **Google Analytics 4** (extension). Paste a GA4 measurement ID into the
  **TSD Site Settings** item in dotCMS and publish: the site loads GA on the
  next request, no deploy. Empty = off. Never loaded in the editor (edit or
  preview mode), so editors' visits aren't counted. Currently empty.

---

## Talk track (UVE page building)

1. Open educationdemo.com in dotCMS → home page in the editor. Click the hero
   headline and edit it in place; open the **Style editor** and centre the
   text or switch the overlay to steel blue.
2. Drag a **TSD Callout** or **TSD Feature Grid** from the palette onto a
   page; note the palette only offers TSD components (the TSD Sections
   container).
3. Change a Feature Grid's layout from Cards to Steps — same content,
   different presentation.
4. Promo carousel: edit it, reorder its banners, or click "Edit this banner"
   on a slide. Rotation stops in the editor; on the site it pauses on hover
   and has a pause button (WCAG 2.2.2).
5. Create a **TSD News** article: it appears in the home page's Latest News
   and gets its own page at `/news/{url title}` — no page building needed.
   Add a **TSD Event** and it appears on the home page and the calendar.
6. Accessibility talking points: alt text is a field on every image (required
   on promo graphics), videophone (VP) numbers sit next to voice numbers,
   skip link, visible focus ring, reduced-motion respected.

---

## Gotchas

- Field hints are limited to **255 characters** in dotCMS — the icon list is
  abbreviated in hints (full list in `src/components/Icon.tsx`).
- The news detail page must exist **before** `TsdNews` is created, because
  the type names it as its detail page.
- Next.js: a server component (Footer) cannot import plain data from a
  `"use client"` module (Header) — shared data lives in `components/social.ts`.
- On phones, the home page's 7 + 5 row must drop its column gap: the SDK's
  12-column grid with 40px gaps is wider than the screen.
- The build script refuses to run if the site already has a home page.
- Changing a single field on awesomedemo-dev: `PUT/DELETE
  /api/v1/contenttype/{id}/fields/{fieldId}` return 404. Edit field options
  with a full `PUT /api/v1/contenttype/id/{id}` (resend its workflows), and
  delete fields with `DELETE /api/v3/contenttype/{id}/fields` and body
  `{"fieldsID": [...]}`.
