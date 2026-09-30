# Vodafone Egypt demo — context

Everything about the Vodafone Egypt dotCMS demo in one place: what the
prospect asked to see, what exists where, how it was built, what to watch out
for, and the talking notes. The demo has three pieces — the dotCMS content,
the website and the iPhone app (see *Where things live*).

The same file is kept in both `~/headless/generaldemos/frontend-vodafone/`
and `~/headless/generaldemos/mobile-vodafone/`; update both when it changes.

Last updated 2026-09-30.

---

## The demo plan (from Vodafone)

1. **Page building, media and workflow.** Build a page with a component,
   styled with a Vodafone theme. Show how images and other media are managed.
   Walk through the review-and-publish workflow.
2. **Structured content and APIs.** Create two content lists with a
   relationship between them, and retrieve them through customized APIs that
   return JSON.
3. **Discussion topics.** How content caching works, and the options for
   migrating data from their current platform (Liferay — see notes below).

Decisions agreed: workflow applies to **Vodafone content types only** (not
pages); two demo users; the relationship is **RED plans ↔ subscriptions**;
talking notes as notes, not a document. Vodafone asked for the **real brand
assets** (logo, colours, font, images from web.vodafone.com.eg).

---

## Where things live

| Piece | Location | Notes |
|---|---|---|
| dotCMS content | site **telcodemo.com** on https://awesomedemo-dev.dotcms.dev | site id `c81fca370b6afed12062f71739234638` |
| Website | `~/headless/generaldemos/frontend-vodafone` | Next.js, port **3007**, `npm run dev:vodafone` from `~/headless/generaldemos` |
| iPhone app | `~/headless/generaldemos/mobile-vodafone` | Expo / React Native in Expo Go; `npm run ios:vodafone` from `~/headless/generaldemos` (own `node_modules`, not part of the npm workspace) |
| Run sheet (click paths, API calls) | `~/headless/generaldemos/docs/VODAFONE-DEMO.md` | use this during the demo |
| Build scripts | `~/headless/generaldemos/docs/build-vodafone.py` (+ `vodafone-editorial.py`, `vodafone-apis.py`) | rebuild telcodemo.com from scratch |
| Brand images | `~/headless/generaldemos/docs/vodafone-assets/` | from web.vodafone.com.eg |
| Dummy stores | `~/headless/generaldemos/docs/vodafone-stores.json` | 22 stores, invented names/phones, real coordinates |
| Demo passwords | `~/headless/generaldemos/docs/vodafone-users.local.csv` | gitignored — never commit or paste |

Tokens: `.env.local` in each frontend (gitignored). The app reads
`EXPO_PUBLIC_DOTCMS_*`; the website `NEXT_PUBLIC_DOTCMS_*`. Content types
are prefixed `Vodafone*` (type names are global on the instance).

---

## What was built

### Pages (telcodemo.com)
- `/` home — hero slides, red quick-links strip, rate plans / Vodafone Cash /
  Home DSL tiles, "Other Services". Template **Vodafone Home**; the first row
  holds the hero banner.
- `/plans` — RED banner, plan list (5 real RED plans and prices), three
  image+text sections, FAQ.
- `/vodafone-cash` — banner, who can use it, 3 steps, 8 services, wallet
  limits, help FAQ.
- `/store-locator` — map + filterable list of the 22 dummy stores.
- **Container:** the Vodafone templates use a **Vodafone Sections**
  container on telcodemo.com (not the System Container), which accepts only
  the Vodafone page-section types + rich text — so the editor's palette on
  telcodemo.com shows only Vodafone components. Set up by
  `docs/vodafone-container.py` (backs up placements to
  `vodafone-placements-backup.local.json`, gitignored).
- Menu comes from the folders `/plans`, `/vodafone-cash`, `/store-locator`
  (Show on menu).

