#!/usr/bin/env python3
"""Give telcodemo.com its own container, so the editor only offers Vodafone
components on Vodafone pages.

The Vodafone templates were built on dotCMS's System Container, which
accepts every content type on the instance — so the Universal Visual
Editor's palette on telcodemo.com listed Sandler, bank and demo types too.
This creates a "Vodafone Sections" container on telcodemo.com that accepts
only the Vodafone page-section types (plus plain rich text), switches the
Vodafone templates to it, and moves every placement on every telcodemo.com
page — including each persona's version — into it.

    export DOTCMS_HOST=https://awesomedemo-dev.dotcms.dev
    export DOTCMS_AUTH_TOKEN=...          # admin
    python3 vodafone-container.py

Placements are backed up to vodafone-placements-backup.local.json first.
Safe to re-run: the container is reused, and templates/pages already on it
are left as they are.
"""
import json
import os
import sys

os.environ.setdefault("DOTCMS_HOST", "https://awesomedemo-dev.dotcms.dev")
import dotcms_site as ns  # noqa: E402

SITE = os.environ.get("VODAFONE_SITE", "telcodemo.com")
TITLE = "Vodafone Sections"
OLD = "SYSTEM_CONTAINER"
TEMPLATES = ["Vodafone Home", "Vodafone Full Width"]
BACKUP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vodafone-placements-backup.local.json")
# Page sections editors may add — not records like plans, stores or devices,
# which sections list (Plan List, Store Locator, Device List).
SECTION_TYPES = [
    "VodafoneHeroSlide", "VodafoneHeroCarousel", "VodafonePageBanner", "VodafoneQuickLinks",
    "VodafoneTile", "VodafoneServiceCarousel", "VodafonePlanList", "VodafoneFeatureSplit",
    "VodafoneFeatureGrid", "VodafoneFaq", "VodafoneStoreLocator", "VodafoneDeviceList",
    "webPageContent",
]


def entity(resp, what):
    e = resp.get("entity") if isinstance(resp, dict) else None
    if e is None or (isinstance(resp, dict) and resp.get("errors")):
        sys.exit(f"  ! {what}: {str(resp)[:300]}")
    return e


def ensure_container(site_id):
    found = ns.api("GET", f"/api/v1/containers?filter={TITLE.replace(' ', '%20')}&host={site_id}&per_page=20")
    for c in found.get("entity") or []:
        if c.get("title") == TITLE and c.get("hostId", site_id) == site_id:
            return c["identifier"]
    structures = []
    for variable in SECTION_TYPES:
        t = entity(ns.api("GET", f"/api/v1/contenttype/id/{variable}"), variable)
        # Headless: the frontends render the content, so no Velocity code is needed.
        structures.append({"structureId": t["id"], "code": "$!{dotContentMap.title}"})
    c = entity(ns.api("POST", "/api/v1/containers", {
        "title": TITLE, "friendlyName": TITLE, "hostId": site_id, "maxContentlets": 25,
        "notes": "Vodafone page sections only. Rendered by the headless frontends.",
        "code": "", "preLoop": "", "postLoop": "", "containerStructures": structures}), "container")
    ns.api("PUT", "/api/v1/containers/_publish", [c["identifier"]])
    return c["identifier"]


def pages(site_id):
    hits = ns.api("POST", "/api/content/_search", {
        "query": f"+basetype:5 +conHost:{site_id} +working:true +deleted:false", "limit": 200})
    # The index can hold several entries per page: keep one per identifier.
    found = {}
    for p in hits["entity"]["jsonObjectView"]["contentlets"]:
        found.setdefault(p["identifier"], (p["identifier"], p["url"] if p["url"].startswith("/") else "/" + p["url"],
                                           p.get("path")))
    return list(found.values())


def page_uri(page):
    """/index, /plans/index, … as the page API wants it."""
    pid, url, path = page
    return path or url


def placements(site_id, uri, persona=""):
    q = f"/api/v1/page/json{uri}?host_id={site_id}&language_id=1&mode=EDIT_MODE"
    if persona:
        q += f"&com.dotmarketing.persona.id={persona}"
    e = entity(ns.api("GET", q), uri)
    return {u.replace("uuid-", ""): [x["identifier"] for x in items]
            for cid, c in e["containers"].items() if cid == OLD
            for u, items in c["contentlets"].items()}


