#!/usr/bin/env python3
"""Build the Texas School for the Deaf demo on educationdemo.com (awesomedemo-dev).

Creates the TSD content types, a "TSD Sections" container (so the Universal
Visual Editor only offers TSD components on this site), templates, folders and
menu, the pages (home, about, admissions, academics and its five school pages,
outreach, news, calendar, contact) with their sections, news articles and
calendar events, and the site's media library (/images). Then it points UVE
at the deployed frontend on Vercel (the local :3008 server is a dev URL).

    export DOTCMS_AUTH_TOKEN=...          # an admin token on awesomedemo-dev
    python3 build-education.py

Defaults target awesomedemo-dev and educationdemo.com; override with
DOTCMS_HOST, EDUCATION_SITE, EDUCATION_FRONTEND and DOTCMS_THEME_ID.

Content types are created only if missing. Content and pages are NOT
de-duplicated, so the script refuses to run against a site that already has
a home page — delete the site's pages first to rebuild from scratch.

Copy, photos and the logo in education-assets/ come from tsd.texas.gov. The
six testing events and all news articles are real; the other calendar events
(breaks, conferences, retreats) have sample dates.
"""
import json
import os
import secrets
import sys
import time

# dotcms_site reads these at import time.
os.environ.setdefault("DOTCMS_HOST", "https://awesomedemo-dev.dotcms.dev")
# awesomedemo-dev's landing-page theme; headless templates still need one.
os.environ.setdefault("DOTCMS_THEME_ID", "ce00bd28-5f66-47f9-96ca-bbf0722a79aa")

import dotcms_site as ns  # noqa: E402

SITE = os.environ.get("EDUCATION_SITE", "educationdemo.com")
# The deployed frontend (Vercel). UVE loads pages from it; the local dev
# server stays available in the editor as a dev URL.
FRONTEND = os.environ.get("EDUCATION_FRONTEND", "https://dotcms-demo-sites-45sr.vercel.app")
DEV_FRONTENDS = ["http://localhost:3008", "http://educationdemo.localhost:3008"]
# Same identifier on every instance: it ships with dotCMS.
SYSTEM_WORKFLOW = "d61a59e1-a49c-46f2-a929-db2b4bfa88b2"
CONTAINER_TITLE = "TSD Sections"
# Set by ensure_site() and ensure_container().
SITE_ID = ""
CONTAINER_ID = ""

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "education-assets")

SCHOOLS = ["early-learning-center", "elementary", "middle-school", "high-school", "access"]
FOLDERS = ["/about", "/admissions", "/academics", "/outreach", "/news", "/calendar",
           "/contact"] + [f"/academics/{s}" for s in SCHOOLS]
# (folder, menu title) in menu order. Academics' school folders form its dropdown.
MENU = [("about", "About"), ("admissions", "Admissions"), ("academics", "Academics"),
        ("outreach", "Outreach Center"), ("news", "News"), ("calendar", "Calendar"),
        ("contact", "Contact TSD")]
SCHOOL_MENU = [("early-learning-center", "Early Learning Center"), ("elementary", "Elementary"),
               ("middle-school", "6–8 Secondary Program"), ("high-school", "9–12 Secondary Program"),
               ("access", "ACCESS")]

F = "com.dotcms.contenttype.model.field."

# Icons the frontend can draw (frontend-education/src/components/Icon.tsx).
ICONS = ["calendar", "users", "clipboard", "megaphone", "blocks", "book", "compass",
         "graduation", "briefcase", "map", "hands", "home", "heart", "star", "phone",
         "bus", "wallet", "clock", "shield", "lightbulb", "hammer", "palette", "monitor",
         "flask", "check", "sparkles", "tent", "sun", "car", "baby", "message"]
# Field hints are limited to 255 characters, so they list the icons in short.
ICON_HINT = "Icons: " + ", ".join(ICONS[:18]) + " …"

NEWS_CATEGORIES = [("Announcements", "announcements"), ("Lone Star Journal", "lone-star"),
                   ("The Roots", "the-roots"), ("Programs", "programs"),
                   ("Recognition", "recognition")]
# The TSD Event Categories tree (Content → Categories). Editors add or rename
# categories there; the frontend gives the known keys their colours
# (frontend-education/src/utils/categories.ts). Keys are global on the
# instance, hence the prefix.
EVENT_CATEGORY_PARENT = ("TSD Event Categories", "tsdEventCategories")
EVENT_CATEGORIES = [("Academic", "tsd-academic"), ("Testing", "tsd-testing"),
                    ("No School", "tsd-no-school"), ("Family", "tsd-family"),
                    ("Athletics", "tsd-athletics"), ("Student Life", "tsd-student-life"),
                    ("Community", "tsd-community"), ("Outreach", "tsd-outreach")]
EVENT_CATEGORY_ROOT = ""  # set by ensure_event_categories()


# --------------------------------------------------------------------------
# Content types — every one has a Site field so content lands on educationdemo.com
# --------------------------------------------------------------------------

def field(kind, name, variable, required=False, indexed=False, listed=False,
          values=None, hint=None, unique=False):
    f = {"clazz": F + kind, "name": name, "variable": variable,
         "required": required, "indexed": indexed or required or unique,
         "listed": listed, "unique": unique}
    if values:
        f["values"] = values
    if hint:
        f["hint"] = hint
    return f


def options(pairs):
    """Select/checkbox values: 'Label|value' lines."""
    return "\r\n".join(f"{label}|{value}" for label, value in pairs)


def site_field():
    return field("ImmutableHostFolderField", "Site", "site", required=True)


def internal_name():
    return field("ImmutableTextField", "Internal name", "title", required=True, listed=True)


def cta_fields(label="Button", prefix="cta"):
    return [field("ImmutableTextField", f"{label} text", f"{prefix}Text"),
            field("ImmutableTextField", f"{label} link", f"{prefix}Link",
                  hint="A page on this site (/admissions) or a full URL")]


def image_fields(required=False):
    return [field("ImmutableImageField", "Image", "image", required=required),
            field("ImmutableTextField", "Image description (alt text)", "imageAlt",
                  hint="Describe the image for screen reader users. Leave empty for decorative images.")]


def theme_field(pairs, name="Background"):
    return field("ImmutableSelectField", name, "theme", values=options(pairs))


def create_type(variable, name, description, fields, icon="article",
                url_map=None, detail_page=None):
    # A missing type returns a bare 404 body, not a JSON object.
    resp = ns.api("GET", f"/api/v1/contenttype/id/{variable}")
    existing = resp.get("entity") if isinstance(resp, dict) else None
    if isinstance(existing, dict) and existing.get("id"):
        print(f"  type {variable} exists")
        return existing["id"]
    body = {
        "clazz": "com.dotcms.contenttype.model.type.ImmutableSimpleContentType",
        "name": name, "variable": variable, "description": description,
        "host": SITE_ID, "icon": icon, "workflow": [SYSTEM_WORKFLOW],
        "fields": fields,
    }
    if url_map:
        body["urlMapPattern"] = url_map
        body["detailPage"] = detail_page
    resp = ns.api("POST", "/api/v1/contenttype", [body])
    ent = resp.get("entity")
    if isinstance(ent, list) and ent:
        print(f"  type {variable} created")
        return ent[0]["id"]
    sys.exit(f"  ! type {variable} failed: {str(resp)[:300]}")


def ensure_event_categories():
    """The TSD Event Categories tree. Reused if it already exists."""
    global EVENT_CATEGORY_ROOT
    name, key = EVENT_CATEGORY_PARENT
    found = ns.api("GET", f"/api/v1/categories?filter={key}&per_page=50").get("entity") or []
    root = next((c for c in found if c.get("key") == key), None)
    if not root:
        root = ns.api("POST", "/api/v1/categories", {
            "categoryName": name, "key": key, "categoryVelocityVarName": key, "sortOrder": 0,
            "active": True, "description": f"Calendar categories for {SITE}"})["entity"]
    EVENT_CATEGORY_ROOT = root["inode"]
    existing = {c["key"] for c in ns.api(
        "GET", f"/api/v1/categories/children?inode={EVENT_CATEGORY_ROOT}&per_page=100").get("entity") or []}
    for order, (child, child_key) in enumerate(EVENT_CATEGORIES, start=1):
        if child_key not in existing:
            ns.api("POST", "/api/v1/categories", {
                "categoryName": child, "key": child_key,
                "categoryVelocityVarName": child_key.replace("-", ""), "sortOrder": order,
                "active": True, "parent": EVENT_CATEGORY_ROOT})
    print(f"  categories {name}: {len(EVENT_CATEGORIES)}")


