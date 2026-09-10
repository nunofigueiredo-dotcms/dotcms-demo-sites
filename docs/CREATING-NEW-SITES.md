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
- Archived content can linger in GraphQL listings until the index catches up —
  verify with `POST /api/content/_search` and check `live`/`archived` directly.

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
