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
   carousel to add, remove or drag-reorder slides. Slides are reusable
   content, so a slide edit goes through review and its own publish
   (**Edit this slide** opens it).

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

## Rebuilding

```bash
export DOTCMS_AUTH_TOKEN=...      # admin on awesomedemo-dev
python3 docs/build-vodafone.py    # types, media, pages, content, then:
                                  #   vodafone-editorial.py, vodafone-apis.py
cd frontend-vodafone && npm run style-schemas
```
`build-vodafone.py` refuses to run if telcodemo.com already has a home page.