def category_field(name, variable, hint):
    return {**field("ImmutableCategoryField", name, variable, indexed=True, hint=hint),
            "values": EVENT_CATEGORY_ROOT}


def create_section_types():
    """Page sections: what editors drag onto pages in the Universal Visual Editor."""
    create_type("TsdHero", "TSD Hero",
                "The big photo banner at the top of the home page", [
        site_field(),
        field("ImmutableTextField", "Headline", "title", required=True, listed=True),
        field("ImmutableTextField", "Eyebrow", "eyebrow", hint="Small line above the headline"),
        field("ImmutableTextAreaField", "Text", "text"),
        *cta_fields(),
        *cta_fields("Second button", "cta2"),
        *image_fields(required=True),
    ], icon="panorama")

    create_type("TsdPageBanner", "TSD Page Banner",
                "Title banner for inner pages, with an optional photo", [
        site_field(),
        field("ImmutableTextField", "Title", "title", required=True, listed=True),
        field("ImmutableTextField", "Eyebrow", "eyebrow", hint="Small line above the title"),
        field("ImmutableTextAreaField", "Subtitle", "subtitle"),
        *cta_fields(),
        *image_fields(),
    ], icon="web_asset")

    create_type("TsdQuickLinks", "TSD Quick Links",
                "A row of large icon links, like Calendar · Staff Directory · Enrollment · News", [
        site_field(),
        internal_name(),
        field("ImmutableTextAreaField", "Links", "items", required=True,
              hint="One per line: Label | link | icon. " + ICON_HINT),
    ], icon="link")

    create_type("TsdFeatureGrid", "TSD Feature Grid",
                "A heading plus a grid of items, as cards, a checklist, numbered steps or stats", [
        site_field(),
        internal_name(),
        field("ImmutableTextField", "Eyebrow", "eyebrow"),
        field("ImmutableTextField", "Heading", "heading"),
        field("ImmutableTextAreaField", "Intro", "intro"),
        field("ImmutableSelectField", "Layout", "layout", required=True,
              values=options([("Cards", "cards"), ("Checklist", "checklist"),
                              ("Numbered steps", "steps"), ("Stats", "stats")])),
        theme_field([("White", "white"), ("Light blue", "mist"), ("Navy", "navy")]),
        field("ImmutableTextAreaField", "Items", "items", required=True,
              hint="One per line: Title | Text | optional link | optional icon. "
                   "Stats: Value | Label. " + ICON_HINT),
        *cta_fields(),
    ], icon="grid_view")

    create_type("TsdFeatureSplit", "TSD Feature Split",
                "Photo on one side; heading, text and a button on the other", [
        site_field(),
        field("ImmutableTextField", "Heading", "title", required=True, listed=True),
        field("ImmutableTextField", "Eyebrow", "eyebrow"),
        field("ImmutableTextAreaField", "Text", "text",
              hint="Leave a blank line between paragraphs"),
        *cta_fields(),
        *image_fields(),
        field("ImmutableSelectField", "Photo side", "imagePosition",
              values=options([("Left", "left"), ("Right", "right")])),
        theme_field([("White", "white"), ("Light blue", "mist"), ("Navy", "navy")]),
    ], icon="vertical_split")

    create_type("TsdCallout", "TSD Callout",
                "A full-width statement band: mission, a deadline, a key message", [
        site_field(),
        internal_name(),
        field("ImmutableTextField", "Eyebrow", "eyebrow", hint="e.g. Mission Statement"),
        field("ImmutableTextAreaField", "Statement", "text", required=True),
        *cta_fields(),
        theme_field([("Navy", "navy"), ("Steel blue", "steel"), ("Light blue", "mist")]),
    ], icon="format_quote")

    create_type("TsdPromoBanner", "TSD Promo Banner",
                "One wide promotional graphic (anniversary, back to school, hiring). "
                "Shown by a TSD Promo Carousel.", [
        site_field(),
        field("ImmutableTextField", "Name", "title", required=True, listed=True),
        field("ImmutableImageField", "Graphic", "image", required=True,
              hint="Wide, about 1850 × 650"),
        field("ImmutableTextField", "Image description (alt text)", "imageAlt", required=True,
              hint="Required: promotional graphics carry text that screen readers must hear"),
        field("ImmutableTextField", "Link", "link", hint="Optional"),
    ], icon="photo")

    create_type("TsdPromoCarousel", "TSD Promo Carousel",
                "Rotating promotional graphics. Pick and order its banners.", [
        site_field(),
        internal_name(),
        {**field("ImmutableRelationshipField", "Banners", "banners",
                 hint="The promo banners to rotate through, in order"),
         "relationType": "TsdPromoBanner", "values": "1", "indexed": True},
        field("ImmutableSelectField", "Seconds per banner", "interval",
              values=options([("6", "6"), ("8", "8"), ("12", "12"), ("Don't rotate", "0")])),
    ], icon="slideshow")

    create_type("TsdNewsList", "TSD News List",
                "The latest published news articles", [
        site_field(),
        internal_name(),
        field("ImmutableTextField", "Heading", "heading"),
        field("ImmutableSelectField", "How many", "count",
              values=options([("3", "3"), ("6", "6"), ("9", "9"), ("All", "all")])),
        field("ImmutableSelectField", "Category", "category",
              values=options([("All categories", "all")] + NEWS_CATEGORIES)),
        field("ImmutableSelectField", "Layout", "layout",
              values=options([("Cards with photos", "cards"), ("Compact list", "list")])),
        field("ImmutableCheckboxField", "Options", "showAllLink",
              values=options([("Show an 'All news' link", "true")])),
    ], icon="newspaper")

    create_type("TsdEventList", "TSD Event List",
                "Upcoming calendar events, soonest first", [
        site_field(),
        internal_name(),
        field("ImmutableTextField", "Heading", "heading"),
        field("ImmutableSelectField", "How many", "count",
              values=options([("5", "5"), ("10", "10"), ("All upcoming", "all")])),
        field("ImmutableSelectField", "Layout", "layout",
              values=options([("Compact (date tiles)", "compact"), ("Full, grouped by month", "full")])),
        field("ImmutableCheckboxField", "Options", "showAllLink",
              values=options([("Show an 'All events' link", "true"),
                              ("Show category filter buttons", "filter"),
                              ("Show 'Add to calendar' and subscribe links", "ics")])),
        category_field("Only these categories", "eventCategories",
                       "Leave empty to show every category"),
    ], icon="event")

    create_type("TsdFaq", "TSD FAQ",
                "Expandable questions and answers", [
        site_field(),
        internal_name(),
        field("ImmutableTextField", "Heading", "heading"),
        field("ImmutableTextAreaField", "Intro", "intro"),
        field("ImmutableTextAreaField", "Questions", "items", required=True,
              hint="One per line: Question | Answer"),
    ], icon="help")

    create_type("TsdContactList", "TSD Contact List",
                "Office contact cards with voice and videophone numbers", [
        site_field(),
        internal_name(),
        field("ImmutableTextField", "Heading", "heading"),
        field("ImmutableTextAreaField", "Intro", "intro"),
        field("ImmutableTextAreaField", "Offices", "items", required=True,
              hint="One per line: Office | Description | Voice | Videophone (VP) | Fax"),
    ], icon="contact_phone")


def create_record_types(news_detail_page):
    """Structured content that the list sections show."""
    create_type("TsdNews", "TSD News",
                "A news article or announcement. Shown at /news/{url title}.", [
        site_field(),
        field("ImmutableTextField", "Title", "title", required=True, listed=True),
        field("ImmutableTextField", "URL title", "urlTitle", required=True, unique=True,
              hint="Unique across the instance, e.g. tsd-winter-weather-make-up-day"),
        field("ImmutableSelectField", "Category", "category", required=True, listed=True,
              values=options(NEWS_CATEGORIES)),
        field("ImmutableDateTimeField", "Publish date", "publishDate", required=True, listed=True),
        field("ImmutableTextAreaField", "Teaser", "teaser", required=True,
              hint="One or two sentences for lists and search results"),
        *image_fields(),
        field("ImmutableStoryBlockField", "Body", "body"),
    ], icon="newspaper", url_map="/news/{urlTitle}", detail_page=news_detail_page)

    create_type("TsdEvent", "TSD Event",
                "A calendar event, shown by TSD Event Lists", [
        site_field(),
        field("ImmutableTextField", "Title", "title", required=True, listed=True),
        field("ImmutableDateTimeField", "Starts", "startDate", required=True, listed=True),
        field("ImmutableDateTimeField", "Ends", "endDate", hint="Optional, for multi-day events"),
        field("ImmutableTextField", "Time", "timeText", hint="As shown, e.g. 8 AM – 3 PM. Empty = all day"),
        field("ImmutableTextField", "Location", "location"),
        {**category_field("Categories", "eventCategories",
                          "Pick one or more. Manage the list under Content > Categories > "
                          "TSD Event Categories."), "listed": True},
        field("ImmutableTextAreaField", "Description", "description"),
    ], icon="event")


