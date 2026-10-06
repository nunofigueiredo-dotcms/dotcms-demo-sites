# Creating a new demo site in dotCMS

How to build a new headless demo site — dotCMS content plus a Next.js frontend —
modelled on the three that already exist on this instance.

Written against **dotCMS 26.09.03-01** at `http://localhost:8082`, verified end
to end on 2026-09-10 by building `spiritvoice.com` from nothing.

---

## What already exists

One dotCMS instance hosts all three sites. Content types are **global to the
instance**, so a new site reuses them rather than defining its own.

| Site | Identifier | Frontend | Port |
|---|---|---|---|
| `bank.com` | `4afebb3f5a60baed95fa8e55e1038087` | `~/headless/generaldemos/frontend` | 3000 |
| `brightwater.com` | `47e383616e861d17e8d0023a8255cf68` | `~/demos/dotcms-healthcare-demo` | 3001 |
| `spiritvoice.com` | `37d5620507db317630badccd5adb0fbd` | `~/headless/generaldemos/frontend-spiritvoice` | 3002 |
| `govconnectcentral.com` | `a59c36f2e47c71b1f2cf63fd1d4c0244` | `~/headless/generaldemos/frontend-govconnect` | 3003 |
| `forgehub.com` | `3465943d44960cdee2606a7fd248b808` | `~/headless/generaldemos/frontend-forgehub` | 3004 |
| `sandler.com` | `e817e9c8f1c76b29940ee10be7ebb224` | `~/headless/generaldemos/frontend-sandler` | 3006 |
| `educationdemo.com` (awesomedemo-dev) | `5875220ead521d2fe31cedd1aad6b594` | `~/headless/generaldemos/frontend-education` | 3008 |

The Docker stack lives in `~/headless/generaldemos` (project name pinned to
`generaldemos` in `docker-compose.yml`). All content is in Docker volumes
`generaldemos_{dbdata,cms-shared,opensearch-data}` — **not** in any project folder.

---

## Before you start: the one constraint that shapes everything

**Most content types cannot be placed on an arbitrary site.** A type can only
target a chosen site if it has a `HostFolderField`. Verified on this instance:

| Content type | Site field | Can target any site? |
|---|---|---|
| `webPageContent` | `contentHost` | ✅ yes |
| `Blog` | `site` | ✅ yes |
| `Banner` | — | ❌ lands on System Host |
| `Service` | — | ❌ lands on the default/current site |
| `Product`, `CallToAction`, `Location`, `Doctor`, `HealthTip`, `Author`, `BlogList` | — | ❌ |

For types with no site field, `host` / `hostFolder` in the payload is **silently
ignored**, and you cannot move the contentlet afterwards — you have to archive it
and start again.

Check before you build:

```bash
curl -s "$HOST/api/v1/contenttype/id/Service" -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import json,sys; d=json.load(sys.stdin)['entity']; \
print([f['variable'] for f in d['fields'] if 'HostFolder' in f['clazz']] or 'NO SITE FIELD')"
```

**Practical consequence:** build page sections as `webPageContent` blocks and
articles as `Blog`. If you need structured data (plans, products, locations)
scoped to one site, create a **new content type with a Site field** first.

### Required fields per type

Creating content without these returns HTTP 400 with the field named:

| Type | Required |
|---|---|
| `webPageContent` | `title`, `contentHost`, `body` |
| `Blog` | `title`, `urlTitle`, `site`, `publishDate` |
| `Banner` | `title`, `image` |
| `Service` | `title`, `urlTitle` |
| `BlogList` | `widgetTitle` |

---

## Step 1 — Create and publish the site

A new site is created **unpublished**. It will not serve content until you
publish it, and `POST /api/v1/site` requires `forceExecution` for hostname changes.