### Content types
`VodafoneHeroSlide`, `VodafonePageBanner`, `VodafoneQuickLinks`,
`VodafoneTile`, `VodafoneServiceCarousel`, `VodafonePlan`,
`VodafonePlanList`, `VodafoneFeatureSplit`, `VodafoneFeatureGrid`,
`VodafoneFaq`, `VodafoneStore`, `VodafoneStoreLocator`,
`VodafoneSubscription`, `VodafoneHeroCarousel`. List fields use one line per item, `Title | Text |
link | icon`. The website and the iPhone app map the same type variables to
components, so one dotCMS page drives both.

### Hero banner and carousel
The home page's hero row holds **one Vodafone Hero Slide** — a single banner,
edited inline, styled with the **Style editor** (schema
`frontend-vodafone/dotcms/style-schemas/VodafoneHeroSlide.mjs`, push with
`npm run style-schemas`: image left/right, alignment, heading font/size,
uppercase/italic/regular weight, background, button style) and published
with **Publish Page**.

A **Vodafone Hero Carousel** is a widget editors add to a page. Its
**Slides** field is a many-to-many relationship to Hero Slides (order kept
as set in the editor), plus *Seconds per slide*. One is ready:
**Home — offers carousel** (RED, Flex, Wi-Fi Calling) — not placed, so adding
it is a demo step. Page data lists a carousel's slides by identifier only:
the website loads the site's slides with every page and matches them; the
iPhone app fetches them by identifier. Slides inside a carousel are their own
content: edited from **Edit this slide**, reviewed and published separately —
or together with the page (see *Gotchas*: publishing a page publishes the
site's unpublished Vodafone sections, slides included). Carousel slides use the
default design (Style editor values belong to a slide placed on a page).

A **Vodafone Plan List** works the same way: its **Plans** field is a
many-to-many relationship to Vodafone Plans, picked and dragged into order
per list (one plan can be in several lists, e.g. a RED plan on /plans and in
an offers row). A new plan shows nowhere until an editor adds it to a list.
Plans keep their own *Plan family*, used by the RED plans API. (Lists used to
pick a family instead; `docs/vodafone-plan-lists.py` migrated them.)

### Media library (demo item 1)
All images are files in `/images/{hero,home,cash,red}` on the site; content
uses **Image** fields that reference them. `/images/cash/vodafone-cash.jpg`
is shared by the home tile and the Cash banner (reuse story). Clients ask for
resized WebP: `/dA/{identifier}/800w/80q`. Images need no token.

### Workflow (demo item 1)
Scheme **Vodafone Editorial** on every Vodafone content type:

```
Draft ──Submit for review──▶ In Review ──Approve & publish──▶ Published
  ▲                             │
  └──────── Send back ──────────┘        (Save on Published → Draft)
```

- Roles **Vodafone Editor** (read/write on the site, no publish) and
  **Vodafone Reviewer** (read/write/publish). Tools: Site, Content, Digital
  Assets.
- Users **editor@telcodemo.com** (Mona Hassan) and
  **reviewer@telcodemo.com** (Karim Adel).
- Tested end to end with the real users: editor can Save / Submit, is refused
  on Publish and Approve; reviewer sees Approve & publish / Send back.
- dotCMS default actions are mapped (NEW/EDIT → Save, PUBLISH → Publish…),
  so scripts using `fire/PUBLISH` still work as admin.
- Pages keep the System Workflow (the page type is shared by all sites).

### Relationship + APIs (demo item 2)
- `VodafoneSubscription` × 8 (Disney+, YouTube Premium, WATCH IT, OSN+,
  Anghami Plus, Amazon Prime, Yango Play, TOD) ↔ `VodafonePlan` × 5 via the
  many-to-many field **Subscription options** (`subscriptions`), plus
  **Subscriptions included** (`subscriptionsIncluded`): EXCLUSIVE 8 of 8,
  ELITE+ 7 of 8, PRIME+ 6 of 8, ADVANCE+ 5 of 7, ESSENTIAL+ 4 of 5.
- Plan cards on the website and in the iPhone app show "Choose N of M
  subscriptions".
- Three JSON APIs, all anonymous (published content only):
  1. **Custom endpoint** `GET /api/vtl/vodafone-red-plans`
     (`?maxPrice=1500`, `?subscription=TOD`) — Velocity script in
     `frontend-vodafone/dotcms/apivtl/vodafone-red-plans/get.vtl`, uploaded
     by `docs/vodafone-apis.py`.
  2. **GraphQL** `POST /api/v1/graphql` — `VodafonePlanCollection { …
     subscriptions { title category } }` (what the iPhone app uses).
  3. **Content REST** `/api/content/query/<lucene>/depth/1` — related
     subscriptions nested.

### Personalization (demo item 3)
Personas **Tourist / Visitor to Egypt** (`VodafoneTourist`), **Young
Social-First Prepaid** (`VodafoneSocialPrepaid`) and **Device Shopper**
(`VodafoneDeviceShopper`), each with its own home hero and "Offers for you"
row (container right below the quick links); the rest of the page is shared.
Persona plans use new plan families `tourist` / `youth` / `device` and a
**Price period** field. `/devices` lists five phones (`VodafoneDevice`,
`VodafoneDeviceList`). Three dotCMS rules on telcodemo.com assign the
personas (country ≠ EG, travel/airport, social `utm_source`, visited
`/devices`). The website resolves the same triggers itself
(`src/utils/personaTargeting.ts`, `src/proxy.ts`, cookie `vf_persona`;
`?persona=…` / `?persona=reset`; location off unless `PERSONA_GEO=true`).
Set up by `docs/vodafone-personalization.py`; run sheet section 3. Not in
the iPhone app yet. Prices illustrative.

### Website (`frontend-vodafone`)
Next.js 16 + `@dotcms/react`: `DotCMSLayoutBody` renders each page from its
dotCMS template, mapping content type variables to components in
`src/components/content-types/`. Plans and stores come from GraphQL
collections loaded with every page (`src/utils/queries.ts`). Editable in the
Universal Visual Editor (inline text, Style editor on hero slides). See its
`AGENTS.md`.

### iPhone app (`mobile-vodafone`)
Tabs Home, Plans, Cash (render the dotCMS pages section by section via one
GraphQL page query each) and Stores (store collection + Apple Map). Pull to
refresh reloads from dotCMS. See its `AGENTS.md`.

---

## Gotchas learned (read before changing things)

- **Never name a field `sortOrder`** — it's a built-in contentlet property;
  creation works but every later edit fails with `BADTYPE`. We use
  `displayOrder`.
- **Publishing a page publishes its Vodafone sections too** — but only
  because of a custom step on System Workflow → Publish (both "Publish"
  actions), installed by `docs/install-publish-page-sections.py`, source
  `docs/workflow/publish-page-sections/publish-page-sections.vtl`. For
  admins and Vodafone Reviewers it publishes the unpublished Vodafone page
  sections (banners, slides, carousels, tiles, …; not plans/stores/
  subscriptions) **on the page's site**, through Vodafone Editorial. Editors
  can't publish pages. Out of the box dotCMS publishes the page only.
- **JavaScript workflow steps are broken on this dotCMS version**: any JS
  step that finishes normally makes the action fail (HTTP 500) — only a JS
  step that throws "works". Use Velocity steps. Velocity has no try/catch,
  so check permissions before `$workflowtool.fire` (a refusal fails the
  whole action).
- **Action step order isn't guaranteed** when created over the API. A
  Publish that runs Save after Publish leaves a draft copy of everything;
  `vodafone-editorial.py` now rebuilds and verifies each action's steps.
- **The Page content type** (System Host) needs *read* permission for the
  Vodafone roles before they can publish pages — set it in the UI (Content
  Types → Page → Permissions); the permissions API ignores content types.
- **Inserting a row renumbers a drawn template's containers** in layout
  order (dotCMS moves the placed content along). Look containers up by row
  class, not by a fixed uuid.
- **Inline edits save drafts.** Apps and the public site show published
  content only; in the editor the website asks for `+working:true` and passes
  the editor's mode to dotCMS (needed for Style editor schemas too).
- **New content under Vodafone Editorial**: create with `fire/NEW` (Save),
  then `fire/PUBLISH` — a one-step PUBLISH on brand-new content errors. A
  field saved with PUBLISH sometimes lands only in the draft; publishing again
  fixes it. The search index can lag a few seconds after publishing.
- **/api/vtl endpoints resolve the site from the domain.** awesomedemo-dev's
  domain belongs to the default site (demo.dotcms.com), so the endpoint file
  lives there under a `vodafone-` name and queries telcodemo.com by site id.
  `?host_id=` does not help.
- **Role search skips top-level roles** — list `/api/v1/roles` instead. New
  users need the built-in `DOTCMS_BACK_END_USER` role to log in. Roles need
  `canEditLayouts: true` before tools can be assigned.
- **Expo env:** don't leave `EXPO_PUBLIC_DOTCMS_AUTH_TOKEN=` empty in
  `.env.local` — an empty line overrides a token set in the shell.
- **Simulator (Xcode 27 "DeviceHub")**: `expo start --ios` opens the first
  booted simulator; boot only the iPhone 17 Pro Max, or `xcrun simctl
  openurl <udid> exp://127.0.0.1:8081`. The "Open in Expo Go?" prompt was
  pre-approved in the simulator's LaunchServices plist and Expo Go's
  onboarding was skipped (`defaults write host.exp.Exponent …`).
- **Website mobile layout**: the SDK's column classes are hashed CSS
  modules; target `[data-dot="column"]`, not `Column-module_*` (sandler's CSS
  has this bug).

## Open items

- The "New World of RED !" slide has an unpublished draft by Nuno ("RED
  **is** built…"); live reads "RED **was** built…". Left as is on purpose.
- Existing Vodafone items only get a workflow step the next time they're
  edited.
- A full from-scratch run of `build-vodafone.py` with the new media,
  subscriptions and workflow steps hasn't been done; each part was verified
  against the live site.
- Arabic (RTL) is not built — the العربية switch is visual only.

---

## Talking notes — content caching

- **dotCMS itself** keeps content, pages, permissions and templates in memory;
  publishing invalidates the affected entries cluster-wide automatically.
  Editors never clear a cache.
- **Delivery APIs** (GraphQL, REST) can cache responses with a TTL — trade
  freshness for load; confirm settings for their version.
- **Headless front end** (Next.js): cache pages for N seconds, or better,
  on-demand revalidation — a workflow action / webhook on publish tells the
  front end to refresh just that page. The demo renders fresh per request.
- **CDN** (CloudFront / Akamai / Cloudflare) in front of the site and `/dA`
  images (resized variants cache very well); purged on publish the same way.
- **Authoring vs delivery**: Push Publishing sends approved content from an
  internal authoring environment to public delivery servers, or static to
  S3 + CDN.
- Message: invalidation is event-driven — publish clears dotCMS, the front
  end and the CDN — so they can cache aggressively without stale content.

## Talking notes — migrating from their platform

- **They run Liferay DXP**: web.vodafone.com.eg markup shows Liferay journal
  articles, portlets and fragments; images come from `/documents/...`.
- **Model first**: map Liferay web-content structures to dotCMS content types
  (this demo shows the target: plans, subscriptions, stores, page sections).
- **Scripted, repeatable import**: export via Liferay's headless REST APIs
  (structured contents, documents & media), transform, load through the
  dotCMS Workflow API — how this demo was built. Re-runnable: full load, then
  deltas until cut-over.
- **CSV import** for flat lists (stores, dealers, FAQs) — Content → Import.
- **dotCLI** for content types, sites, languages and workflows as code in Git,
  pushed across environments.
- **Assets**: bulk upload into media-library folders keeping file names;
  Vanity URLs / redirects from old `/documents/...` and page URLs for SEO.
- **Arabic + English**: language versions of the same content with fallback,
  not separate sites.
- **Pages**: rebuild templates and layouts rather than migrate; import content,
  then place it on pages (by editors or script).
- Suggested plan: model mapping → pilot one section (plans) → automated load
  → URL redirects → content freeze + final delta → go-live.
