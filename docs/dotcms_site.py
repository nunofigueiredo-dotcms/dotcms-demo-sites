#!/usr/bin/env python3
"""Helpers for building a new dotCMS demo site.

See CREATING-NEW-SITES.md for the full walkthrough. This module is the
executable version of it — import it, or run it for a demo scaffold:

    export DOTCMS_AUTH_TOKEN=...
    python3 new-site.py --site example.com --create

Every function returns the parsed JSON response so failures stay visible
rather than being swallowed.
"""
import argparse
import json
import os
import subprocess
import sys

HOST = os.environ.get("DOTCMS_HOST", "http://localhost:8082")
TOKEN = os.environ.get("DOTCMS_AUTH_TOKEN", "")

# A theme folder identifier for templates. Headless sites still need a valid
# one; SYSTEM_THEME is NOT accepted. The default is the local stack's
# `starter` theme — set DOTCMS_THEME_ID for another instance.
STARTER_THEME = os.environ.get("DOTCMS_THEME_ID", "64e0e438ca52c6e73a269141c9e8a982")


def api(method, path, payload=None):
    if not TOKEN:
        sys.exit("error: DOTCMS_AUTH_TOKEN is not set")
    cmd = ["curl", "-s", "-X", method, f"{HOST}{path}",
           "-H", f"Authorization: Bearer {TOKEN}",
           "-H", "Content-Type: application/json"]
    if payload is not None:
        cmd += ["-d", json.dumps(payload)]
    out = subprocess.run(cmd, capture_output=True, text=True).stdout
    try:
        return json.loads(out)
    except ValueError:
        return {"_raw": out[:400]}


def fire(contentlet, action="PUBLISH"):
    """Fire a workflow action. This is how content is created AND published."""
    return api("PUT", f"/api/v1/workflow/actions/default/fire/{action}",
               {"contentlet": contentlet})


def _entity(resp, label):
    e = resp.get("entity") or {}
    if isinstance(e, dict) and e.get("identifier"):
        return e
    errs = resp.get("errors") or resp.get("error") or resp
    print(f"  ! {label} failed: {str(errs)[:200]}")
    return {}


# --------------------------------------------------------------------------
# Site
# --------------------------------------------------------------------------

def create_site(site_name, description=""):
    """Create AND publish a site. New sites are not live until published."""
    resp = api("POST", "/api/v1/site", {
        "siteName": site_name,
        "languageId": 1,
        "tagStorage": "SYSTEM_HOST",
        "description": description,
        "runDashboard": False,
        "forceExecution": True,
    })
    e = _entity(resp, f"create site {site_name}")
    if not e:
        return None
    site_id = e["identifier"]
    api("PUT", f"/api/v1/site/{site_id}/_publish")
    print(f"  site {site_name} -> {site_id} (published)")
    return site_id


def create_folders(site_name, paths):
    """Create page folders. MUST run before creating pages in them, or a page
    at /plans/index silently collapses to /index and collides with home."""
    resp = api("POST", f"/api/v1/folder/createfolders/{site_name}", paths)
    made = resp.get("entity")
    if isinstance(made, list):
        print(f"  folders: {[f.get('path') for f in made]}")
    return made


# --------------------------------------------------------------------------
# StoryBlock helpers — `body` is ProseMirror-shaped JSON, not HTML
# --------------------------------------------------------------------------

def h(level, text):
    return {"type": "heading", "attrs": {"level": level, "textAlign": "left"},
            "content": [{"type": "text", "text": text}]}


def p(text):
    return {"type": "paragraph", "attrs": {"textAlign": "left"},
            "content": [{"type": "text", "text": text}]}


def ul(items):
    return {"type": "bulletList", "content": [
        {"type": "listItem", "content": [
            {"type": "paragraph",
             "content": [{"type": "text", "text": i}]}]} for i in items]}


def doc(nodes):
    """StoryBlock bodies are passed as a JSON *string*."""
    return json.dumps({"type": "doc", "content": nodes})


# --------------------------------------------------------------------------
# Content
# --------------------------------------------------------------------------

def block(site_id, title, nodes):
    """A webPageContent block — one of only two types that can target an
    arbitrary site (field: contentHost). Use these for page sections."""
    e = _entity(fire({"contentType": "webPageContent", "contentHost": site_id,
                      "title": title, "body": doc(nodes), "languageId": 1}),
                f"block {title}")
    return e.get("identifier")


def blog(site_id, title, url_title, description, nodes,
         publish_date="2026-09-01 09:00:00"):
    """Blog uses `site`, not `contentHost`. url_title must be globally unique
    across the whole instance, so prefix it per site."""
    e = _entity(fire({"contentType": "Blog", "site": site_id,
                      "title": title, "urlTitle": url_title,
                      "description": description, "body": doc(nodes),
                      "publishDate": publish_date, "languageId": 1}),
                f"blog {title}")
    return e.get("identifier")


def upload_image(path):
    """Binary uploads go via the temp API, which REQUIRES an Origin header.
    Returns a temp id to pass as a binary field value."""
    out = subprocess.run(
        ["curl", "-s", "-X", "POST", f"{HOST}/api/v1/temp",
         "-H", f"Authorization: Bearer {TOKEN}",
         "-H", f"Origin: {HOST}",
         "-F", f"file=@{path}"], capture_output=True, text=True).stdout
    try:
        return json.loads(out)["tempFiles"][0]["id"]
    except Exception:
        print(f"  ! temp upload failed: {out[:200]}")
        return None