```bash
HOST=http://localhost:8082
TOKEN=<your api token>

curl -s -X POST "$HOST/api/v1/site" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "siteName": "example.com",
    "languageId": 1,
    "tagStorage": "SYSTEM_HOST",
    "description": "Example demo site",
    "runDashboard": false,
    "forceExecution": true
  }'
# -> note the returned "identifier"

curl -s -X PUT "$HOST/api/v1/site/<IDENTIFIER>/_publish" \
  -H "Authorization: Bearer $TOKEN"
# -> live: true
```

---

## Step 2 — Create the page folders FIRST

**This is the step that bites.** If the folder does not exist, a page created
with `url: "/plans/index"` silently collapses to `/index` and collides with the
home page — the error you get is a confusing "Page URL [/index] already exists".

```bash
curl -s -X POST "$HOST/api/v1/folder/createfolders/example.com" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '["/plans","/coverage","/support","/about","/blog"]'
```

---

### Showing folders in the menu

`DotNavigation` only lists folders with `showOnMenu: true`, and
`createfolders` leaves it false. Set it (plus a display title and order) with
`PUT /api/v1/assets/folders` — and **leave `name` out**, even though the
OpenAPI schema marks it required. Sending it triggers a rename check that fails
with *"The name [x] on [site] already exists"*.

```bash
curl -s -X PUT "$HOST/api/v1/assets/folders" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"assetPath":"//example.com/plans/","data":{"title":"Plans","showOnMenu":true,"sortOrder":1}}'
```

---

## Step 3 — Templates: use SYSTEM_CONTAINER

Do **not** create file-based containers for a headless site. dotCMS ships a
built-in `SYSTEM_CONTAINER` that works on any site with no `.vtl` upload.

A drawed template needs **both** a `layout` and a matching `body` of
`#parseContainer` lines, or it fails with *"body required when drawed"*.

```bash
curl -s -X POST "$HOST/api/v1/templates" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{
  "title": "Example Home",
  "friendlyName": "Example Home",
  "siteId": "<SITE_ID>",
  "theme": "64e0e438ca52c6e73a269141c9e8a982",
  "drawed": true,
  "body": "#parseContainer(\"SYSTEM_CONTAINER\",\"1\")\n#parseContainer(\"SYSTEM_CONTAINER\",\"2\")",
  "layout": {
    "body": {"rows": [
      {"styleClass":"","columns":[{"styleClass":"","leftOffset":1,"width":12,
        "containers":[{"identifier":"SYSTEM_CONTAINER","uuid":"1"}]}]},
      {"styleClass":"","columns":[{"styleClass":"","leftOffset":1,"width":12,
        "containers":[{"identifier":"SYSTEM_CONTAINER","uuid":"2"}]}]}
    ]},
    "header": true, "footer": true, "sidebar": null
  }}'
```

Each container slot needs a unique `uuid` ("1", "2", "3"…). Columns use a
12-unit grid, and `leftOffset` is cumulative (1, 5, 9 for three 4-wide columns).

> `SYSTEM_THEME` is **not** a valid `theme` value — it must be a real folder
> identifier. `64e0e438ca52c6e73a269141c9e8a982` is the `starter` theme, which
> is fine for headless because the frontend does the rendering.

### Updating an existing template

`PUT /api/v1/templates` accepts **only** these fields — anything else returns
400 listing the valid set:

```
body, countAddContainer, countContainers, drawed, drawedBody, footer,
footerCheck, friendlyName, headCode, header, headerCheck, identifier, image,
inode, layout, name, selectedimage, showOnMenu, siteId, sortOrder, theme,
themeName, title
```

---

## Step 4 — Create pages

Note the split: `hostFolder` carries the folder, `url` is just the leaf name.

```bash
curl -s -X PUT "$HOST/api/v1/workflow/actions/default/fire/PUBLISH" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"contentlet":{
    "contentType":"htmlpageasset",
    "title":"Plans",
    "url":"index",
    "hostFolder":"<SITE_ID>:/plans",
    "template":"<TEMPLATE_ID>",
    "friendlyName":"Plans",
    "cachettl":"0",
    "languageId":1
  }}'
```

For the home page use `"hostFolder":"<SITE_ID>:/"` and `"url":"index"`.

