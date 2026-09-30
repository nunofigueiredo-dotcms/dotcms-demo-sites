# Vodafone Egypt demo — run sheet

Site **telcodemo.com** on https://awesomedemo-dev.dotcms.dev · website
`frontend-vodafone` (http://localhost:3007, `npm run dev:vodafone`) · iPhone
app `mobile-vodafone` (`npm run ios:vodafone`).

Demo logins (passwords in `docs/vodafone-users.local.csv`, gitignored):

| User | Role | Can |
|---|---|---|
| editor@telcodemo.com (Mona Hassan) | Vodafone Editor | Edit Vodafone content, save, submit for review. Cannot publish. |
| reviewer@telcodemo.com (Karim Adel) | Vodafone Reviewer | Approve & publish, send back with a comment, publish, unpublish, archive. |

Both see Site, Content and Digital Assets only.

---

## 1. Page building, media and workflow

**Build a page** (as admin or the editor)
1. Site → Pages → *New page* on the **Vodafone Full Width** template (e.g. `/promotions`).
2. Add sections from the palette: *Vodafone Page Banner*, *Feature Split*,
   *Feature Grid*, *FAQ*… Each is a content type the React frontend renders
   as a component (`frontend-vodafone/src/components/content-types`).
3. Home page, hero row: one **Vodafone Hero Slide** banner — click its text
   to edit inline; it's published with the page.
4. **Style editor** on the banner: image left/right, alignment, font, size,
   uppercase/italic, background, button style — no code change.
5. **Add the carousel widget**: **+** below the banner → Content → search
   "offers" → add **Home — offers carousel** (a *Vodafone Hero Carousel*).
   It rotates the three slides picked in its **Slides** field; edit the
   carousel to add, remove or drag-reorder slides (**Edit this slide** opens
   one).
6. **Publish** the page (as admin or reviewer): the page *and* its
   unpublished Vodafone sections go live together — a custom step on the
   System Workflow's Publish (`docs/install-publish-page-sections.py`).

**Media**
- Site Browser → `/images/{hero,home,cash,red}`: every image is a file in the
  media library. Content has *Image* fields that reference them.
- Reuse: `/images/cash/vodafone-cash.jpg` is used by the home "Vodafone Cash"
  tile *and* the Cash page banner. Replace the file once → both change.
- Open an image: metadata, versions/history, focal point, image editor.
  The frontend asks dotCMS for resized WebP (`/dA/{id}/800w/80q`), so one
  master file serves every size.

**Review-and-publish workflow — "Vodafone Editorial"**

```
Draft ──Submit for review──▶ In Review ──Approve & publish──▶ Published
  ▲                             │
  └──────── Send back ──────────┘         (editing a published item → Draft)
```

1. Log in as **editor** → open the home page → edit a slide's headline inline
   (saves a draft) → on the slide, workflow action **Submit for review**, add
   a comment. Try **Publish Page**: the editor has no publish permission.
2. Log in as **reviewer** → the item is assigned to Vodafone Reviewer →
   **Send back** with a comment, or **Approve & publish**.
3. Refresh the website / pull down in the app: the change is live.

Workflow applies to all Vodafone content types; pages keep the System
Workflow (the page type is shared by every site on the instance). Set up by
`docs/vodafone-editorial.py`.

---

## 2. Structured content and APIs

**Two related lists** (Content → search by type)
- **Vodafone Plan** (5 RED plans) and **Vodafone Subscription** (8: Disney+,
  YouTube Premium, WATCH IT, OSN+, Anghami Plus, Amazon Prime, Yango Play, TOD).
- Many-to-many relationship **Plan → Subscription options**, plus
  *Subscriptions included* (e.g. ADVANCE+: choose 5 of 7). Open a plan to show
  the relationship field; open a subscription to see the plans that offer it.
- The website and app plan cards read the relationship ("Choose 5 of 7").

**Retrieve them as JSON** — three ways, all anonymous (published content only):

1. **Custom endpoint** (scripted in dotCMS, returns the shape we choose):
   ```
   https://awesomedemo-dev.dotcms.dev/api/vtl/vodafone-red-plans
   https://awesomedemo-dev.dotcms.dev/api/vtl/vodafone-red-plans?maxPrice=1500
   https://awesomedemo-dev.dotcms.dev/api/vtl/vodafone-red-plans?subscription=TOD&maxPrice=1000
   ```
   Source: `frontend-vodafone/dotcms/apivtl/vodafone-red-plans/get.vtl`
   (uploaded by `docs/vodafone-apis.py`). Change the JSON shape by editing the
   script — no deploy. *(On awesomedemo-dev the file sits on the default site,
   which owns the shared domain; on a site with its own domain it lives on
   that site.)*

2. **GraphQL** — the client picks fields and follows the relationship:
   ```bash
   curl -s https://awesomedemo-dev.dotcms.dev/api/v1/graphql \
     -H 'Content-Type: application/json' -d '{"query":"{
       VodafonePlanCollection(query: \"+conHost:c81fca370b6afed12062f71739234638 +live:true\", sortBy: \"VodafonePlan.displayOrder asc\") {
         title price subscriptionsIncluded
         subscriptions { title category }
       } }"}'
   ```
   Also Dev Tools → GraphQL in dotCMS for an interactive playground.

3. **Content REST API** — Lucene query, related content nested with `depth`:
   ```
   https://awesomedemo-dev.dotcms.dev/api/content/query/+contentType:VodafonePlan%20+conHost:c81fca370b6afed12062f71739234638%20+live:true/depth/1
   ```

---

## 3. Personalization

Three personas (dotCMS → Marketing → Personas), each with its own home-page
**hero** and **Offers for you** row (the row right below the quick links).
Everything else on the page is shared. Prices are illustrative.

| Persona (key tag) | Trigger | Hero | Offers |
|---|---|---|---|
| Tourist / Visitor to Egypt (`VodafoneTourist`) | outside Egypt · `utm_campaign` contains `airport` or `visit-egypt` · `utm_source=travel` | "Welcome to Egypt. Stay connected." | Tourist SIM 7 / 15 days, Travel eSIM 30 days |
| Young Social-First Prepaid (`VodafoneSocialPrepaid`) | `utm_source=tiktok` / `instagram` / `facebook` · `utm_campaign` contains `social-unlimited` | "Scroll, post, repeat with Social Unlimited" | Social Unlimited add-on, Flex Youth 120 / 200 |
| Device Shopper (`VodafoneDeviceShopper`) | browsed `/devices` this visit · `utm_campaign` contains `device-instalments` | "Your new phone, 0% instalments" | RED ESSENTIAL+ / ADVANCE+ / PRIME+ with a new phone |

**In the editor** — open the home page, pick a persona in the **persona
dropdown** (top right, "Default Visitor"): hero and offers swap; edit either
for that persona only.

**As a visitor** (live site; a fresh private window per journey):
```
/?utm_campaign=airport          tourist            (stays for the visit)
/?utm_source=tiktok             young social-first prepaid
/devices  → then /              device shopper
/?persona=VodafoneTourist       force a persona (demo driving)
/?persona=reset                 back to the default page
```
A dark badge at the bottom says which persona the page is personalized for.

**The rules** (Marketing → Rules on telcodemo.com) show the same triggers as
dotCMS configuration, including **Visitor's country is not Egypt** — show
this screen for the location story. The headless site resolves the triggers
itself (dotCMS rules only run for pages dotCMS serves):
`frontend-vodafone/src/utils/personaTargeting.ts` + `src/proxy.ts`. Location
targeting is off on the site (so a demo from abroad still shows the default
page); set `PERSONA_GEO=true` on Vercel to turn it on.

Set up by `docs/vodafone-personalization.py`.

## Rebuilding

```bash
export DOTCMS_AUTH_TOKEN=...      # admin on awesomedemo-dev
python3 docs/build-vodafone.py    # types, media, pages, content, then:
                                  #   vodafone-editorial.py, vodafone-apis.py
cd frontend-vodafone && npm run style-schemas
```
`build-vodafone.py` refuses to run if telcodemo.com already has a home page.