SECTION_TYPES = ["TsdHero", "TsdPageBanner", "TsdQuickLinks", "TsdFeatureGrid",
                 "TsdFeatureSplit", "TsdCallout", "TsdPromoCarousel", "TsdNewsList",
                 "TsdEventList", "TsdFaq", "TsdContactList", "webPageContent"]


def ensure_container():
    """A container that accepts only TSD sections (plus rich text), so the
    editor's palette on educationdemo.com doesn't list every type on the
    instance as the System Container would."""
    global CONTAINER_ID
    found = ns.api("GET", f"/api/v1/containers?filter=TSD%20Sections&host={SITE_ID}&per_page=20")
    for c in found.get("entity") or []:
        if c.get("title") == CONTAINER_TITLE:
            CONTAINER_ID = c["identifier"]
            return
    structures = []
    for variable in SECTION_TYPES:
        t = ns.api("GET", f"/api/v1/contenttype/id/{variable}")["entity"]
        # Headless: the frontend renders the content, so no Velocity code is needed.
        structures.append({"structureId": t["id"], "code": "$!{dotContentMap.title}"})
    resp = ns.api("POST", "/api/v1/containers", {
        "title": CONTAINER_TITLE, "friendlyName": CONTAINER_TITLE, "hostId": SITE_ID,
        "maxContentlets": 25, "notes": "TSD page sections only. Rendered by frontend-education.",
        "code": "", "preLoop": "", "postLoop": "", "containerStructures": structures})
    c = resp.get("entity")
    if not c:
        sys.exit(f"  ! container: {str(resp)[:300]}")
    ns.api("PUT", "/api/v1/containers/_publish", [c["identifier"]])
    CONTAINER_ID = c["identifier"]
    print(f"  container {CONTAINER_TITLE} -> {CONTAINER_ID}")


def configure_uve():
    """Point the Universal Visual Editor at the deployed frontend, with the
    local dev server selectable as a dev URL."""
    cfg = {"config": [{"pattern": ".*", "url": FRONTEND,
                       "options": {"allowedDevURLs": DEV_FRONTENDS}}]}
    ns.api("POST", f"/api/v1/apps/dotema-config-v2/{SITE_ID}",
           {"configuration": {"value": json.dumps(cfg, indent=2), "hidden": False}})
    print(f"  UVE -> {FRONTEND} (dev: {', '.join(DEV_FRONTENDS)})")


def create_settings_type():
    """Site-wide settings, one item per site: integrations an administrator
    turns on or changes without a code deploy."""
    create_type("TsdSiteSettings", "TSD Site Settings",
                "Site-wide settings for educationdemo.com: analytics and other integrations. "
                "Keep one item per site.", [
        site_field(),
        internal_name(),
        field("ImmutableTextField", "Google Analytics measurement ID", "gaMeasurementId",
              hint="GA4 ID such as G-ABC123XYZ. Leave empty to turn Google Analytics off."),
    ], icon="settings")


def configure_analytics():
    """Turn on dotCMS Content Analytics for the site (page views, content
    impressions and clicks). Returns the site key the frontend sends with
    each event (NEXT_PUBLIC_DOTCMS_ANALYTICS_SITE_KEY): it is public in the
    browser, like a Google Analytics ID.

    Events reach the analytics service only once the app has exchanged the
    event manager's admin credentials for a token (adminUser/adminPassword
    in the app's settings, done once by an administrator in dotCMS)."""
    key = f"DOT.{SITE_ID}.{secrets.token_hex(12)}"
    ns.api("POST", f"/api/v1/apps/dotContentAnalytics-config/{SITE_ID}", {
        "persistenceMode": {"value": "readwrite"}, "siteAuth": {"value": key},
        "autoPageView": {"value": "true"}, "contentImpression": {"value": "true"},
        "contentClick": {"value": "true"}})
    # The analytics service finds the site from the browser's Origin header.
    # Browsers send *.localhost to this machine, so this alias lets the local
    # frontend (http://educationdemo.localhost:3008) record events.
    # The deployed frontend's domain is an alias for the same reason.
    aliases = ["educationdemo.localhost", FRONTEND.split("://", 1)[-1].rstrip("/")]
    ns.api("PUT", f"/api/v1/site?id={SITE_ID}", {
        "siteName": SITE, "aliases": "\n".join(aliases), "forceExecution": True})
    return key


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

def create(content_type, **fields):
    e = ns._entity(ns.fire({"contentType": content_type, "site": SITE_ID,
                            "languageId": 1, **fields}),
                   f"{content_type} {fields.get('title')}")
    return e.get("identifier")


def rich_text(title, nodes):
    """A webPageContent block (body copy)."""
    e = ns._entity(ns.fire({"contentType": "webPageContent", "contentHost": SITE_ID,
                            "title": title, "body": ns.doc(nodes), "languageId": 1}),
                   f"rich text {title}")
    return e.get("identifier")


# The site's media library: every image is uploaded once, as a file in a
# topic folder under /images, and content references it (Image fields).
MEDIA = {
    "brand": {"tsd-seal.png": "Texas School for the Deaf seal",
              "rangers-logo.png": "TSD Rangers logo"},
    "campus": {"hero-students.jpg": "Five TSD students outdoors",
               "campus.jpg": "TSD campus with CEASD accreditation stamp",
               "graduation.jpg": "TSD graduating class",
               "staff-kickoff.jpg": "TSD staff at the start of the school year",
               "elementary.jpg": "Elementary program graphic"},
    "outreach": {"outreach-team.jpg": "Statewide Outreach Center team",
                 "outreach-banner.jpg": "Statewide Outreach Center banner"},
    "promos": {"promo-170th.jpg": "170th anniversary — Legacy in Action",
               "promo-back-to-school.jpg": "Welcome back to school",
               "promo-careers.jpg": "TSD is hiring"},
    "news": {"news-lonestar-summer-2026.jpg": "Lone Star Journal Summer 2026 cover",
             "news-lonestar-winter-2026.jpg": "Lone Star Journal Winter/Spring 2026 cover",
             "news-roots-cochran.jpg": "The Roots — Lisa Cochran",
             "news-roots-clemons.jpg": "The Roots — Valorie Clemons",
             "news-winter-weather.jpg": "Weather make-up information",
             "news-welding.jpg": "Richard Layton, welding instructor",
             "news-summer-camps.jpg": "Summer Camps and Programs 2026",
             "news-deaf-awareness.jpg": "Deaf Awareness Week proclamation"},
}
_media = {}


def image(name):
    """The identifier of an image in the media library, uploading it the
    first time it is used."""
    if name not in _media:
        folder, title = next((f, files[name]) for f, files in MEDIA.items() if name in files)
        ns.create_folders(SITE, [f"/images/{folder}"])
        e = ns._entity(ns.fire({"contentType": "FileAsset", "hostFolder": f"{SITE_ID}:/images/{folder}",
                                "title": title, "fileName": name, "languageId": 1,
                                "fileAsset": ns.upload_image(os.path.join(ASSETS, name))}),
                       f"image {name}")
        _media[name] = e.get("identifier")
    return _media[name]


def lines(items):
    return "\n".join(items)


def template(title, rows):
    """A drawed template on the TSD Sections container. rows: [(widths,
    style_class), ...] on a 12-unit grid; the class reaches the frontend."""
    uuid = 0
    body, layout_rows = [], []
    for widths, style in rows:
        cols, offset = [], 1
        for w in widths:
            uuid += 1
            cols.append({"styleClass": "", "leftOffset": offset, "width": w,
                         "containers": [{"identifier": CONTAINER_ID, "uuid": str(uuid)}]})
            body.append(f'#parseContainer("{CONTAINER_ID}","{uuid}")')
            offset += w
        layout_rows.append({"styleClass": style, "columns": cols})
    resp = ns.api("POST", "/api/v1/templates", {
        "title": title, "friendlyName": title, "siteId": SITE_ID,
        "theme": ns.STARTER_THEME, "drawed": True,
        "body": "\n".join(body), "drawedBody": "\n".join(body),
        "layout": {"body": {"rows": layout_rows},
                   "header": True, "footer": True, "sidebar": None},
    })
    tid = ns._entity(resp, f"template {title}").get("identifier")
    ns.api("PUT", "/api/v1/templates/_publish", [tid])
    return tid