---

## Step 5 — Create content

### Page sections (`webPageContent`)

`body` is a **StoryBlock JSON document**, not HTML, passed as a JSON *string*:

```python
body = json.dumps({"type":"doc","content":[
  {"type":"heading","attrs":{"level":1,"textAlign":"left"},
   "content":[{"type":"text","text":"Every plan, one honest price"}]},
  {"type":"paragraph","attrs":{"textAlign":"left"},
   "content":[{"type":"text","text":"No introductory rate that doubles."}]},
  {"type":"bulletList","content":[
    {"type":"listItem","content":[{"type":"paragraph",
      "content":[{"type":"text","text":"20 GB of 5G data"}]}]}]}
]})
```

Then `PUT /api/v1/workflow/actions/default/fire/PUBLISH` with:

```json
{"contentlet":{"contentType":"webPageContent","contentHost":"<SITE_ID>",
 "title":"Plans intro","body":"<the JSON string above>","languageId":1}}
```

### Articles (`Blog`)

Uses `site`, not `contentHost`. `urlTitle` must be **globally unique** across
the instance — prefix it (`sv-`, `bank-`) to avoid collisions:

```json
{"contentlet":{"contentType":"Blog","site":"<SITE_ID>",
 "title":"What 5G actually changes","urlTitle":"ex-what-5g-changes",
 "description":"Short teaser.","body":"<StoryBlock JSON string>",
 "publishDate":"2026-09-01 09:00:00","languageId":1}}
```

Blog detail URLs come from the content type's `urlMapPattern`:
**`/blog/post/{urlTitle}`** — not `/blog/{urlTitle}`.

### Images

Binary uploads go through the temp API, which **requires an `Origin` header**:

```bash
curl -s -X POST "$HOST/api/v1/temp" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Origin: http://localhost:8082" \
  -F "file=@hero.png"
# -> {"tempFiles":[{"id":"temp_xxxx", ...}]}
```

Then pass `temp_xxxx` as the value of the binary field (e.g. `"image":"temp_xxxx"`).

Serve resized: `/dA/{identifier}/image/800w/80q` returns **WebP** and is
dramatically smaller than the original (2.2 MB → 18 KB on the demo assets).
Adding the quality parameter is what switches the pipeline to WebP.

---

## Step 6 — Place content on the page

The payload is a **JSON array**, not an object. Multiple contentlets can share
one `uuid` — they stack in that slot.

```bash
curl -s -X POST "$HOST/api/v1/page/<PAGE_ID>/content" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '[
    {"personaTag":"","contentletsId":["<CONTENT_ID_1>"],"identifier":"SYSTEM_CONTAINER","uuid":"1"},
    {"personaTag":"","contentletsId":["<CONTENT_ID_2>"],"identifier":"SYSTEM_CONTAINER","uuid":"2"}
  ]'
```

Then republish the page so the changes go live:

```bash
curl -s -X PUT "$HOST/api/v1/workflow/actions/default/fire/PUBLISH" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"contentlet":{"identifier":"<PAGE_ID>","contentType":"htmlpageasset"}}'
```

---

## Step 7 — The frontend

The Next.js app is **site-agnostic** — it reads the site from an env var, so a
new site needs no code changes.

The frontends are an **npm workspace** (root `package.json` in
`~/headless/generaldemos`), so there is one shared `node_modules` rather than a
~475 MB copy per site.

```bash
cd ~/headless/generaldemos
cp -R frontend frontend-example      # or copy only src/ public/ and configs
rm -rf frontend-example/.next frontend-example/node_modules \
       frontend-example/package-lock.json
```

Give the new workspace a unique name and a pinned port in its `package.json`:

```json
{ "name": "example-nextjs",
  "scripts": { "dev": "next dev -p 3005", "start": "next start -p 3005" } }
```

Add it to `workspaces` in the ROOT `package.json`, add a `dev:example` script,
then install once from the root:

```bash
npm install          # installs for every workspace
npm run dev:example
```