def site_personas(site_id):
    """The site's personas (key tags). /api/v1/page/{id}/personas can't be
    used: it lists the default site's personas on a shared domain."""
    hits = ns.api("POST", "/api/content/_search",
                  {"query": f"+contentType:persona +conHost:{site_id} +deleted:false", "limit": 50})
    return sorted({p["keyTag"] for p in hits["entity"]["jsonObjectView"]["contentlets"]})


def persona_variants(site_id, uri, default, personas):
    """Personas with their own version of the page: their placements differ
    from the default. (Without one, a persona sees the default page.)"""
    variants = {}
    for key in personas:
        slots = placements(site_id, uri, key)
        if slots != default:
            variants[key] = slots
    return variants


def switch_template(site_id, title, new):
    tpls = entity(ns.api("GET", f"/api/v1/templates?host={site_id}&per_page=50"), "templates")
    t = next((x for x in tpls if x["title"] == title), None)
    if not t:
        return
    full = entity(ns.api("GET", f"/api/v1/templates/{t['identifier']}/working"), title)
    rows = full["layout"]["body"]["rows"]
    slots = [c for r in rows for col in r["columns"] for c in col["containers"]]
    if all(c["identifier"] == new for c in slots):
        print(f"  template {title}: already on {TITLE}")
        return
    for c in slots:
        c["identifier"] = new
    body = "\n".join(f'#parseContainer("{new}","{c["uuid"]}")' for c in slots)
    entity(ns.api("PUT", "/api/v1/templates", {
        **{k: full[k] for k in ("identifier", "inode", "title", "friendlyName", "theme", "drawed", "layout")},
        "siteId": site_id, "body": body, "drawedBody": body}), f"template {title}")
    ns.api("PUT", "/api/v1/templates/_publish", [t["identifier"]])
    after = entity(ns.api("GET", f"/api/v1/templates/{t['identifier']}/working"), title)
    uuids = [c["uuid"] for r in after["layout"]["body"]["rows"] for col in r["columns"] for c in col["containers"]]
    if uuids != [c["uuid"] for c in slots]:
        sys.exit(f"  ! template {title}: container slots changed {uuids} — restore from {BACKUP}")
    print(f"  template {title}: switched to {TITLE}")


def main():
    site_id = entity(ns.api("POST", "/api/v1/site/_byname", {"siteName": SITE}), "site")["identifier"]
    container = ensure_container(site_id)
    print(f"  container {TITLE} -> {container}")

    # 1. Read everything on the old container first (it disappears from the
    #    page API once the templates stop using it).
    saved = {}
    personas = site_personas(site_id)
    for page in pages(site_id):
        uri = page_uri(page)
        default = placements(site_id, uri)
        variants = {"": default, **persona_variants(site_id, uri, default, personas)}
        if any(variants.values()):
            saved[page[0]] = {"uri": uri, "variants": variants}
    if saved:
        json.dump({"container": OLD, "pages": saved}, open(BACKUP, "w"), indent=1)
        print(f"  backed up {len(saved)} pages' placements to {BACKUP}")

    # 2. Templates.
    for title in TEMPLATES:
        switch_template(site_id, title, container)

    # 3. Placements, per page and persona, on the new container.
    for page_id, p in saved.items():
        for persona, slots in p["variants"].items():
            payload = [{"personaTag": persona, "contentletsId": ids, "identifier": container, "uuid": u}
                       for u, ids in sorted(slots.items())]
            entity(ns.api("POST", f"/api/v1/page/{page_id}/content", payload), f"{p['uri']} {persona}")
        ns.api("PUT", f"/api/v1/workflow/actions/default/fire/PUBLISH?identifier={page_id}&indexPolicy=WAIT_FOR",
               {"contentlet": {"identifier": page_id, "contentType": "htmlpageasset", "languageId": 1}})
        ns.api("PUT", f"/api/v1/content/_unlock/{page_id}")
        print(f"  {p['uri']}: {', '.join(k or 'default' for k in p['variants'])}")


if __name__ == "__main__":
    main()