def page(title, folder, tpl, url="index", description=""):
    e = ns._entity(ns.fire({"contentType": "htmlpageasset", "title": title,
                            "url": url, "hostFolder": f"{SITE_ID}:{folder}",
                            "template": tpl, "friendlyName": title,
                            "seoDescription": description,
                            "cachettl": "0", "languageId": 1, "sortOrder": 0}),
                   f"page {title}")
    return e.get("identifier")


def fill(page_id, slots):
    """slots: {uuid: [content ids]}; None ids are skipped."""
    payload = [{"personaTag": "", "contentletsId": [c for c in ids if c],
                "identifier": CONTAINER_ID, "uuid": str(u)} for u, ids in slots.items()]
    resp = ns.api("POST", f"/api/v1/page/{page_id}/content", payload)
    if isinstance(resp, dict) and resp.get("errors"):
        print(f"  ! placing content: {str(resp)[:300]}")
    ns.fire({"identifier": page_id, "contentType": "htmlpageasset"})
    # Saving page content through the API can leave the page locked by the
    # "system" user, which hides Draft (edit) mode in the editor. Unlock it.
    ns.api("PUT", f"/api/v1/content/_unlock/{page_id}")


def banner(title, subtitle="", eyebrow="", **extra):
    return create("TsdPageBanner", title=title, subtitle=subtitle, eyebrow=eyebrow, **extra)


def contacts(title, heading, offices, intro=""):
    return create("TsdContactList", title=title, heading=heading, intro=intro, items=lines(offices))


# --------------------------------------------------------------------------
# Content — copy from tsd.texas.gov
# --------------------------------------------------------------------------

MISSION = ("Texas School for the Deaf ensures students learn, grow and belong in a "
           "language-rich environment that maximizes each individual’s potential to become "
           "successful life-long learners while supporting students, families, and "
           "professionals through statewide outreach services.")
VISION = ("Texas School for the Deaf aspires to be a premier leader in bilingual (ASL/English) "
          "education that challenges each student to reach their full potential.")

MAIN_OFFICE = "Texas School for the Deaf | 1102 S. Congress Ave., Austin, TX 78704 | (512) 462-5353 | (512) 580-6994 |"
ADMISSIONS_OFFICE = ("Admissions Office | Applications, campus tours for prospective families and "
                     "registration | (512) 462-5412 | (512) 782-4262 | (512) 462-5615")
RECORDS_OFFICE = "School Records & Transcripts | Records and transcript requests | | (512) 670-8577 |"
OUTREACH_OFFICE = ("Statewide Outreach Center | Programs, training and resources for families and "
                   "professionals across Texas | (512) 462-5329 | (512) 982-1646 | (512) 462-5661")
STUDENT_LIFE_OFFICE = ("Student Life Division | Campus Living, dorms and after-school activities "
                       "| (512) 462-5601 | (737) 334-3464 |")

SCHOOL_CARDS = [
    "Early Learning Center | Preschool and pre-kindergarten: a full day of play-based learning "
    "in a bilingual ASL-English environment. | /academics/early-learning-center | blocks",
    "Elementary | Kindergarten through 5th grade, celebrating both of our languages, ASL and "
    "English. | /academics/elementary | book",
    "6–8 Secondary Program | Grades 6 through 8: growing confidence, independence and the "
    "skills to work with others. | /academics/middle-school | compass",
    "9–12 Secondary Program | High school and Career & Technical Education, with four academies "
    "from 11th grade. | /academics/high-school | graduation",
    "ACCESS | For Deaf students aged 18–22: real-world skills for employment and independent "
    "living. | /academics/access | briefcase",
]

PROMOS = [
    dict(title="170th anniversary", image="promo-170th.jpg", link="/about",
         imageAlt="Legacy in Action: Texas School for the Deaf celebrates its 170th anniversary, "
                  "2026–2027. #WeAreTSD"),
    dict(title="Welcome back to school", image="promo-back-to-school.jpg", link="/calendar",
         imageAlt="Welcome back to school! The TSD Ranger mascot waves hello."),
    dict(title="TSD is hiring", image="promo-careers.jpg",
         link="https://www.tsd.texas.gov/apps/pages/index.jsp?uREC_ID=170377&type=d&pREC_ID=860684",
         imageAlt="Texas School for the Deaf is hiring. Join our team. TSD Human Resources."),
]

NEWS = [
    dict(title="Lone Star Journal Summer 2026; Vol. 146. No.1", slug="lone-star-summer-2026",
         category="lone-star", date="2026-09-10 09:00:00", image="news-lonestar-summer-2026.jpg",
         imageAlt="Two TSD graduates smiling at the camera on the cover of the Lone Star Journal",
         teaser="The Lone Star Journal of the Texas School for the Deaf. In this issue: Message from "
                "the Superintendent, Meet the Security Officers, TSD VEX V5 Robotics Journey, 2026 "
                "Graduation, ACCESS Program Expansion, TSD Athletes in Action and so much more.",
         body=[ns.p("The Summer 2026 issue of the Lone Star Journal, the journal of the Texas "
                    "School for the Deaf since 1877, is here."),
               ns.h(2, "In this issue"),
               ns.ul(["Message from the Superintendent", "Meet the Security Officers",
                      "TSD VEX V5 Robotics Journey", "2026 Graduation", "ACCESS Program Expansion",
                      "TSD Athletes in Action"])]),
    dict(title="The Roots - Lisa Cochran", slug="the-roots-lisa-cochran", category="the-roots",
         date="2026-01-12 09:00:00", image="news-roots-cochran.jpg",
         imageAlt="The front cover of The Roots, with Lisa Cochran leaning against a wall",
         teaser="Learn more about Lisa Cochran’s 30-year journey at TSD and her role bringing ASL "
                "storytelling to Deaf children across Texas—sharing stories, building connections, "
                "and supporting students along the way.",
         body=[ns.p("The Roots celebrates the people who have shaped TSD over the years. In this "
                    "edition, Lisa Cochran looks back on 30 years on campus, from her first role "
                    "as a dorm supervisor to bringing ASL storytelling to Deaf children across "
                    "Texas.")]),
    dict(title="Lone Star: Winter/Spring 2026", slug="lone-star-winter-spring-2026",
         category="lone-star", date="2026-04-03 09:00:00", image="news-lonestar-winter-2026.jpg",
         imageAlt="Lone Star Journal Winter/Spring 2026 cover: students in hard hats, "
                  "“Hard hats, bright futures!”",
         teaser="The Lone Star, Journal of the Texas School for the Deaf. In this issue: New "
                "Governing Board Members, Clerc Classic Champions, TSD Foundation Gala 2026, "
                "Building a Playground, Student Stories, Electric Vehicles and so much more.",
         body=[ns.h(2, "In this issue"),
               ns.ul(["New Governing Board Members", "Clerc Classic Champions",
                      "TSD Foundation Gala 2026", "Building a Playground", "Student Stories",
                      "Electric Vehicles"])]),
    dict(title="The Roots - Valorie Clemons", slug="the-roots-valorie-clemons", category="the-roots",
         date="2026-03-25 09:00:00", image="news-roots-clemons.jpg",
         imageAlt="Valorie Clemons smiling in a black dress against a blue background",
         teaser="Discover Valorie Clemons’ 40+ years at TSD, where her dedication, care, and strong "
                "work ethic helped shape the cafeteria into more than just a place to eat.",
         body=[ns.p("Discover Valorie Clemons’ 40+ years at TSD, where her dedication, care, and "
                    "strong work ethic helped shape the cafeteria into more than just a place to "
                    "eat. Through decades of service, she supported students, built lasting "
                    "relationships, and became a familiar and trusted presence on campus.")]),
    dict(title="Winter weather make up date!", slug="winter-weather-make-up-date",
         category="announcements", date="2026-02-02 09:00:00", image="news-winter-weather.jpg",
         imageAlt="Weather make-up information",
         teaser="School closed January 27–28 for extreme cold and icing. March 23 will be the "
                "inclement weather make-up day, with a regular residential return on Sunday, March 22.",
         body=[ns.p("Dear Families/Caregivers, Students, and TSD Staff:"),
               ns.p("We just started our second semester of this academic year and as January "
                    "rolled in, so did wintery weather. While we are grateful it didn’t leave us "
                    "with much damage, we had to close school for two days (January 27 and 28) "
                    "because of extreme cold and icing."),
               ns.p("This year, we have enough minutes to cover one full day of school should we "
                    "cancel; however, we will have to make up the second day. Our inclement "
                    "weather days on our 2025-2026 school calendar are on Friday, February 13, "
                    "Monday, March 23, and Monday, April 6. We have identified March 23rd as our "
                    "inclement weather make up day for January 28th."),
               ns.p("On Sunday, March 22nd, we will have a regular return to TSD schedule for our "
                    "residential students and school will be in session starting at 8:00am on "
                    "Monday, March 23rd."),
               ns.p("If you should have any questions, please contact your child’s Residential "
                    "Supervisor or Principal.")]),
    dict(title="Leading TSD into the National Spotlight", slug="leading-tsd-national-spotlight",
         category="recognition", date="2026-01-14 09:00:00", image="news-welding.jpg",
         imageAlt="Welding instructor Richard Layton sitting with arms crossed in the TSD welding shop",
         teaser="Richard Layton’s impact on welding education is featured in the latest issue of "
                "Modern Steel Construction.",
         body=[ns.p("Richard Layton’s impact on welding education at TSD is featured in the latest "
                    "issue of Modern Steel Construction. Welding is part of the Trades academy in "
                    "our 9–12 Secondary Program, where students gain transferable skills and "
                    "industry-based experience.")]),
    dict(title="Check out our Summer Camps and Programs in English and Spanish!",
         slug="summer-camps-and-programs", category="programs", date="2025-10-16 09:00:00",
         image="news-summer-camps.jpg", imageAlt="Summer Camps and Programs 2026 logo with a "
                                                  "galloping horse, pineapples and watermelon",
         teaser="Summer Camps and Programs are designed to foster learning, social skills "
                "development, and enjoyment for families, children, teens and young adults as well "
                "as professional development opportunities.",
         body=[ns.p("Summer Camps and Programs are designed to foster learning, social skills "
                    "development, and enjoyment for families, children, teens and young adults as "
                    "well as professional development opportunities."),
               ns.p("Information is available in English and Spanish. The programs are run by "
                    "TSD’s Statewide Outreach Center.")]),
    dict(title="Texas Governor Abbott Proclaimed September 22 through 27 to be Deaf Awareness Week",
         slug="deaf-awareness-week-2025", category="recognition", date="2025-09-22 09:00:00",
         image="news-deaf-awareness.jpg", imageAlt="The Governor’s proclamation of Deaf Awareness Week",
         teaser="Governor Greg Abbott proclaimed September 22–27, 2025 as Deaf Awareness Week in "
                "Texas, recognizing the contributions of deaf and hard of hearing citizens.",
         body=[ns.p("Governor Greg Abbott proclaimed September 22–27, 2025 as Deaf Awareness Week "
                    "in Texas, recognizing the contributions of deaf and hard of hearing citizens "
                    "and encouraging all Texans to celebrate and support them.")]),
    dict(title="TSD Press Release: Celebrity Guest to Keynote TSD's 2025 Commencement",
         slug="2025-commencement", category="announcements", date="2025-05-29 09:00:00",
         image="graduation.jpg", imageAlt="The TSD Class of 2025 in caps and gowns on the steps",
         teaser="TSD celebrates the Class of 2025 on May 29 with 31 graduates. Keynote speaker Nyle "
                "DiMarco, a former TSD student, will receive the Claire Bugen Legacy Award.",
         body=[ns.p("TSD celebrates the Class of 2025 on May 29 with 31 graduates. Keynote speaker "
                    "Nyle DiMarco, a former TSD student, will receive the Claire Bugen Legacy "
                    "Award."),
               ns.p("Graduates earned scholarships, national honors, and college acceptances, "
                    "highlighting academic and extracurricular achievements.")]),
]