> Do **not** symlink `node_modules` into the new folder — Turbopack rejects
> symlinks pointing outside the filesystem root. The workspace handles it.

`.env.local` (gitignored — it holds a real token):

```
NEXT_PUBLIC_DOTCMS_HOST=http://localhost:8082
NEXT_PUBLIC_DOTCMS_AUTH_TOKEN=<token>
NEXT_PUBLIC_DOTCMS_SITE_ID=<SITE_ID>
NEXT_PUBLIC_DOTCMS_MODE=development
NEXT_PUBLIC_SITE_URL=http://localhost:3003
```

Pin the port in `package.json` so instances do not fight:

```json
"scripts": { "dev": "next dev -p 3003", "start": "next start -p 3003" }
```

---

## Step 8 — Point UVE at the frontend (do not skip)

**A site with no UVE config falls back to the Velocity `starter` theme.** Themes
are per-site folders, so a new site borrows another site's theme and every asset
404s — the admin preview shows a broken logo and stray alt-text fragments
(the infamous "tic"). The fix is UVE config, *not* copying theme files.

```bash
curl -s -X POST "$HOST/api/v1/apps/dotema-config-v2/<SITE_ID>" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"configuration":{"value":"{\"config\":[{\"pattern\":\".*\",\"url\":\"http://localhost:3003\",\"options\":{\"allowedDevURLs\":[\"http://localhost:3003\"]}}]}","hidden":false}}'
```

Verify: `GET /api/v1/apps/dotema-config-v2/<SITE_ID>` → `configured: true`.

---

## Step 9 — Verify

The single most important check. dotCMS resolves contentlets server-side by
identifier, so **contentlet counts can look fine while the page is broken for
any client**. Compare layout references against the containers map:

```bash
curl -s "$HOST/api/v1/page/json/index?language_id=1&mode=LIVE&host_id=<SITE_ID>" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import json,sys
e=json.load(sys.stdin)['entity']
keys=set((e.get('containers') or {}).keys())
rows=((e.get('layout') or {}).get('body') or {}).get('rows',[])
refs=[c['identifier'] for r in rows for col in r['columns'] for c in col['containers']]
bad=[r for r in refs if r not in keys]
print('refs=%d unresolved=%d -> %s' % (len(refs), len(bad), 'BROKEN' if bad else 'OK'))
"
```

`unresolved > 0` means every client doing `containers[identifier]` gets
`undefined`. The Next.js SDK crashes with
`Cannot destructure property 'contentlets' of dotCMSPageAsset.containers[identifier]`.

Then check each route actually renders:

```bash
for U in / /plans /coverage /support /about /blog; do
  printf '%-12s ' "$U"
  curl -s -o /tmp/p.html -w "%{http_code} " "http://localhost:3003$U"
  grep -q "Runtime TypeError\|Cannot destructure" /tmp/p.html && echo ERROR || echo ok
done
```

---

## Renaming a site later

`PUT /api/v1/site?id=<ID>` (id as a **query parameter**), with only the accepted
fields and `forceExecution: true` — dotCMS guards renames as a
*"Dangerous Execution"*.

**Renaming does NOT update template layouts.** dotCMS rewrites the `containers`
map keys to the new hostname but leaves `layout...containers[].identifier`
pointing at `//oldhost/...`. The page API still resolves contentlets, so it looks
fine — but every client breaks. After any rename:

1. `GET /api/v1/templates/{id}/working` for each template on the site
2. String-replace the old hostname
3. `PUT /api/v1/templates` with only the accepted fields
4. Re-run the Step 9 layout check

---

## Renaming the Docker project folder

`docker-compose.yml` pins `name: generaldemos`. **Keep it.** Without an explicit
name, Compose derives the project name from the directory, so renaming the folder
points at non-existent volumes and every site appears empty. The data is not lost
— the old volumes still exist — but it is an alarming way to find out.