# --------------------------------------------------------------------------
# Templates and pages
# --------------------------------------------------------------------------

def template(site_id, title, rows):
    """Build a drawed template over SYSTEM_CONTAINER.

    rows: list of column-width lists on a 12-unit grid, e.g. [[12],[4,4,4]].
    A drawed template needs BOTH `layout` and a matching `body` of
    #parseContainer lines, or dotCMS rejects it.
    """
    uuid = 0
    body, layout_rows = [], []
    for widths in rows:
        cols, offset = [], 1
        for w in widths:
            uuid += 1
            cols.append({"styleClass": "", "leftOffset": offset, "width": w,
                         "containers": [{"identifier": "SYSTEM_CONTAINER",
                                         "uuid": str(uuid)}]})
            body.append(f'#parseContainer("SYSTEM_CONTAINER","{uuid}")')
            offset += w
        layout_rows.append({"styleClass": "", "columns": cols})

    resp = api("POST", "/api/v1/templates", {
        "title": title, "friendlyName": title, "siteId": site_id,
        "theme": STARTER_THEME, "drawed": True,
        "body": "\n".join(body), "drawedBody": "\n".join(body),
        "layout": {"body": {"rows": layout_rows},
                   "header": True, "footer": True, "sidebar": None},
    })
    e = _entity(resp, f"template {title}")
    return e.get("identifier"), uuid


def page(site_id, title, folder, template_id):
    """Create a page. `folder` is like "/" or "/plans" and must already exist."""
    e = _entity(fire({"contentType": "htmlpageasset", "title": title,
                      "url": "index", "hostFolder": f"{site_id}:{folder}",
                      "template": template_id, "friendlyName": title,
                      "cachettl": "0", "languageId": 1, "sortOrder": 0}),
                f"page {title}")
    return e.get("identifier")


def place(page_id, slots):
    """slots: [(uuid, [content_id, ...]), ...] — payload is a JSON ARRAY."""
    payload = [{"personaTag": "", "contentletsId": ids,
                "identifier": "SYSTEM_CONTAINER", "uuid": u}
               for u, ids in slots]
    resp = api("POST", f"/api/v1/page/{page_id}/content", payload)
    fire({"identifier": page_id, "contentType": "htmlpageasset"})
    # Saving page content through the API can leave the page locked by the
    # "system" user, which hides Draft (edit) mode in the Universal Visual
    # Editor for everyone else. Release the lock explicitly.
    api("PUT", f"/api/v1/content/_unlock/{page_id}")
    return resp


# --------------------------------------------------------------------------
# UVE + verification
# --------------------------------------------------------------------------

def configure_uve(site_id, url):
    """Without this a site falls back to the Velocity theme and the admin
    preview renders broken images. This is the fix, not copying theme files."""
    cfg = {"config": [{"pattern": ".*", "url": url,
                       "options": {"allowedDevURLs": [url]}}]}
    resp = api("POST", f"/api/v1/apps/dotema-config-v2/{site_id}",
               {"configuration": {"value": json.dumps(cfg, indent=2),
                                  "hidden": False}})
    print(f"  UVE -> {url}")
    return resp


def verify(site_id, uri="/index"):
    """THE check that matters: do layout refs resolve against the containers
    map? Contentlet counts can look right while every client is broken."""
    resp = api("GET", f"/api/v1/page/json{uri}"
                      f"?language_id=1&mode=LIVE&host_id={site_id}")
    e = resp.get("entity")
    if not e:
        print(f"  {uri}: NO PAGE")
        return False
    keys = set((e.get("containers") or {}).keys())
    rows = ((e.get("layout") or {}).get("body") or {}).get("rows", [])
    refs = [c["identifier"] for r in rows
            for col in r.get("columns", []) for c in col.get("containers", [])]
    bad = [r for r in refs if r not in keys]
    n = sum(len(v) for c in (e.get("containers") or {}).values()
            for v in (c.get("contentlets") or {}).values())
    status = "BROKEN" if bad else "OK"
    print(f"  {uri}: refs={len(refs)} unresolved={len(bad)} "
          f"contentlets={n} -> {status}")
    return not bad


# --------------------------------------------------------------------------

def scaffold(site_name, port):
    """Minimal end-to-end example: site, folders, home page, one section."""
    site_id = create_site(site_name, f"{site_name} demo site")
    if not site_id:
        return
    create_folders(site_name, ["/about"])

    tpl, _ = template(site_id, f"{site_name} Home", [[12], [12]])
    intro = block(site_id, "Home intro", [
        h(1, f"Welcome to {site_name}"),
        p("Replace this with real copy."),
        ul(["First point", "Second point", "Third point"]),
    ])
    home = page(site_id, "Home", "/", tpl)
    if home and intro:
        place(home, [("1", [intro])])

    configure_uve(site_id, f"http://localhost:{port}")
    verify(site_id, "/index")
    print(f"\nDone. Site id: {site_id}")
    print(f"Next: create the frontend and run it on port {port} "
          f"(see CREATING-NEW-SITES.md step 7).")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--site", required=True, help="e.g. example.com")
    ap.add_argument("--port", type=int, default=3003, help="frontend port")
    ap.add_argument("--create", action="store_true", help="build a scaffold site")
    ap.add_argument("--verify", metavar="SITE_ID", help="verify an existing site")
    a = ap.parse_args()

    if a.verify:
        verify(a.verify, "/index")
    elif a.create:
        scaffold(a.site, a.port)
    else:
        ap.print_help()