# The six testing dates are on tsd.texas.gov; the rest have sample dates.
# An event can be in several categories.
EVENTS = [
    dict(title="ACT Test - TSD Campus", startDate="2026-10-21 08:00:00", timeText="8 AM – 3 PM",
         location="High School", eventCategories=["tsd-testing", "tsd-academic"]),
    dict(title="Parent-Teacher Conferences", startDate="2026-10-30 08:00:00",
         timeText="8 AM – 4 PM", location="All school buildings", eventCategories=["tsd-family", "tsd-academic"],
         description="Meet your child’s teachers. Interpreters are available on request."),
    dict(title="Family Weekend Retreat", startDate="2026-11-06 16:00:00",
         endDate="2026-11-08 12:00:00", location="TSD Campus", eventCategories=["tsd-family", "tsd-outreach"],
         description="A weekend for families of deaf and hard of hearing children, run by the "
                     "Statewide Outreach Center."),
    dict(title="Thanksgiving Break — No School", startDate="2026-11-23 00:00:00",
         endDate="2026-11-27 23:59:00", location="", eventCategories=["tsd-no-school"]),
    dict(title="English 1 End of Course", startDate="2026-12-01 08:00:00", location="High School",
         eventCategories=["tsd-testing"]),
    dict(title="English 2 End of Course", startDate="2026-12-03 08:00:00", location="High School",
         eventCategories=["tsd-testing"]),
    dict(title="Biology End of Course", startDate="2026-12-08 08:00:00", location="High School",
         eventCategories=["tsd-testing"]),
    dict(title="Algebra 1 End of Course", startDate="2026-12-09 08:00:00", location="High School",
         eventCategories=["tsd-testing"]),
    dict(title="US History End of Course", startDate="2026-12-10 08:00:00", location="High School",
         eventCategories=["tsd-testing"]),
    dict(title="Winter Performing Arts Showcase", startDate="2026-12-15 18:00:00",
         timeText="6 PM", location="Auditorium", eventCategories=["tsd-community", "tsd-student-life"],
         description="Students from the Performing Arts program present their winter showcase."),
    dict(title="Winter Break — No School", startDate="2026-12-21 00:00:00",
         endDate="2027-01-01 23:59:00", location="", eventCategories=["tsd-no-school"]),
    dict(title="Classes Resume", startDate="2027-01-05 08:00:00", timeText="8 AM",
         location="TSD Campus", eventCategories=["tsd-academic"],
         description="Residential students return on Sunday, January 4."),
    dict(title="Ranger Volleyball — Home Game", startDate="2026-10-15 18:00:00", timeText="6 PM",
         location="Rives Gym", eventCategories=["tsd-athletics"],
         description="Cheer on the Rangers at home."),
    dict(title="Fall Festival in the Dorms", startDate="2026-10-29 18:30:00",
         timeText="6:30 – 8:30 PM", location="Elementary & Middle School Dorms",
         eventCategories=["tsd-student-life"],
         description="Games, crafts and treats for residential students, hosted by Student Life."),
    dict(title="Communication Skills Workshop (Online)", startDate="2026-11-14 10:00:00",
         timeText="10 AM – 12 PM", location="Online", eventCategories=["tsd-outreach", "tsd-family"],
         description="ASL learning for families and professionals, from the Statewide Outreach Center."),
    dict(title="Ranger Basketball Home Opener", startDate="2026-11-20 18:00:00", timeText="6 PM",
         location="Rives Gym", eventCategories=["tsd-athletics", "tsd-community"],
         description="The Rangers open the basketball season at home."),
]


def create_news():
    for n in NEWS:
        create("TsdNews", title=n["title"], urlTitle=f"tsd-{n['slug']}", category=n["category"],
               publishDate=n["date"], teaser=n["teaser"], image=image(n["image"]),
               imageAlt=n["imageAlt"], body=ns.doc(n["body"]))
    print(f"  {len(NEWS)} news articles")


def create_events():
    for e in EVENTS:
        create("TsdEvent", **e)
    print(f"  {len(EVENTS)} events")