To migrate volumes deliberately: `docker compose stop`, then for each volume
`docker run --rm -v old:/from -v new:/to alpine sh -c 'cd /from && cp -a . /to/'`,
then rename the folder, update `name:`, and `docker compose up -d`.

---

## Deleting a site

Three steps, in order — `DELETE` alone fails on a live site:

```bash
curl -s -X PUT "$HOST/api/v1/site/<SITE_ID>/_unpublish" -H "Authorization: Bearer $TOKEN"
curl -s -X PUT "$HOST/api/v1/site/<SITE_ID>/_archive"   -H "Authorization: Bearer $TOKEN"
curl -s -X DELETE "$HOST/api/v1/site/<SITE_ID>"         -H "Authorization: Bearer $TOKEN"
```

This removes the site and its pages permanently. Content on *other* sites is
untouched, but anything created without a site field (see the table at the top)
may have landed elsewhere and will survive — check before assuming a clean sweep.

To remove individual contentlets, fire `UNPUBLISH` then `ARCHIVE`; note that
`DELETE /api/v1/content/{id}` returns 405 on this version, so archiving is the
practical end state.

---

## Gotchas worth remembering

- **Saving page content via the API can leave the page locked by "system"**
  (`POST /api/v1/page/{id}/content`). Draft (edit) mode then disappears from
  the Universal Visual Editor for everyone. `place()` now unlocks the page
  afterwards; to fix an existing page, `PUT /api/v1/content/_unlock/{inode}`
  as an administrator.
- **`sortBy` silently returns zero results** when the field is not sortable, with
  no error — indistinguishable from "no content". Sortability is per field:
  `Blog.publishDate desc` works, `Blog.modDate desc` returns `[]`. Always test the
  exact string, and consider an unsorted fallback query.
- **Lucene filters need type qualification** (`+Blog.urlTitle:foo`), but
  `+conHost:{siteId}` does not.
- **StoryBlock needs sub-selection** in GraphQL: `body { json }`, never bare `body`.
- **Content is duplicated across sites** in this instance, so always filter
  listings by `+conHost:{siteId}` or posts appear twice.
- **`urlTitle` is globally unique** across the instance, not per site.
- **GraphQL collections return archived content** unless the query includes
  `+deleted:false` (e.g. `"+conHost:{siteId} +deleted:false"`). It is not
  index lag — the archived items stay until you filter them out.

---

## Reference: what spiritvoice.com contains

Built with exactly the steps above, as a worked example.

| Page | URL | Contents |
|---|---|---|
| Home | `/index` | Banner hero + intro + 3 plan cards |
| Plans | `/plans/index` | Intro, 3 tiers in columns, FAQ |
| Coverage | `/coverage/index` | Intro, mobile + fibre side by side, checker note |
| Support | `/support/index` | Intro, channels, common fixes, billing |
| About | `/about/index` | Company story, differentiators |
| Blog | `/blog/index` | Intro + `BlogList` widget |

Plus 4 `Blog` posts at `/blog/post/{urlTitle}`.

Helper script used to build it: `docs/new-site.py` (see alongside this file).

## Reference: what sandler.com contains

> **Where it lives:** the Sandler demo runs against **awesomedemo-dev**
> (`https://awesomedemo-dev.dotcms.dev`), site **`trainning-service.com`**
> (`2ad84b4176441e1b1a6ef8d2e683a79e`). The same build also exists on the
> local stack as `sandler.com`. `frontend-sandler/.env.local` decides which
> one the frontend reads; `.env.docker.local` keeps the local settings.
> Rebuild on either with `docs/build-sandler.py` (instructions in its
> docstring) — it creates the site, and refuses to run twice on one site.
>
> Two differences on awesomedemo-dev (dotCMS 26.09.24): templates need its
> `landing-page` theme (`DOTCMS_THEME_ID`), because the local `starter` theme
> folder doesn't exist there; and Block Editor fields arrive as JSON strings
> in the page API, so the frontend parses them (`utils/blocks.ts`).

Built by `docs/build-sandler.py`. Unlike the other sites it defines its **own
site-scoped content types** (all with a `site` field), so nothing depends on
the shared `Blog`/`Banner` types:

| Type | Used for |
|---|---|
| `SandlerHero` | Page heroes (large / compact) with a background image |
| `SandlerFeatureGrid` | Cards, numbered steps, Success Triangle, stats, awards, image + list — items are one per line, `Title \| Text \| link`; optional image |
| `SandlerLocalCenter` | Personalised block showing the visitor's chosen center |
| `SandlerCenterDirectory` | Searchable list of all centers (`/locations`) |
| `SandlerArticleList` | Latest articles |
| `TrainingCenter` | 4 real Sandler centers (Boston, Minneapolis, Mississauga, London) from go.sandler.com/locations; URL map `/locations/{urlTitle}`; drives the location selector. Each has its own page body, solutions, "why choose us" and awards; the challenges and next-steps sections below are shared, placed once on the detail page |
| `SandlerArticle` | 4 articles; URL map `/articles/{urlTitle}` |

The location selector (top right) stores the chosen center in a
`sandler-center` cookie. The server reads it, so the first render is already
personalised: header phone number, hero CTA, local-center blocks, footer.

Each center also has subpages, as on go.sandler.com:
`/locations/{center}/solutions/{solution}`, `/about-us`, `/events` and
`/contact-us`. They are **one shared set of dotCMS pages** under the hidden
`/center-pages/` folder, rendered by `app/locations/[center]/[...sub]` in the
center's context (its sub-menu, name, contact details and events). Edit a page
once and every center updates. A center only gets the solution pages listed in
its "Solutions offered" field; others 404. Links in content that start with
`~/` resolve to the current center (`~/contact-us` →
`/locations/minnesota/contact-us`). Events are `SandlerEvent` content with a
many-to-one relationship to `TrainingCenter` (the 11 events are sample data —
go.sandler.com's center calendars are currently empty).

**HubSpot form widget.** `HubSpotForm` is a dotCMS *Widget* type (fixed
`widgetTitle`, `contentHost`, constant `widgetCode`/`widgetUsage`/
`widgetPreexecute`, like `BannerCarousel`). Editors set the HubSpot portal
ID, form ID, region, fields (`property | Label | type | required`), button
text, thank-you message and optional consent text. The Next.js component
posts straight to HubSpot's public Forms API (`api.hsforms.com/submissions/
v3/integration/submit/{portal}/{form}` — CORS-enabled, no key needed) and adds
the chosen training center, either to a HubSpot property you name or to the
`message` field. `widgetCode` holds HubSpot's standard embed, so the same
widget also works on Velocity-rendered pages. It is placed on `/lets-connect`.

**Translation with Smartcat.** There is no Smartcat connector for dotCMS, so
`frontend-sandler/scripts/smartcat.mjs` is the bridge (`npm run smartcat --
send | pull [--now] | sync | status`). Articles use the **Smartcat Translation**
workflow (their only workflow, so its actions show on existing content):
Editing → *Send to Smartcat* → Queued for Smartcat → (bridge) In translation at
Smartcat → (bridge imports each language) Translation ready for review →
*Publish translation* → Published. `send` turns the title, teaser and each
Block Editor text run into a key-value JSON file (structure is preserved),
creates a Smartcat project en → es, fr with machine translation, and records a
**Translation Job** in dotCMS. `pull` exports finished documents and saves each
as that language's version of the article; `--now` imports partial
translations. It polls, so it needs no public URL. Credentials go in
`frontend-sandler/.env.smartcat.local` (see the `.example`).

**In dotCMS itself (current setup).** "Send to Smartcat" and "Check Smartcat"
are **JavaScript Actionlets** on the workflow (code in
`frontend-sandler/dotcms/smartcat/`, installed by `install_smartcat_actionlets`).
Send creates the project when the editor clicks (straight to *In translation at
Smartcat*); Check imports every language Smartcat has completed or
pre-translated into *Translation ready for review*; the editor then publishes
each and clicks *Mark translated*. The Node bridge still works as an
alternative. Credentials are in a **Smartcat Settings** item inside
`/_smartcat`, a folder only its owner (and admins) can read — scripts can't use
`dotsecrets` on awesomedemo-dev ("External scripting is disabled").

What the JavaScript sandbox needed, found by probing (awesomedemo-dev,
26.09.24): `fetchtool.fetch(url, {method, headers, body})` is the HTTP client —
synchronous; `method` is required; never pass `body: undefined`; it crashes on
empty responses (204) *after* the request succeeds; a multipart file part typed
`application/json` is rejected by Smartcat (send `text/plain`). No `btoa`,
`setTimeout` or awaited Promises. `contentlet` in an actionlet is an opaque Java
object — read the fired item's `inode` from `request.getParameter()` and use
the REST API. `/api/js/{folder}` endpoints resolve only on the site matching the
hostname (the default site). The upload firewall silently empties files that
contain a literal multipart header, so build that string from parts.
**Permissions:** a new content item copies its site's permissions, including
CMS Anonymous READ; `PUT /api/v1/permissions/{id}` merges rather than replaces,
and roles can only be removed from sites/folders — so keep secrets in a
restricted folder and verify anonymously before publishing.

The site serves `/es/…` and `/fr/…` via `src/proxy.ts`; pages fall back to
English content where no translation exists, and article lists prefer the
translated version. Gotchas found on the way: content in a System Workflow
step only gets that step's actions, so a second workflow's actions never
appear — make it the type's only workflow and map NEW/EDIT/PUBLISH to it
(`PUT /api/v1/workflow/system/actions`); workflow actions need an
`actionNextAssign` role even when nothing is assigned; GraphQL collections
return every language version unless filtered with `+languageId:`.

**Testimonials.** `SandlerTestimonial` (quote, name, role, rating, review
title, many-to-one relation to `TrainingCenter`) holds 36 quotes copied verbatim
from four centers' go.sandler.com testimonials pages
(`docs/sandler-testimonials.json`). Each center has a shared
`/about-us/testimonials` subpage (list + "Write a Review" form) and a "What
clients say" strip on its overview. The form posts to the Next.js route
`/api/reviews`, which saves an **unpublished** testimonial (source
`submitted`) — an editor approves it by publishing. Site collection queries
use `+live:true`: without it GraphQL returns drafts too, which would show
unapproved reviews and unpublished translations. If a hero image renders only
partly, dotCMS may have cached a corrupt resized variant — re-upload the image
(new file version, new variants).

**Center pages.** Each training center has its own dotCMS page at
`/locations/<slug>/index`, which dotCMS serves ahead of the TrainingCenter
URL map, so its sections can be edited, moved, added and removed in the
Universal Visual Editor like the home page. The sections are Sandler Center
Hero and Sandler Center Intro (both read the address, phone and solutions
from the center), Sandler Rich Text, feature grids, and the testimonial and
event lists. They sit in the center's folder, so the franchisee's editors
may edit them; the two shared sections at the bottom (challenges, next
steps) are HQ content placed on every center page. `build_center_overview_pages()`
creates them from the TrainingCenter content; a center without its own page
falls back to the generated view (`CenterDetail`). Search with `"depth": 1`
to get relationship fields (e.g. a testimonial's center) from `/api/content/_search`.

**Languages (English, Spanish, French).** Three layers:
- *Content* — sections, centers and events have es/fr versions made with
  dotAI's *AI - Translate Content* actionlet: the **Publish & Translate**
  action (HQ only) on the Franchisee Publishing workflow, and the System
  Workflow's own one. Use `translateTo: "*"` — a list like `es,fr` is
  silently ignored. The System Workflow action only sits on the *Published*
  step, so content still in *New* needs a Publish first. Machine
  translation also rewrites links (`/contact` → `/contacto`) and slugs, so
  link fields, center slugs and HubSpot IDs are in the actionlet's ignore
  list, and anything it still changed was restored from English. Pages
  (their `url` field) are not machine-translated.
- *Interface labels* (menus, buttons, messages) — defaults in
  `frontend-sandler/src/i18n/ui-strings.json`; `create_language_variables()`
  copies them into dotCMS **Language Variables** (`sandler.<key>`), which
  editors can change. `useT()` uses the dotCMS value, then the file.
- *Fallback* — a page, section, center or event without a translation shows
  in English (GraphQL queries fetch both and merge).

**Locations finder.** `/locations` works like go.sandler.com/locations: a
map with clustered pins (Leaflet + leaflet.markercluster, OpenStreetMap
tiles) above a country → state accordion of all 213 offices. They are
`SandlerLocation` content (name, go.sandler.com group id, city, state code,
country code, phone, lat/long, website) imported from
`docs/sandler-locations.json`. That file was scraped from the page and
geocoded with OpenStreetMap Nominatim from postcode/city, so the pins are
approximate. Nominatim's structured search matches the city name before
the postcode, so a Denver office with city "Englewood" landed in Englewood,
NJ; US offices were re-checked by ZIP alone and 14 corrected. Every location also has a `TrainingCenter` (same slug), so each has a full
center page: 7 are hand-written (`CENTERS`), the other 206 are created by
`create_network_centers()` with generic demo copy and six default solutions.
The `TrainingCenter` country field lists all 13 countries. The
`SandlerCenterDirectory` content sets what visitors can search: **Search
options** (distance from a ZIP/city, and/or same state in the US and same
country elsewhere), **Radius choices**, **Default radius** and **Distance
unit** and **Demo visitor location** (e.g. `New York, NY`: "Use my
location" and the radius buttons then treat every visitor as being there,
which makes the demo repeatable; leave it empty for real geolocation). The frontend reads locations through `/api/locations` (cached 5
min), and geocodes searches through `/api/geocode`, which proxies Nominatim
with an identifying User-Agent as its usage policy requires. CARTO's basemap
tiles now need an API key, which is why the map uses OSM tiles.

Branding follows sandler.com: Poppins, navy `#21245c` / cyan `#00aded` /
royal `#0045c2` / sky `#e5f3ff` (from their theme's CSS variables), the white
wordmark in `frontend-sandler/public/brand/`, and pill buttons. The hero,
split-section and award-badge images are dotCMS content, uploaded by the build
script from `docs/sandler-assets/`.

Two image gotchas found on the way:

- A binary field is a **path string** in the REST page API
  (`/dA/{id}/image/{file}`) but an **object** in the GraphQL page API the SDK
  uses — read `image.idPath`. Passing the object to `next/image` fails with
  *missing required "src"*, because it looks like a static import.
- GraphQL's `idPath` ends in `?language_id=1`. Strip it before swapping the
  file name for `{width}w/80q`, or you silently get the full-size original.

> The shared `Blog` type's detail page lives on **bank.com**, so
> `/blog/post/{urlTitle}` only resolves there — on other sites it 404s. A
> site-scoped article type with its own detail page avoids that.

## Using the helper script

```bash
export DOTCMS_AUTH_TOKEN=<token>

# scaffold a whole site
python3 new-site.py --site example.com --port 3003 --create

# check an existing site's layout references resolve
python3 new-site.py --site x --verify <SITE_ID>
```

To import the helpers into your own build script, use `dotcms_site.py` — the
identical module under an importable name, since `new-site.py` contains a hyphen
and cannot be `import`ed directly:

```python
import dotcms_site as ns
site_id = ns.create_site("example.com", "Example demo")
ns.create_folders("example.com", ["/services", "/about"])
tpl, _ = ns.template(site_id, "Home", [[12], [4, 4, 4]])
intro = ns.block(site_id, "Intro", [ns.h(1, "Hello"), ns.p("Body copy.")])
page = ns.page(site_id, "Home", "/", tpl)
ns.place(page, [("1", [intro])])
ns.configure_uve(site_id, "http://localhost:3003")
ns.verify(site_id, "/index")
```