SCHOOL_PAGES = {
    "early-learning-center": dict(
        title="Early Learning Center", eyebrow="Academics", subtitle="Preschool – Prekindergarten",
        body=[ns.p("The Early Learning Center (ELC) is a full-day program designed for preschool "
                   "and pre-kindergarten students, emphasizing play-based learning to develop "
                   "literacy, social-emotional skills, and critical thinking."),
              ns.p("It offers an ASL-English bilingual environment, engaging families as essential "
                   "partners in their child’s learning journey, with an inclusive, family-centered "
                   "approach that nurtures each child's growth.")],
        grid=("What children experience", "cards", [
            "Play-based learning | Literacy, social-emotional skills and critical thinking grow through play. | | blocks",
            "Two languages from the start | A bilingual ASL-English environment tailored to each age group. | | hands",
            "Families as partners | Families are essential partners in their child’s learning journey. | | heart",
            "A full school day | A full-day program for preschool and pre-kindergarten students. | | sun"]),
        contact=["Early Learning Center Office | Preschool and pre-kindergarten | (512) 462-5251 | (512) 410-1193 |"]),
    "elementary": dict(
        title="Elementary Program", eyebrow="Academics", subtitle="Kindergarten through 5th grade",
        body=[ns.p("The kindergarten through 5th-grade elementary program celebrates both "
                   "languages, ASL and English, ensuring that our students learn, grow and belong."),
              ns.p("We provide learning opportunities that build on each child’s strengths. We aim "
                   "to develop our students’ critical thinking skills, independence and advocacy "
                   "skills through collaborative learning opportunities. Through active involvement "
                   "in student-centered classrooms, our students develop life-long skills."),
              ns.p("We aim to create an inclusive environment for every child and family. We "
                   "recognize that a sense of belonging and connectedness is essential for "
                   "learning. All families are welcome.")],
        grid=("A whole-child approach", "cards", [
            "Bilingual curriculum | Content tailored to students’ bilingual development in ASL and English. | | book",
            "Social Emotional Learning | Being a good school family, managing emotions and solving problems, all day long. | | heart",
            "A team around every child | Teachers work with an SEL coordinator, counselors, a speech-language pathologist and behavior support. | | users",
            "Therapy support | Occupational and physical therapists provide support when needed. | | sparkles"]),
        contact=["Elementary Office | Kindergarten through 5th grade | | (512) 410-1011 | (512) 462-5245"]),
    "middle-school": dict(
        title="6–8 Secondary Program", eyebrow="Academics", subtitle="Grades 6 through 8",
        body=[ns.p("TSD 6-8 Secondary Program serves students in grades 6 through 8. We are proud "
                   "of our students and celebrate their progress—both big and small. Grades 6 "
                   "through 8 is a time when students grow and change a lot. We are here to "
                   "support them every step of the way."),
              ns.p("We want all students to take responsibility for their learning and feel proud "
                   "of their success. We believe every student can learn and thrive, and we work "
                   "hard to help them reach their goals.")],
        grid=("What we focus on", "cards", [
            "Success in the classroom | Strong academics that prepare students for high school. | | book",
            "Life skills | Working with others, making good choices and growing in confidence. | | compass",
            "A safe, welcoming place | Every student feels included and respected. | | shield",
            "Bilingual users of ASL and English | We support students in both of their languages. | | hands"]),
        contact=[]),
    "high-school": dict(
        title="9–12 Secondary Program", eyebrow="Academics",
        subtitle="High school and Career & Technical Education",
        body=[ns.p("Texas School for the Deaf’s secondary program (9th - 12th grade) offers High "
                   "School (HS) academic and Career & Technical Education (CTE) courses that follow "
                   "the state of Texas’ graduation requirements."),
              ns.p("In grades 9 and 10, students take the majority of their core graduation-required "
                   "courses along with foundational courses and some electives. Once a student "
                   "enters the 11th grade, they join an academy based on their chosen Program of "
                   "Study. Transition planning is at the forefront of ensuring students are "
                   "prepared for their future after graduation.")],
        grid=("Four academies", "cards", [
            "Trades | Hands-on programs such as welding, with industry-based experience. | | hammer",
            "Humanities | Language, culture and the study of people and society. | | palette",
            "Digital Media | Design, video and storytelling for a digital world. | | monitor",
            "STEM | Science, technology, engineering and math, including VEX V5 robotics. | | flask"]),
        contact=["High School Building Main Office | Grades 9–12 academics | (512) 410-1019 | (512) 410-1019 |",
                 "CTE Building Main Office | Career & Technical Education | (512) 410-1015 | (512) 410-1015 |"]),
    "access": dict(
        title="ACCESS", eyebrow="Academics",
        subtitle="Adult Curriculum for Community, Employment, and Social Skills — ages 18 to 22",
        body=[ns.p("The ACCESS Program provides instruction and community-based learning "
                   "opportunities designed to help post-high school Deaf students (18-22 years old) "
                   "develop practical real-world skills in the areas of employment and independent "
                   "living."),
              ns.p("ACCESS provides comprehensive transition planning that includes the family, "
                   "home school district, and community service providers. This ‘wrap-around’ "
                   "approach ensures that students are able to successfully transition back to "
                   "their home communities with supports and resources already in place.")],
        grid=("Independent living skills", "checklist", [
            "Budgeting and money management", "City bus training", "Personal and community safety",
            "Time management and organizational skills", "Personal decision-making",
            "Accessing community-based resources"]),
        contact=[]),
}


def build_pages(home_tpl, page_tpl, detail_id):
    # ---- Home
    promos = [create("TsdPromoBanner", title=p["title"], image=image(p["image"]),
                     imageAlt=p["imageAlt"], link=p["link"]) for p in PROMOS]
    home = page("Texas School for the Deaf", "/", home_tpl,
                description="Texas School for the Deaf in Austin: bilingual ASL-English education "
                            "from preschool to age 22, and statewide outreach for families and "
                            "professionals.")
    fill(home, {
        1: [create("TsdHero", title="Learn. Grow. Belong.", eyebrow="Texas School for the Deaf · Est. 1856",
                   text="A language-rich ASL and English education for Deaf and hard of hearing "
                        "students, on our Austin campus and across Texas through statewide outreach.",
                   ctaText="Apply for enrollment", ctaLink="/admissions",
                   cta2Text="Visit our campus", cta2Link="/contact",
                   image=image("hero-students.jpg"),
                   imageAlt="Five children smiling and posing together, showing peace signs outdoors.")],
        2: [create("TsdQuickLinks", title="Home — quick links", items=lines([
            "School Calendar | /calendar | calendar",
            "Staff Directory | https://www.tsd.texas.gov/apps/pages/staffdirectory | users",
            "Enrollment | /admissions | clipboard",
            "News | /news | megaphone"]))],
        3: [create("TsdFeatureGrid", title="Home — discover TSD", eyebrow="School Links",
                   heading="Discover TSD",
                   intro="Programs designed to support students throughout their educational journey.",
                   layout="cards", theme="white", items=lines(SCHOOL_CARDS + [
                       "Statewide Outreach Center | Resources and programs for families and "
                       "professionals across Texas, from birth to 22. | /outreach | map"]))],
        4: [create("TsdPromoCarousel", title="Home — promotions", interval="8",
                   banners=",".join(promos))],
        5: [create("TsdNewsList", title="Home — latest news", heading="Latest News", count="3",
                   category="all", layout="cards", showAllLink="true")],
        6: [create("TsdEventList", title="Home — upcoming events", heading="Upcoming Events",
                   count="5", layout="compact", showAllLink="true")],
        7: [create("TsdCallout", title="Mission statement", eyebrow="Mission Statement",
                   text=MISSION, ctaText="About TSD", ctaLink="/about", theme="navy")],
    })

    # ---- About
    about = page("About TSD", "/about", page_tpl,
                 description="The mission, vision and beliefs of Texas School for the Deaf.")
    fill(about, {
        1: [banner("About TSD", "Serving Deaf and hard of hearing students and their families "
                   "since 1856.", "Texas School for the Deaf")],
        2: [create("TsdCallout", title="About — mission", eyebrow="Our Mission", text=MISSION,
                   theme="steel")],
        3: [create("TsdFeatureSplit", title="A premier leader in bilingual education",
                   eyebrow="Our Vision", text=VISION + "\n\nTSD is accredited by the Conference of "
                   "Educational Administrators of Schools and Programs for the Deaf (CEASD).",
                   image=image("campus.jpg"),
                   imageAlt="The TSD campus in Austin, with the CEASD accreditation stamp",
                   imagePosition="right", theme="white")],
        4: [create("TsdFeatureGrid", title="About — beliefs", eyebrow="Our Beliefs",
                   heading="What we believe", layout="cards", theme="mist", items=lines([
                       "Partnership | Education is a partnership between students, family, school, and community. | | users",
                       "Early language | Early language acquisition is critical to a deaf child’s social, emotional, and cognitive development. | | baby",
                       "The whole person | Developing the whole person is imperative to a positive identity, self-worth, and lifelong success. | | heart",
                       "ASL and English | American Sign Language and English are woven into the fabric of TSD life, building healthy Deaf identities. | | hands",
                       "Engaged learning | An interdisciplinary curriculum that integrates technology prepares critical thinkers, collaborators, and decision-makers. | | lightbulb",
                       "Statewide outreach | Outreach Services support the state’s deaf and hard of hearing students, their families, and the professionals that serve them. | | map",
                       "Dignity and respect | An inclusive community that values diverse abilities, needs, and interests creates a healthy, safe, and welcoming environment. | | shield"]))],
        5: [create("TsdFeatureGrid", title="About — TSD in numbers", heading="TSD at a glance",
                   layout="stats", theme="navy", items=lines([
                       "1856 | Founded in Austin, Texas",
                       "500 | Students on campus",
                       "Birth–22 | Ages served by Statewide Outreach",
                       "4 | Career academies in grades 11–12"]))],
        6: [create("TsdFeatureSplit", title="Visiting TSD", eyebrow="Campus Tours",
                   text="TSD welcomes visitors who are learning American Sign Language (ASL), "
                        "studying or working in Deaf Education, members of the Deaf community, or "
                        "representatives from community organizations and businesses.\n\nAll visits "
                        "are by appointment only. Tours are available Monday to Friday, 9am to 4pm, "
                        "during the school year. Please request tours at least two weeks in advance "
                        "so we can arrange an interpreter when needed.",
                   ctaText="Plan your visit", ctaLink="/contact",
                   image=image("staff-kickoff.jpg"),
                   imageAlt="TSD staff gathered outside a campus building at the start of the school year",
                   imagePosition="left", theme="white")],
    })

    # ---- Admissions
    admissions = page("Admissions", "/admissions", page_tpl,
                      description="How to apply to Texas School for the Deaf: eligibility, the "
                                  "application process and key dates.")
    fill(admissions, {
        1: [banner("Admissions into TSD", "We are thrilled that you are interested in learning "
                   "more about Texas School for the Deaf!", "Admissions",
                   ctaText="Apply here", ctaLink="https://www.tsd.texas.gov/apps/pages/admissions")],
        2: [create("TsdCallout", title="Admissions — apply early", eyebrow="Apply early",
                   text="Although we accept applications year-round, we highly encourage applicants "
                        "to apply by April 1 so that August admission is not delayed.",
                   ctaText="Start your application",
                   ctaLink="https://www.tsd.texas.gov/apps/pages/admissions", theme="steel")],
        3: [create("TsdFeatureGrid", title="Admissions — eligibility", eyebrow="Application Process",
                   heading="Who can enroll at TSD",
                   intro="Unlike public schools, Texas School for the Deaf has eligibility criteria "
                         "for admission. Minimum requirements are:",
                   layout="checklist", theme="white", items=lines([
                       "Has a residence in Texas",
                       "Is less than 22 years old",
                       "Has an updated immunization record or appropriate waiver",
                       "Has a documented hearing loss and has interest in utilizing sign as their "
                       "instructional and communication mode",
                       "Has a legal guardian or emergency contact willing to take responsibility in "
                       "an emergency"]))],
        4: [create("TsdFeatureGrid", title="Admissions — steps", heading="How admission works",
                   layout="steps", theme="mist", items=lines([
                       "Visit the campus | We recommend coming to campus for a visit. You can do "
                       "this by setting up a tour.",
                       "Send your application | Include documentation of the hearing loss from a "
                       "physician and a complete special education evaluation.",
                       "Referral Committee review | The committee decides whether the student meets "
                       "admission criteria, or whether more information is needed.",
                       "Admission ARD meeting | For eligible students, we develop the IEP, "
                       "educational services and the student’s schedule."]))],
        5: [create("TsdFaq", title="Admissions — FAQ", heading="Questions families ask",
                   items=lines([
                       "Does enrollment include Campus Living? | Enrollment in TSD does not "
                       "guarantee eligibility for the Campus Living program. Enrollment into the "
                       "residential program is a separate consideration, even for a student already "
                       "in TSD’s day program. Questions can be sent to the Student Life Division.",
                       "My child is in high school. When should they transfer? | High school "
                       "students wishing to apply during the spring semester are advised to stay "
                       "enrolled at their current school and enroll in the fall, because changing "
                       "schools mid-spring could result in a loss of credit.",
                       "Can my child attend part-time? | TSD does not admit students on a part-time "
                       "basis or dual enrollment (for example, with a home school or private school).",
                       "Can we appeal an admission decision? | Yes. The parent or guardian may "
                       "appeal to the Superintendent with a short letter, within two weeks of the "
                       "decision. Most appeals are answered within three weeks."]))],
        6: [contacts("Admissions — contacts", "Contact Admissions",
                     [ADMISSIONS_OFFICE, RECORDS_OFFICE, STUDENT_LIFE_OFFICE])],
    })

    # ---- Academics and the five school pages
    academics = page("Academics", "/academics", page_tpl,
                     description="TSD's academic programs, from the Early Learning Center to ACCESS.")
    fill(academics, {
        1: [banner("TSD Academics", "A bilingual ASL-English education from preschool to age 22.",
                   "Academics")],
        2: [create("TsdFeatureGrid", title="Academics — schools", heading="Our programs",
                   layout="cards", theme="white", items=lines(SCHOOL_CARDS))],
        3: [create("TsdFeatureSplit", title="Celebrating our graduates", eyebrow="Class of 2025",
                   text="TSD celebrated the Class of 2025 with 31 graduates. Graduates earned "
                        "scholarships, national honors, and college acceptances, highlighting "
                        "academic and extracurricular achievements.",
                   ctaText="Read the story", ctaLink="/news/tsd-2025-commencement",
                   image=image("graduation.jpg"),
                   imageAlt="The TSD Class of 2025 in caps and gowns on the steps of a campus building",
                   imagePosition="left", theme="mist")],
    })
    for slug, s in SCHOOL_PAGES.items():
        pid = page(s["title"], f"/academics/{slug}", page_tpl, description=s["subtitle"])
        heading, layout, items = s["grid"]
        slots = {
            1: [banner(s["title"], s["subtitle"], s["eyebrow"])],
            2: [rich_text(f"{s['title']} — intro", s["body"])],
            3: [create("TsdFeatureGrid", title=f"{s['title']} — highlights", heading=heading,
                       layout=layout, theme="mist", items=lines(items))],
        }
        if slug == "elementary":
            slots[4] = [create("TsdFeatureSplit", title="Supplies for the new school year",
                               eyebrow="Families",
                               text="Getting ready for a new year? The supply list for the Early "
                                    "Learning Center and Elementary covers everything your child "
                                    "needs on day one.",
                               image=image("elementary.jpg"), imageAlt="", imagePosition="right",
                               theme="white")]
        if slug == "high-school":
            slots[4] = [create("TsdFeatureSplit", title="Welding education in the spotlight",
                               eyebrow="Trades Academy",
                               text="Richard Layton’s impact on welding education is featured in "
                                    "the latest issue of Modern Steel Construction.",
                               ctaText="Read more", ctaLink="/news/tsd-leading-tsd-national-spotlight",
                               image=image("news-welding.jpg"),
                               imageAlt="Welding instructor Richard Layton in the TSD welding shop",
                               imagePosition="left", theme="white")]
        if slug == "access":
            slots[4] = [create("TsdFeatureGrid", title="ACCESS — employment",
                               heading="Employment skills",
                               intro="Students gain hands-on work experience for at least 10 hours "
                                     "a week, with on-the-job training and job coach support as needed.",
                               layout="steps", theme="white", items=lines([
                                   "Find the right job | Identify jobs based upon career interests.",
                                   "Apply and interview | Complete job applications and prepare for job interviews.",
                                   "Thrive at work | Recognize and demonstrate the traits of being a valued employee."]))]
        if s["contact"]:
            slots[5] = [contacts(f"{s['title']} — contacts", "Contact us", s["contact"])]
        fill(pid, slots)

    # ---- Outreach
    outreach = page("Statewide Outreach Center", "/outreach", page_tpl,
                    description="TSD's Statewide Outreach Center supports deaf and hard of hearing "
                                "students, families and professionals across Texas.")
    fill(outreach, {
        1: [banner("Statewide Outreach Center", "Sharing the resources and expertise of Texas "
                   "School for the Deaf with students, families and professionals across Texas.",
                   "Outreach")],
        2: [create("TsdFeatureSplit", title="Welcome to the Statewide Outreach Center",
                   text="The Statewide Outreach Center (SOC) works with schools, agencies, and "
                        "family groups to build a strong network of support and information for "
                        "students who are deaf or hard of hearing.\n\nWe offer services in many ways. "
                        "Some are on the TSD campus. Others take place in local communities, homes, "
                        "classrooms, or online through video and digital tools.",
                   ctaText="Visit txdeafed.org", ctaLink="https://www.txdeafed.org",
                   image=image("outreach-team.jpg"),
                   imageAlt="The Statewide Outreach Center team standing together outside on campus",
                   imagePosition="right", theme="white")],
        3: [create("TsdFeatureGrid", title="Outreach — programs", eyebrow="Programs",
                   heading="For families and professionals", layout="cards", theme="mist",
                   items=lines([
                       "Summer Camps and Programs | Learning, social skills and fun for children, "
                       "teens and young adults, plus professional development. | /news/tsd-summer-camps-and-programs | tent",
                       "Family Weekend Retreat | A weekend on campus for families of deaf and hard of "
                       "hearing children. | /calendar | home",
                       "Discovery Retreat | Families connect, learn and share with other families and "
                       "Deaf mentors. | | compass",
                       "Communication Skills Workshop | Sign language learning for families and the "
                       "professionals who work with their children. | | message",
                       "Parent Infant Program | Support for families of deaf and hard of hearing "
                       "babies and toddlers. | | baby",
                       "On The Road | Outreach staff bring workshops and training to communities "
                       "across Texas. | | car"]))],
        4: [create("TsdFeatureGrid", title="Outreach — goals", heading="Our goals",
                   layout="checklist", theme="white", items=lines([
                       "Connect families and professionals with the right agency, program, service, "
                       "or resource, anywhere in Texas",
                       "Provide programs and services for families and their children (birth–22)",
                       "Offer training and professional development for staff and educators",
                       "Create online resources and materials that are easy to access",
                       "Expand access through statewide events and virtual options",
                       "Increase awareness that every deaf and hard-of-hearing student can reach "
                       "their full potential"]))],
        # Only Outreach events: an Event List scoped to one category.
        5: [create("TsdEventList", title="Outreach — upcoming events",
                   heading="Upcoming Outreach events", count="5", layout="compact",
                   showAllLink="true", eventCategories=["tsd-outreach"])],
        6: [contacts("Outreach — contacts", "We stand by ready to assist you", [OUTREACH_OFFICE])],
    })

    # ---- News, its detail page, calendar, contact
    news = page("News & Announcements", "/news", page_tpl,
                description="News, announcements and the Lone Star Journal from Texas School for the Deaf.")
    fill(news, {
        1: [banner("News & Announcements", "Stories, announcements and the Lone Star Journal.",
                   "News")],
        2: [create("TsdNewsList", title="News — all", heading="", count="all", category="all",
                   layout="cards")],
    })
    fill(detail_id, {
        1: [create("TsdNewsList", title="News detail — more news", heading="More news", count="3",
                   category="all", layout="cards", showAllLink="true")],
    })

    calendar = page("2026-2027 TSD Calendar", "/calendar", page_tpl,
                    description="Upcoming events, testing dates and school holidays at TSD.")
    fill(calendar, {
        1: [banner("2026–2027 TSD Calendar", "Testing dates, school holidays, family events and "
                   "more.", "Calendar")],
        2: [create("TsdEventList", title="Calendar — all events", heading="Upcoming events",
                   count="all", layout="full", showAllLink="filter,ics")],
    })

    contact = page("Contact TSD", "/contact", page_tpl,
                   description="How to reach Texas School for the Deaf, and how to visit our Austin campus.")
    fill(contact, {
        1: [banner("Contact TSD!", "1102 S. Congress Ave., Austin, TX 78704", "Contact")],
        2: [contacts("Contact — offices", "Offices", [MAIN_OFFICE, ADMISSIONS_OFFICE, OUTREACH_OFFICE,
                                                     STUDENT_LIFE_OFFICE, RECORDS_OFFICE])],
        3: [create("TsdFeatureSplit", title="Visiting TSD", eyebrow="Campus Tours",
                   text="As a school, all visits — whether visiting an individual, a school office, "
                        "or for a scheduled tour — are by appointment only.\n\nTours are available "
                        "weekdays, 9am–4pm, during the school year. Requests need at least two "
                        "weeks’ notice (four weeks for larger groups) so we can coordinate with "
                        "campus security and arrange an interpreter. Spanish interpreters are also "
                        "available.",
                   image=image("campus.jpg"),
                   imageAlt="The TSD campus in Austin, with the CEASD accreditation stamp",
                   imagePosition="left", theme="mist")],
        4: [create("TsdFaq", title="Contact — directions", heading="How to find us",
                   intro="Please check in at the Security Booth just inside the main entrance on "
                         "South Congress Avenue.",
                   items=lines([
                       "From Dallas/Fort Worth (north) | Take South IH-35 toward Austin. Take the "
                       "Riverside exit and turn right (west). Turn left on South Congress Avenue, "
                       "away from the Capitol. Drive up the hill about 1/2 block; the main entrance "
                       "is on the right.",
                       "From San Antonio (south) | Take North IH-35 toward Austin. Take the Riverside "
                       "exit and turn left (west). Turn left on South Congress Avenue. Drive up the "
                       "hill about 1/2 block; the main entrance is on the right.",
                       "From Houston (east) | Take West IH-10 toward San Antonio, then TX-71 (exit "
                       "695) toward La Grange/Austin. Bear right onto Riverside, then left on South "
                       "Congress Avenue. The main entrance is about 1/2 mile up the hill on the right.",
                       "From El Paso (west) | Take East IH-10, then US-290 (exit 477) toward "
                       "Fredericksburg, US-281 south, US-290/TX-71 east and MoPac north. Exit at 1st "
                       "Street and turn right on South Congress Avenue. The main entrance is about "
                       "1/2 mile up the hill on the right."]))],
    })


# --------------------------------------------------------------------------

def ensure_site():
    """Find or create and publish the site, and create its folders. Refuses
    to continue if the site already has a home page."""
    global SITE_ID
    resp = ns.api("POST", "/api/v1/site/_byname", {"siteName": SITE})
    site = resp.get("entity") if isinstance(resp, dict) else None
    if not site or not site.get("identifier"):
        SITE_ID = ns.create_site(SITE, "Texas School for the Deaf demo site")
        if not SITE_ID:
            sys.exit(f"could not create {SITE}")
    else:
        SITE_ID = site["identifier"]
        # A page request for a site with no pages falls back to the default
        # site's page, so compare the host of what comes back.
        home = ns.api("GET", f"/api/v1/page/json/index?language_id=1&host_id={SITE_ID}")
        pg = (home.get("entity") or {}).get("page") if isinstance(home, dict) else None
        if pg and pg.get("host") == SITE_ID:
            sys.exit(f"{SITE} already has pages on {ns.HOST} — refusing to "
                     "create duplicates. Delete them to rebuild.")
        if not site.get("live"):
            ns.api("PUT", f"/api/v1/site/{SITE_ID}/_publish")
        print(f"  site {SITE} -> {SITE_ID} (published)")
    ns.create_folders(SITE, FOLDERS)


def set_menu():
    """DotNavigation lists only folders with showOnMenu. `name` must be left
    out of the payload, or dotCMS treats it as a rename and rejects it."""
    entries = [(f, t) for f, t in MENU] + [(f"academics/{f}", t) for f, t in SCHOOL_MENU]
    order = {f: i for i, (f, _) in enumerate(MENU, start=1)}
    order.update({f"academics/{f}": i for i, (f, _) in enumerate(SCHOOL_MENU, start=1)})
    for folder, title in entries:
        for _ in range(10):
            resp = ns.api("PUT", "/api/v1/assets/folders", {
                "assetPath": f"//{SITE}/{folder}/",
                "data": {"title": title, "showOnMenu": True, "sortOrder": order[folder]}})
            if isinstance(resp, dict) and resp.get("entity"):
                break
            time.sleep(2)
        else:
            print(f"  ! menu {folder}: {str(resp)[:200]}")


def main():
    ensure_site()
    set_menu()
    ensure_event_categories()
    create_section_types()
    ensure_container()
    # Home: hero, quick links, school cards, promos, then latest news beside
    # upcoming events, then the mission statement.
    home_tpl = template("TSD Home", [
        ([12], "tsd-row tsd-row--hero"), ([12], "tsd-row"), ([12], "tsd-row"), ([12], "tsd-row"),
        ([7, 5], "tsd-row tsd-row--split"), ([12], "tsd-row"), ([12], "tsd-row")])
    page_tpl = template("TSD Full Width", [([12], "tsd-row")] * 8)
    article_tpl = template("TSD Article", [([12], "tsd-row")] * 3)
    # The news detail page must exist before TsdNews names it as its detail page.
    detail_id = page("News article", "/news", article_tpl, url="news-detail")
    create_record_types(detail_id)
    create_news()
    create_events()
    build_pages(home_tpl, page_tpl, detail_id)
    create_settings_type()
    create("TsdSiteSettings", title=f"{SITE} settings", gaMeasurementId="")
    analytics_key = configure_analytics()
    configure_uve()
    for uri in ["/index", "/about/index", "/admissions/index", "/academics/index",
                *[f"/academics/{s}/index" for s in SCHOOLS], "/outreach/index",
                "/news/index", "/calendar/index", "/contact/index"]:
        ns.verify(SITE_ID, uri)
    print(f"\nDone. Site id: {SITE_ID}")
    print(f"Content Analytics site key (NEXT_PUBLIC_DOTCMS_ANALYTICS_SITE_KEY): {analytics_key}")


if __name__ == "__main__":
    main()
