#!/usr/bin/env python3
"""Build the Expo City Dubai demo on general.com (awesomedemo-dev).

Creates the Expo content types (sections for the Universal Visual Editor and
records: attractions, events, restaurants, venues, FAQs, site settings), an
"Expo Sections" container, templates, folders and menu, and the pages of the
Visit, Spaces and Explore areas — every page and every item in English and
Arabic (the instance's ar-AE language). Then it turns on Content Analytics
and points UVE at the local frontend (frontend-general, port 3009).

    export DOTCMS_AUTH_TOKEN=...          # an admin token on awesomedemo-dev
    python3 build-general.py

Copy, photos and logos come from expocitydubai.com (expo-content.json and
expo-assets/). Defaults target awesomedemo-dev and general.com; override with
DOTCMS_HOST, GENERAL_SITE and GENERAL_FRONTEND.

Safe to re-run after an interruption: content types, templates, pages,
images and items that already exist (matched by title, URL title or file
name) are reused, and a missing Arabic version is added. Sections are placed
on pages again on every run (that replaces, not adds). To rebuild from
scratch, delete the site's content first.
"""
import json
import os
import secrets
import sys
import time

os.environ.setdefault("DOTCMS_HOST", "https://awesomedemo-dev.dotcms.dev")
# awesomedemo-dev's landing-page theme; headless templates still need one.
os.environ.setdefault("DOTCMS_THEME_ID", "ce00bd28-5f66-47f9-96ca-bbf0722a79aa")

import dotcms_site as ns  # noqa: E402

_api, _upload = ns.api, ns.upload_image


def _unavailable(resp):
    """An empty body or a shutdown message: the instance is restarting."""
    return not resp or (isinstance(resp, dict) and (
        resp.get("_raw") == "" or "shut down" in str(resp.get("message", ""))))


def api_with_retry(method, path, payload=None):
    """dotCMS on awesomedemo-dev can restart mid-build; wait for it and retry."""
    for attempt in range(20):
        resp = _api(method, path, payload)
        if not _unavailable(resp):
            return resp
        print(f"  … dotCMS unavailable, retrying {method} {path[:60]} ({attempt + 1})")
        time.sleep(30)
    return resp


def upload_with_retry(path):
    for _ in range(20):
        temp_id = _upload(path)
        if temp_id:
            return temp_id
        time.sleep(30)
    return None


# dotcms_site's fire() looks api up at call time, so it retries too.
ns.api, ns.upload_image = api_with_retry, upload_with_retry

SITE = os.environ.get("GENERAL_SITE", "general.com")
FRONTEND = os.environ.get("GENERAL_FRONTEND", "http://localhost:3009")
DEV_FRONTENDS = ["http://localhost:3009", "http://general.localhost:3009"]
SYSTEM_WORKFLOW = "d61a59e1-a49c-46f2-a929-db2b4bfa88b2"
CONTAINER_TITLE = "Expo Sections"
EN = 1
AR = 0  # set by ensure_arabic()
SITE_ID = ""
CONTAINER_ID = ""

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "expo-assets")
with open(os.path.join(HERE, "expo-content.json"), encoding="utf-8") as fh:
    DATA = json.load(fh)

FOLDERS = ["/visit", "/visit/attractions", "/visit/events", "/visit/parks-and-wellness",
           "/visit/dining", "/visit/plan-your-visit", "/spaces", "/explore",
           "/explore/about", "/explore/sustainability", "/explore/accessibility", "/explore/faqs"]
# (folder, menu title) in menu order. Arabic titles live in the Arabic site
# settings (menuLabels), since a folder has one title for every language.
MENU = [("visit", "Visit"), ("spaces", "Spaces"), ("explore", "Explore")]
SUBMENU = {
    "visit": [("attractions", "Attractions"), ("events", "Events & Workshops"),
              ("parks-and-wellness", "Parks & Wellness"), ("dining", "Restaurants & Cafés"),
              ("plan-your-visit", "Plan Your Visit")],
    "explore": [("about", "About the city"), ("sustainability", "Sustainability"),
                ("accessibility", "Accessibility"), ("faqs", "FAQs")],
}
MENU_AR = {"/visit": "الزيارة", "/visit/attractions": "المعالم",
           "/visit/events": "الفعاليات وورش العمل", "/visit/parks-and-wellness": "الحدائق والمرافق الرياضية",
           "/visit/dining": "المطاعم والمقاهي", "/visit/plan-your-visit": "خططوا لرحلتكم",
           "/spaces": "القاعات والمساحات", "/explore": "استكشف", "/explore/about": "عن المدينة",
           "/explore/sustainability": "الاستدامة", "/explore/accessibility": "إمكانية الوصول",
           "/explore/faqs": "الأسئلة الشائعة"}

F = "com.dotcms.contenttype.model.field."

# Icons the frontend can draw (frontend-general/src/components/Icon.tsx).
ICON_HINT = ("Icons: metro, car, bus, bike, ticket, clock, map, accessibility, leaf, sun, "
             "users, building, sparkles, heart, calendar, info, phone, mail")

ATTRACTION_CATEGORIES = [("Attraction", "attraction"), ("Park", "park"), ("Wellness", "wellness")]
EVENT_CATEGORIES = [("Concert", "concert"), ("Family", "family"), ("Workshop", "workshop"),
                    ("Festival", "festival"), ("Sports", "sports"), ("Culture", "culture")]
RESTAURANT_CATEGORIES = [("Restaurant", "restaurant"), ("Café", "cafe"), ("Lounge", "lounge")]
EVENT_TYPES = [("Weddings & social events", "weddings"), ("Meetings & conferences", "meetings"),
               ("Fitness & wellness", "fitness"), ("Festivals & events", "festivals")]
FAQ_TOPICS = [("Visiting", "visiting"), ("Tickets", "tickets"), ("Getting here", "getting-here"),
              ("Accessibility", "accessibility"), ("Safety", "safety")]


# --------------------------------------------------------------------------
# Content types — every one has a Site field so content lands on general.com
# --------------------------------------------------------------------------

def field(kind, name, variable, required=False, indexed=False, listed=False,
          values=None, hint=None):
    f = {"clazz": F + kind, "name": name, "variable": variable,
         "required": required, "indexed": indexed or required, "listed": listed}
    if values:
        f["values"] = values
    if hint:
        f["hint"] = hint
    return f


def options(pairs):
    return "\r\n".join(f"{label}|{value}" for label, value in pairs)


def site_field():
    return field("ImmutableHostFolderField", "Site", "site", required=True)


def internal_name():
    return field("ImmutableTextField", "Internal name", "title", required=True, listed=True)


def cta_fields(label="Button", prefix="cta"):
    return [field("ImmutableTextField", f"{label} text", f"{prefix}Text"),
            field("ImmutableTextField", f"{label} link", f"{prefix}Link",
                  hint="A page on this site (/visit/events) or a full URL")]


def image_fields(required=False):
    return [field("ImmutableImageField", "Image", "image", required=required),
            field("ImmutableTextField", "Image description (alt text)", "imageAlt",
                  hint="Describe the image for screen reader users. Leave empty for decorative images.")]


def theme_field(pairs, name="Background"):
    return field("ImmutableSelectField", name, "theme", values=options(pairs))


THEMES = [("White", "white"), ("Sand", "sand"), ("Charcoal", "charcoal"), ("Teal", "teal")]


def create_type(variable, name, description, fields, icon="article",
                url_map=None, detail_page=None):
    resp = ns.api("GET", f"/api/v1/contenttype/id/{variable}")
    existing = resp.get("entity") if isinstance(resp, dict) else None
    if isinstance(existing, dict) and existing.get("id"):
        print(f"  type {variable} exists")
        return existing["id"]
    body = {
        "clazz": "com.dotcms.contenttype.model.type.ImmutableSimpleContentType",
        "name": name, "variable": variable, "description": description,
        "host": SITE_ID, "icon": icon, "workflow": [SYSTEM_WORKFLOW], "fields": fields,
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


SECTION_TYPES = ["ExpoHero", "ExpoPageBanner", "ExpoFeatureSplit", "ExpoFeatureGrid",
                 "ExpoCollection", "ExpoEventList", "ExpoFaqList", "ExpoCallout", "webPageContent"]


def create_section_types():
    """Page sections: what editors drag onto pages in the Universal Visual Editor."""
    create_type("ExpoHero", "Expo Hero", "The full-width photo banner at the top of the home page", [
        site_field(),
        field("ImmutableTextField", "Headline", "title", required=True, listed=True),
        field("ImmutableTextField", "Eyebrow", "eyebrow", hint="Small line above the headline"),
        field("ImmutableTextAreaField", "Text", "text"),
        *cta_fields(), *cta_fields("Second button", "cta2"),
        *image_fields(required=True),
    ], icon="panorama")

    create_type("ExpoPageBanner", "Expo Page Banner", "Title banner for inner pages, with an optional photo", [
        site_field(),
        field("ImmutableTextField", "Title", "title", required=True, listed=True),
        field("ImmutableTextField", "Eyebrow", "eyebrow"),
        field("ImmutableTextAreaField", "Subtitle", "subtitle"),
        *cta_fields(), *image_fields(),
    ], icon="web_asset")

    create_type("ExpoFeatureSplit", "Expo Feature Split",
                "Photo on one side; heading, text and a button on the other", [
        site_field(),
        field("ImmutableTextField", "Heading", "title", required=True, listed=True),
        field("ImmutableTextField", "Eyebrow", "eyebrow"),
        field("ImmutableTextAreaField", "Text", "text", hint="Leave a blank line between paragraphs"),
        *cta_fields(), *image_fields(),
        field("ImmutableSelectField", "Photo side", "imagePosition",
              values=options([("Start", "start"), ("End", "end")]),
              hint="Start is the left in English and the right in Arabic"),
        theme_field(THEMES),
    ], icon="vertical_split")

    create_type("ExpoFeatureGrid", "Expo Feature Grid",
                "A heading plus a grid of items: icon cards, numbered steps or big stats", [
        site_field(), internal_name(),
        field("ImmutableTextField", "Eyebrow", "eyebrow"),
        field("ImmutableTextField", "Heading", "heading"),
        field("ImmutableTextAreaField", "Intro", "intro"),
        field("ImmutableSelectField", "Layout", "layout", required=True,
              values=options([("Icon cards", "cards"), ("Numbered steps", "steps"), ("Stats", "stats")])),
        theme_field(THEMES),
        field("ImmutableTextAreaField", "Items", "items", required=True,
              hint="One per line: Title | Text | optional link | optional icon. Stats: Value | Label. " + ICON_HINT),
        *cta_fields(),
    ], icon="grid_view")

    create_type("ExpoCollection", "Expo Collection",
                "Cards for attractions, restaurants or event spaces, picked from their content", [
        site_field(), internal_name(),
        field("ImmutableTextField", "Eyebrow", "eyebrow"),
        field("ImmutableTextField", "Heading", "heading"),
        field("ImmutableTextAreaField", "Intro", "intro"),
        field("ImmutableSelectField", "Show", "source", required=True,
              values=options([("Attractions", "attractions"), ("Restaurants & cafés", "restaurants"),
                              ("Event spaces", "venues")])),
        field("ImmutableTextField", "Only this category", "category",
              hint="Optional. Attractions: attraction, park, wellness. Restaurants: restaurant, cafe, lounge. "
                   "Spaces: flagship, weddings, meetings, fitness, festivals"),
        field("ImmutableSelectField", "How many", "count",
              values=options([("3", "3"), ("4", "4"), ("6", "6"), ("8", "8"), ("All", "all")])),
        theme_field(THEMES),
        *cta_fields(),
    ], icon="view_carousel")

    create_type("ExpoEventList", "Expo Event List", "Upcoming events, soonest first", [
        site_field(), internal_name(),
        field("ImmutableTextField", "Eyebrow", "eyebrow"),
        field("ImmutableTextField", "Heading", "heading"),
        field("ImmutableTextAreaField", "Intro", "intro"),
        field("ImmutableSelectField", "How many", "count",
              values=options([("3", "3"), ("6", "6"), ("All", "all")])),
        field("ImmutableCheckboxField", "Options", "showFilters",
              values=options([("Show category filters", "filters")])),
        theme_field(THEMES),
        *cta_fields(),
    ], icon="event")

    create_type("ExpoFaqList", "Expo FAQ List", "Questions and answers, from the FAQ content", [
        site_field(), internal_name(),
        field("ImmutableTextField", "Heading", "heading"),
        field("ImmutableTextAreaField", "Intro", "intro"),
        field("ImmutableSelectField", "Topic", "topic", values=options([("All topics", "all"), *FAQ_TOPICS])),
        field("ImmutableSelectField", "How many", "count",
              values=options([("4", "4"), ("8", "8"), ("All", "all")])),
        theme_field(THEMES),
        *cta_fields(),
    ], icon="quiz")

    create_type("ExpoCallout", "Expo Callout", "A full-width statement band with a button", [
        site_field(), internal_name(),
        field("ImmutableTextField", "Eyebrow", "eyebrow"),
        field("ImmutableTextAreaField", "Statement", "text", required=True),
        *cta_fields(),
        theme_field([("Magenta", "magenta"), ("Teal", "teal"), ("Charcoal", "charcoal"), ("Sand", "sand")]),
    ], icon="format_quote")


def body_field():
    return field("ImmutableStoryBlockField", "Body", "body")


def create_record_types(details):
    """Records with their own pages. `details` maps type → detail page id."""
    url = [field("ImmutableTextField", "URL title", "urlTitle", required=True,
                 hint="The last part of the page address, e.g. terra-pavilion")]
    create_type("ExpoAttraction", "Expo Attraction", "An attraction, park or wellness spot", [
        site_field(),
        field("ImmutableTextField", "Name", "title", required=True, listed=True), *url,
        field("ImmutableSelectField", "Category", "category", required=True,
              values=options(ATTRACTION_CATEGORIES)),
        field("ImmutableTextAreaField", "Teaser", "teaser", required=True),
        body_field(), *image_fields(),
        field("ImmutableTextField", "Location", "location"),
        field("ImmutableTextField", "Opening hours", "hours"),
        field("ImmutableTextField", "Price", "price"),
        field("ImmutableTextField", "Tickets link", "ticketLink"),
    ], icon="attractions", url_map="/visit/attractions/{urlTitle}",
        detail_page=details["ExpoAttraction"])

    create_type("ExpoEvent", "Expo Event", "An event or workshop. Shown until its end date.", [
        site_field(),
        field("ImmutableTextField", "Name", "title", required=True, listed=True), *url,
        field("ImmutableDateTimeField", "Starts", "startDate", required=True, listed=True),
        field("ImmutableDateTimeField", "Ends", "endDate"),
        field("ImmutableTextField", "Time as shown", "timeText", hint="e.g. 8 PM – midnight"),
        field("ImmutableSelectField", "Category", "category", required=True, values=options(EVENT_CATEGORIES)),
        field("ImmutableTextField", "Venue", "venue"),
        field("ImmutableTextField", "Price", "price"),
        field("ImmutableTextAreaField", "Teaser", "teaser", required=True),
        body_field(), *image_fields(),
        field("ImmutableTextField", "Tickets link", "ticketLink"),
    ], icon="event", url_map="/visit/events/{urlTitle}", detail_page=details["ExpoEvent"])

    create_type("ExpoRestaurant", "Expo Restaurant", "A restaurant, café or lounge", [
        site_field(),
        field("ImmutableTextField", "Name", "title", required=True, listed=True), *url,
        field("ImmutableSelectField", "Category", "category", required=True,
              values=options(RESTAURANT_CATEGORIES)),
        field("ImmutableTextField", "Cuisine", "cuisine"),
        field("ImmutableTextAreaField", "Teaser", "teaser", required=True),
        body_field(), *image_fields(),
        field("ImmutableTextField", "Location", "location"),
        field("ImmutableTextField", "Opening hours", "hours"),
    ], icon="restaurant", url_map="/visit/dining/{urlTitle}", detail_page=details["ExpoRestaurant"])

    create_type("ExpoVenue", "Expo Venue", "An event space that can be booked", [
        site_field(),
        field("ImmutableTextField", "Name", "title", required=True, listed=True), *url,
        field("ImmutableCheckboxField", "Flagship venue", "flagship", values=options([("Flagship", "flagship")])),
        field("ImmutableCheckboxField", "Suits", "eventTypes", values=options(EVENT_TYPES)),
        field("ImmutableTextField", "Capacity", "capacity"),
        field("ImmutableTextField", "Area", "area"),
        field("ImmutableTextAreaField", "Teaser", "teaser", required=True),
        field("ImmutableTextAreaField", "Highlights", "highlights", hint="One per line"),
        body_field(), *image_fields(),
    ], icon="meeting_room", url_map="/spaces/{urlTitle}", detail_page=details["ExpoVenue"])

    create_type("ExpoFaq", "Expo FAQ", "A visitor question and its answer", [
        site_field(),
        field("ImmutableTextField", "Question", "title", required=True, listed=True),
        field("ImmutableTextAreaField", "Answer", "answer", required=True),
        field("ImmutableSelectField", "Topic", "topic", required=True, values=options(FAQ_TOPICS)),
        # Not "sortOrder": that is a built-in contentlet property and clashes.
        field("ImmutableTextField", "Order", "position", hint="Lower numbers first"),
    ], icon="quiz")

    create_type("ExpoSiteSettings", "Expo Site Settings",
                "Header, footer and integrations for general.com. One item per site, in each language.", [
        site_field(), internal_name(),
        field("ImmutableTextField", "Google Analytics measurement ID", "gaMeasurementId",
              hint="GA4 ID such as G-ABC123XYZ. Leave empty to turn Google Analytics off."),
        field("ImmutableTextAreaField", "Announcements", "announcements",
              hint="The ticker under the header. One per line: Label | Text | link"),
        field("ImmutableTextAreaField", "Menu labels", "menuLabels",
              hint="Menu titles in this language. One per line: /folder | Title. Empty uses the folder titles."),
        field("ImmutableTextAreaField", "Social media", "socialLinks",
              hint="One per line: Instagram | link (also Facebook, X, LinkedIn, YouTube, TikTok)"),
        field("ImmutableTextAreaField", "Footer links", "footerLinks", hint="One per line: Label | link"),
        field("ImmutableTextField", "Footer tagline", "tagline"),
        field("ImmutableTextField", "Address", "address"),
        field("ImmutableTextField", "Phone", "phone"),
        field("ImmutableTextField", "Email", "email"),
    ], icon="settings")


def ensure_container():
    """A container that accepts only Expo sections (plus rich text), so the
    editor's palette doesn't list every type on the instance."""
    global CONTAINER_ID
    found = ns.api("GET", f"/api/v1/containers?filter=Expo%20Sections&host={SITE_ID}&per_page=20")
    for c in found.get("entity") or []:
        if c.get("title") == CONTAINER_TITLE:
            CONTAINER_ID = c["identifier"]
            return
    structures = []
    for variable in SECTION_TYPES:
        t = ns.api("GET", f"/api/v1/contenttype/id/{variable}")["entity"]
        structures.append({"structureId": t["id"], "code": "$!{dotContentMap.title}"})
    resp = ns.api("POST", "/api/v1/containers", {
        "title": CONTAINER_TITLE, "friendlyName": CONTAINER_TITLE, "hostId": SITE_ID,
        "maxContentlets": 25, "notes": "Expo page sections only. Rendered by frontend-general.",
        "code": "", "preLoop": "", "postLoop": "", "containerStructures": structures})
    c = resp.get("entity")
    if not c:
        sys.exit(f"  ! container: {str(resp)[:300]}")
    ns.api("PUT", "/api/v1/containers/_publish", [c["identifier"]])
    CONTAINER_ID = c["identifier"]
    print(f"  container {CONTAINER_TITLE} -> {CONTAINER_ID}")


# --------------------------------------------------------------------------
# Site, language, menu, UVE, analytics
# --------------------------------------------------------------------------

def ensure_site():
    global SITE_ID
    resp = ns.api("POST", "/api/v1/site/_byname", {"siteName": SITE})
    site = resp.get("entity") if isinstance(resp, dict) else None
    if not site or not site.get("identifier"):
        SITE_ID = ns.create_site(SITE, "Expo City Dubai demo site")
        if not SITE_ID:
            sys.exit(f"could not create {SITE}")
    else:
        SITE_ID = site["identifier"]
        if not site.get("live"):
            ns.api("PUT", f"/api/v1/site/{SITE_ID}/_publish")
        print(f"  site {SITE} -> {SITE_ID} (live)")
    ns.create_folders(SITE, FOLDERS)


def ensure_arabic():
    global AR
    langs = ns.api("GET", "/api/v2/languages").get("entity") or []
    ar = next((lang for lang in langs if lang.get("isoCode") == "ar-ae"), None)
    if not ar:
        ar = ns.api("POST", "/api/v2/languages", {
            "languageCode": "ar", "countryCode": "AE", "language": "Arabic",
            "country": "United Arab Emirates"})["entity"]
    AR = ar["id"]
    print(f"  Arabic language id {AR}")


def set_menu():
    """DotNavigation lists only folders with showOnMenu. `name` must be left
    out of the payload, or dotCMS treats it as a rename and rejects it."""
    entries = [(f, t, i) for i, (f, t) in enumerate(MENU, start=1)]
    for parent, kids in SUBMENU.items():
        entries += [(f"{parent}/{f}", t, i) for i, (f, t) in enumerate(kids, start=1)]
    for folder, title, order in entries:
        for _ in range(10):
            resp = ns.api("PUT", "/api/v1/assets/folders", {
                "assetPath": f"//{SITE}/{folder}/",
                "data": {"title": title, "showOnMenu": True, "sortOrder": order}})
            if isinstance(resp, dict) and resp.get("entity"):
                break
            time.sleep(2)
        else:
            print(f"  ! menu {folder}: {str(resp)[:200]}")


def configure_uve():
    cfg = {"config": [{"pattern": ".*", "url": FRONTEND,
                       "options": {"allowedDevURLs": DEV_FRONTENDS}}]}
    ns.api("POST", f"/api/v1/apps/dotema-config-v2/{SITE_ID}",
           {"configuration": {"value": json.dumps(cfg, indent=2), "hidden": False}})
    print(f"  UVE -> {FRONTEND}")


def configure_analytics():
    """Turn on Content Analytics for the site and return its public site key.
    The analytics service finds the site from the browser's Origin, so
    general.localhost (which browsers send to this machine) is a site alias."""
    # Keep the key the site already has: the frontend's .env.local holds it.
    current = ns.api("GET", f"/api/v1/apps/dotContentAnalytics-config/{SITE_ID}")
    stored = next((x.get("value") for site in (current.get("entity") or {}).get("sites") or []
                   for x in site.get("secrets") or [] if x.get("name") == "siteAuth"), None)
    key = stored or f"DOT.{SITE_ID}.{secrets.token_hex(12)}"
    ns.api("POST", f"/api/v1/apps/dotContentAnalytics-config/{SITE_ID}", {
        "persistenceMode": {"value": "readwrite"}, "siteAuth": {"value": key},
        "autoPageView": {"value": "true"}, "contentImpression": {"value": "true"},
        "contentClick": {"value": "true"}})
    ns.api("PUT", f"/api/v1/site?id={SITE_ID}", {
        "siteName": SITE, "aliases": "general.localhost", "forceExecution": True})
    return key


# --------------------------------------------------------------------------
# Helpers — every item is created in English, then translated to Arabic
# --------------------------------------------------------------------------

_existing = {}


def existing(content_type):
    """What a type already has on this site, in every language, so a re-run
    reuses it instead of creating duplicates."""
    if content_type not in _existing:
        resp = ns.api("POST", "/api/content/_search", {
            "query": f"+contentType:{content_type} +conHost:{SITE_ID} +deleted:false", "limit": 2000})
        _existing[content_type] = ((resp.get("entity") or {}).get("jsonObjectView") or {}).get("contentlets") or []
    return _existing[content_type]


def find(content_type, match):
    """(identifier, has an Arabic version) of the existing item `match` picks, or (None, False)."""
    hit = next((c for c in existing(content_type) if c.get("languageId") == EN and match(c)), None)
    if not hit:
        return None, False
    ident = hit["identifier"]
    return ident, any(c["identifier"] == ident and c.get("languageId") == AR
                      for c in existing(content_type))


def create(content_type, en, ar=None, **common):
    """Create an item in English and, when `ar` is given, its Arabic version
    (the same identifier in another language). Returns the identifier."""
    key = common.get("urlTitle")
    ident, has_ar = find(content_type, (lambda c: c.get("urlTitle") == key) if key
                         else (lambda c: c.get("title") == en.get("title")))
    if not ident:
        e = ns._entity(ns.fire({"contentType": content_type, "site": SITE_ID,
                                "languageId": EN, **common, **en}),
                       f"{content_type} {en.get('title')}")
        ident = e.get("identifier")
    if ident and ar is not None and not has_ar:
        ns._entity(ns.fire({"identifier": ident, "contentType": content_type, "site": SITE_ID,
                            "languageId": AR, **common, **ar}),
                   f"{content_type} {en.get('title')} (ar)")
    return ident


def para(text):
    return {"type": "paragraph", "content": [{"type": "text", "text": text}]} if text else \
        {"type": "paragraph"}


def story(paragraphs):
    return ns.doc([para(t) for t in paragraphs if t])


def rich_text(title, en_nodes, ar_nodes):
    ident, has_ar = find("webPageContent", lambda c: c.get("title") == title)
    if not ident:
        e = ns._entity(ns.fire({"contentType": "webPageContent", "contentHost": SITE_ID,
                                "title": title, "body": ns.doc(en_nodes), "languageId": EN}),
                       f"rich text {title}")
        ident = e.get("identifier")
    if ident and not has_ar:
        ns.fire({"identifier": ident, "contentType": "webPageContent", "contentHost": SITE_ID,
                 "title": title, "body": ns.doc(ar_nodes), "languageId": AR})
    return ident


_media = {}


def image(name, folder="photos", title=None):
    """The identifier of an image in the media library (/images/...),
    uploading it the first time it is used."""
    if not name:
        return None
    if name not in _media:
        found, _ = find("FileAsset", lambda c: c.get("fileName") == name)
        if found:
            _media[name] = found
            return found
        path = os.path.join(ASSETS, name)
        if not os.path.exists(path):
            print(f"  ! missing asset {name}")
            return None
        ns.create_folders(SITE, [f"/images/{folder}"])
        e = ns._entity(ns.fire({"contentType": "FileAsset", "hostFolder": f"{SITE_ID}:/images/{folder}",
                                "title": title or name.rsplit(".", 1)[0].replace("-", " ").title(),
                                "fileName": name, "languageId": EN,
                                "fileAsset": ns.upload_image(path)}),
                       f"image {name}")
        _media[name] = e.get("identifier")
    return _media[name]


def lines(items):
    return "\n".join(items)


def template(title, rows):
    found = ns.api("GET", f"/api/v1/templates?filter={title.replace(' ', '%20')}&host={SITE_ID}&per_page=50")
    for t in found.get("entity") or []:
        if t.get("title") == title:
            return t["identifier"]
    uuid = 0
    body, layout_rows = [], []
    for style in rows:
        uuid += 1
        layout_rows.append({"styleClass": style, "columns": [{
            "styleClass": "", "leftOffset": 1, "width": 12,
            "containers": [{"identifier": CONTAINER_ID, "uuid": str(uuid)}]}]})
        body.append(f'#parseContainer("{CONTAINER_ID}","{uuid}")')
    resp = ns.api("POST", "/api/v1/templates", {
        "title": title, "friendlyName": title, "siteId": SITE_ID,
        "theme": ns.STARTER_THEME, "drawed": True,
        "body": "\n".join(body), "drawedBody": "\n".join(body),
        "layout": {"body": {"rows": layout_rows}, "header": True, "footer": True, "sidebar": None},
    })
    tid = ns._entity(resp, f"template {title}").get("identifier")
    ns.api("PUT", "/api/v1/templates/_publish", [tid])
    return tid


def page(folder, tpl, en, ar, url="index"):
    """A page in English and Arabic. en/ar: (title, SEO description)."""
    common = {"contentType": "htmlpageasset", "url": url, "hostFolder": f"{SITE_ID}:{folder}",
              "template": tpl, "cachettl": "0", "sortOrder": 0}
    # The field is "seodescription", all lower case; other spellings are ignored.
    # Pages that already exist are saved again, so their titles and
    # descriptions follow this script.
    uri = f"{folder.rstrip('/')}/{url}"
    ident, _ = find("htmlpageasset", lambda c: c.get("url") == uri)
    e = ns._entity(ns.fire({**common, **({"identifier": ident} if ident else {}), "title": en[0],
                            "friendlyName": en[0], "seodescription": en[1], "languageId": EN}),
                   f"page {en[0]}")
    ident = ident or e.get("identifier")
    if ident:
        ns._entity(ns.fire({**common, "identifier": ident, "title": ar[0], "friendlyName": ar[0],
                            "seodescription": ar[1], "languageId": AR}), f"page {en[0]} (ar)")
    return ident


def fill(page_id, sections):
    """One section per template row, in order; None entries are skipped."""
    ids = [s for s in sections if s]
    payload = [{"personaTag": "", "contentletsId": [cid], "identifier": CONTAINER_ID, "uuid": str(i)}
               for i, cid in enumerate(ids, start=1)]
    resp = ns.api("POST", f"/api/v1/page/{page_id}/content", payload)
    if isinstance(resp, dict) and resp.get("errors"):
        print(f"  ! placing content: {str(resp)[:300]}")
    for lang in (EN, AR):
        ns.fire({"identifier": page_id, "contentType": "htmlpageasset", "languageId": lang})
    ns.api("PUT", f"/api/v1/content/_unlock/{page_id}")


def banner(title_en, title_ar, sub_en="", sub_ar="", img=None, eyebrow=("", "")):
    common = {"image": image(img)} if img else {}
    return create("ExpoPageBanner", {"title": title_en, "subtitle": sub_en, "eyebrow": eyebrow[0]},
                  {"title": title_ar, "subtitle": sub_ar, "eyebrow": eyebrow[1]}, **common)


def collection(name, source, heading, intro=("", ""), count="all", category="", cta=None,
               theme="white", eyebrow=("", "")):
    cta_en, cta_ar, link = cta or ("", "", "")
    return create("ExpoCollection",
                  {"title": name, "heading": heading[0], "intro": intro[0], "eyebrow": eyebrow[0],
                   "ctaText": cta_en},
                  {"title": name, "heading": heading[1], "intro": intro[1], "eyebrow": eyebrow[1],
                   "ctaText": cta_ar},
                  source=source, count=count, category=category, theme=theme, ctaLink=link)


def events_list(name, heading, intro=("", ""), count="all", filters=False, cta=None, theme="white"):
    cta_en, cta_ar, link = cta or ("", "", "")
    return create("ExpoEventList",
                  {"title": name, "heading": heading[0], "intro": intro[0], "ctaText": cta_en},
                  {"title": name, "heading": heading[1], "intro": intro[1], "ctaText": cta_ar},
                  count=count, showFilters="filters" if filters else "", theme=theme, ctaLink=link)


def faq_list(name, heading, topic="all", count="all", cta=None, theme="white"):
    cta_en, cta_ar, link = cta or ("", "", "")
    return create("ExpoFaqList", {"title": name, "heading": heading[0], "ctaText": cta_en},
                  {"title": name, "heading": heading[1], "ctaText": cta_ar},
                  topic=topic, count=count, theme=theme, ctaLink=link)


def grid(name, layout, heading, items_en, items_ar, intro=("", ""), theme="white", eyebrow=("", "")):
    return create("ExpoFeatureGrid",
                  {"title": name, "heading": heading[0], "intro": intro[0], "eyebrow": eyebrow[0],
                   "items": lines(items_en)},
                  {"title": name, "heading": heading[1], "intro": intro[1], "eyebrow": eyebrow[1],
                   "items": lines(items_ar)},
                  layout=layout, theme=theme)


def split(heading, text, img=None, eyebrow=("", ""), cta=None, position="start", theme="white",
          alt=("", "")):
    cta_en, cta_ar, link = cta or ("", "", "")
    common = {"imagePosition": position, "theme": theme, "ctaLink": link}
    if img:
        common["image"] = image(img)
    return create("ExpoFeatureSplit",
                  {"title": heading[0], "text": text[0], "eyebrow": eyebrow[0], "ctaText": cta_en,
                   "imageAlt": alt[0]},
                  {"title": heading[1], "text": text[1], "eyebrow": eyebrow[1], "ctaText": cta_ar,
                   "imageAlt": alt[1]}, **common)


def callout(name, text, cta=None, theme="magenta", eyebrow=("", "")):
    cta_en, cta_ar, link = cta or ("", "", "")
    return create("ExpoCallout", {"title": name, "text": text[0], "eyebrow": eyebrow[0], "ctaText": cta_en},
                  {"title": name, "text": text[1], "eyebrow": eyebrow[1], "ctaText": cta_ar},
                  theme=theme, ctaLink=link)


def pg(key):
    """Page copy from expo-content.json: (data, en, ar)."""
    d = DATA["pages"][key]
    return d, d.get("en", {}), d.get("ar", {})


def both(key, field_name, default=""):
    _, en, ar = pg(key)
    return en.get(field_name) or default, ar.get(field_name) or en.get(field_name) or default


# --------------------------------------------------------------------------
# Records
# --------------------------------------------------------------------------

def record(content_type, item, keys, folder, **extra):
    """An attraction, event, restaurant or venue from expo-content.json."""
    en, ar = item["en"], item.get("ar") or item["en"]

    def fields(lang):
        out = {k: lang.get(k, "") for k in keys}
        out["body"] = story(lang.get("body") or [])
        out["imageAlt"] = lang.get("imageAlt", "")
        return out

    return create(content_type, fields(en), fields(ar), urlTitle=item["urlTitle"],
                  image=image(item.get("image"), folder, en.get("imageAlt") or en["title"]), **extra)


def create_records():
    for a in DATA["attractions"]:
        record("ExpoAttraction", a, ["title", "teaser", "location", "hours", "price"], "attractions",
               category=a["category"], ticketLink=a.get("ticketLink", ""))
    for e in DATA["events"]:
        record("ExpoEvent", e, ["title", "teaser", "venue", "timeText", "price"], "events",
               category=e["category"], startDate=e["startDate"], endDate=e.get("endDate") or e["startDate"],
               ticketLink=e.get("ticketLink", ""))
    for r in DATA["restaurants"]:
        record("ExpoRestaurant", r, ["title", "cuisine", "teaser", "location", "hours"], "dining",
               category=r["category"])
    for v in DATA["venues"]:
        en, ar = v["en"], v.get("ar") or v["en"]
        create("ExpoVenue",
               {"title": en["title"], "teaser": en["teaser"], "highlights": lines(en.get("highlights", [])),
                "body": story(en.get("body", [])), "imageAlt": en.get("imageAlt", "")},
               {"title": ar["title"], "teaser": ar["teaser"], "highlights": lines(ar.get("highlights", [])),
                "body": story(ar.get("body", [])), "imageAlt": ar.get("imageAlt", "")},
               urlTitle=v["urlTitle"], flagship="flagship" if v.get("flagship") else "",
               eventTypes=",".join(v.get("eventTypes", [])), capacity=v.get("capacity", ""),
               area=v.get("area", ""), image=image(v.get("image"), "spaces", en["title"]))
    for i, f in enumerate(DATA["faqs"], start=1):
        ar = f.get("ar") or f["en"]
        create("ExpoFaq", {"title": f["en"]["q"], "answer": f["en"]["a"]},
               {"title": ar["q"], "answer": ar["a"]}, topic=f["topic"], position=str(i))
    print(f"  {len(DATA['attractions'])} attractions, {len(DATA['events'])} events, "
          f"{len(DATA['restaurants'])} restaurants, {len(DATA['venues'])} venues, {len(DATA['faqs'])} FAQs")


def create_settings():
    foot = DATA.get("footer", {})
    social = lines(f"{s['label']} | {s['href']}" for s in foot.get("social", []) if s.get("href"))
    common = {"address": foot.get("address", ""), "phone": foot.get("phone", ""),
              "email": foot.get("email", ""), "socialLinks": social, "gaMeasurementId": ""}
    en_links = ["Plan your visit | /visit/plan-your-visit", "FAQs | /explore/faqs",
                "Accessibility | /explore/accessibility", "Event spaces | /spaces",
                "Sustainability | /explore/sustainability"]
    ar_links = ["خططوا لرحلتكم | /visit/plan-your-visit", "الأسئلة الشائعة | /explore/faqs",
                "إمكانية الوصول | /explore/accessibility", "القاعات والمساحات | /spaces",
                "الاستدامة | /explore/sustainability"]
    events = sorted(DATA["events"], key=lambda e: e["startDate"])[:2]
    en_news = ["Announcement | UAE's first Green Innovation District | /explore/sustainability",
               *[f"Event | {e['en']['title']} | /visit/events/{e['urlTitle']}" for e in events]]
    ar_news = ["إشعار | مجمع ابتكارات الاستدامة الأول في الإمارات | /explore/sustainability",
               *[f"فعالية | {(e.get('ar') or e['en'])['title']} | /visit/events/{e['urlTitle']}" for e in events]]
    create("ExpoSiteSettings",
           {"title": f"{SITE} settings", "footerLinks": lines(en_links), "announcements": lines(en_news),
            "menuLabels": "", "tagline": foot.get("en", {}).get("tagline", "")},
           {"title": f"{SITE} settings", "footerLinks": lines(ar_links), "announcements": lines(ar_news),
            "menuLabels": lines(f"{k} | {v}" for k, v in MENU_AR.items()),
            "tagline": foot.get("ar", {}).get("tagline", "")}, **common)


# --------------------------------------------------------------------------
# Pages
# --------------------------------------------------------------------------

VIEW_ALL = ("View all", "عرض الكل")


def build_pages(home_tpl, page_tpl):
    d, en, ar = pg("home")
    hero = create("ExpoHero",
                  {"title": en.get("heroTitle") or "Discover Expo City Dubai",
                   "eyebrow": en.get("heroEyebrow", ""), "text": en.get("heroText", ""),
                   "ctaText": "Plan your visit", "cta2Text": "What's on",
                   "imageAlt": en.get("heroImageAlt", "Expo City Dubai")},
                  {"title": ar.get("heroTitle") or "اكتشف مدينة إكسبو دبي",
                   "eyebrow": ar.get("heroEyebrow", ""), "text": ar.get("heroText", ""),
                   "ctaText": "خططوا لرحلتكم", "cta2Text": "الفعاليات",
                   "imageAlt": ar.get("heroImageAlt", "مدينة إكسبو دبي")},
                  ctaLink="/visit/plan-your-visit", cta2Link="/visit/events", image=image(d.get("heroImage")))
    home = page("/", home_tpl, ("Discover Expo City Dubai",
                                "The new centre of Dubai's future: attractions, events, parks, dining "
                                "and event spaces at Expo City Dubai."),
                ("اكتشف مدينة إكسبو دبي", "مركز مستقبل دبي الجديد"))
    fill(home, [
        hero,
        collection("Home: attractions", "attractions", ("Attractions & parks", "المعالم والحدائق"),
                   count="4", category="attraction", cta=(*VIEW_ALL, "/visit/attractions"),
                   intro=(en.get("introText", ""), ar.get("introText", ""))),
        events_list("Home: upcoming events", ("What's on", "الفعاليات القادمة"), count="3",
                    cta=(*VIEW_ALL, "/visit/events"), theme="sand"),
        collection("Home: dining", "restaurants", ("Restaurants & cafés", "المطاعم والمقاهي"), count="4",
                   cta=(*VIEW_ALL, "/visit/dining")),
        split(("Expo Free Zone", "المنطقة الحرّة بإكسبو"),
              (en.get("freeZoneText") or "Join an innovative business community of like-minded entities "
               "that supports collaboration and growth.",
               ar.get("freeZoneText") or "انضم إلى مجتمع أعمال مبتكر من مؤسسات تتشارك في الأهداف وتدعم التعاون والنمو"),
              img=pg("spaces")[0].get("image"), eyebrow=("Business", "الأعمال"), theme="charcoal",
              cta=("Explore event spaces", "استكشف المساحات", "/spaces")),
        split(("Make yourself at home in the city of the future", "مدينة المستقبل"),
              (en.get("realEstateText") or "", ar.get("realEstateText") or ""),
              img=pg("about")[0].get("image"), eyebrow=("Real estate", "المشاريع العقارية"),
              position="end", cta=("About the city", "عن المدينة", "/explore/about")),
        faq_list("Home: FAQs", ("Frequently asked questions", "الأسئلة الشائعة"), count="4",
                 cta=(*VIEW_ALL, "/explore/faqs"), theme="sand"),
        callout("Home: plan your visit",
                ("Expo City Dubai is free to enter. Plan your day: getting here, opening hours and tickets.",
                 "الدخول إلى مدينة إكسبو دبي مجاني. خططوا ليومكم: الوصول، أوقات الدخول والتذاكر."),
                cta=("Plan your visit", "خططوا لرحلتكم", "/visit/plan-your-visit")),
    ])

    # Visit
    d, en, ar = pg("thingsToDo")
    visit = page("/visit", page_tpl, ("Things to do", en.get("intro", "")), ("أشياء تستحق التجربة", ar.get("intro", "")))
    fill(visit, [
        banner(en.get("title") or "Things to do", ar.get("title") or "أشياء تستحق التجربة",
               en.get("intro", ""), ar.get("intro", ""), d.get("image")),
        collection("Visit: attractions", "attractions", ("Attractions", "المعالم"), count="4",
                   category="attraction", cta=(*VIEW_ALL, "/visit/attractions")),
        events_list("Visit: events", ("Events & workshops", "الفعاليات وورش العمل"), count="3",
                    cta=(*VIEW_ALL, "/visit/events"), theme="sand"),
        collection("Visit: parks", "attractions", ("Parks & wellness", "الحدائق والمرافق الرياضية"),
                   count="4", category="park", cta=(*VIEW_ALL, "/visit/parks-and-wellness")),
        collection("Visit: dining", "restaurants", ("Restaurants & cafés", "المطاعم والمقاهي"), count="4",
                   cta=(*VIEW_ALL, "/visit/dining"), theme="sand"),
    ])

    d, en, ar = pg("attractions")
    p = page("/visit/attractions", page_tpl, ("Attractions", en.get("intro", "")), ("المعالم", ar.get("intro", "")))
    fill(p, [banner(en.get("title") or "Attractions", ar.get("title") or "المعالم",
                    en.get("intro", ""), ar.get("intro", ""), d.get("image")),
             collection("Attractions: all", "attractions", ("", ""), category="attraction"),
             callout("Attractions: combo ticket",
                     (pg("planYourVisit")[1].get("comboTicket", {}).get("text")
                      or "Visit Terra and Vision with one combo ticket.",
                      pg("planYourVisit")[2].get("comboTicket", {}).get("text") or "تذكرة مجمّعة"),
                     cta=("Combo ticket", "تذكرة مجمّعة", "/visit/plan-your-visit"), theme="teal")])

    d, en, ar = pg("parks")
    items = en.get("items") or []
    items_ar = ar.get("items") or items
    p = page("/visit/parks-and-wellness", page_tpl, ("Parks & Wellness", en.get("intro", "")),
             ("الحدائق والمرافق الرياضية", ar.get("intro", "")))
    fill(p, [banner(en.get("title") or "Parks & Wellness", ar.get("title") or "الحدائق والمرافق الرياضية",
                    en.get("intro", ""), ar.get("intro", ""), d.get("image")),
             collection("Parks: parks", "attractions", ("", ""), category="park"),
             collection("Parks: wellness", "attractions", ("Wellness", "العافية"), category="wellness", theme="sand"),
             grid("Parks: highlights", "cards", ("Make the most of the outdoors", "استمتعوا بالهواء الطلق"),
                  [f"{i['title']} | {i['text']} | | leaf" for i in items],
                  [f"{i['title']} | {i['text']} | | leaf" for i in items_ar]) if items else None])

    d, en, ar = pg("events")
    p = page("/visit/events", page_tpl, ("Events & Workshops", en.get("intro", "")),
             ("الفعاليات وورش العمل", ar.get("intro", "")))
    fill(p, [banner(en.get("title") or "Events & Workshops", ar.get("title") or "الفعاليات وورش العمل",
                    en.get("intro", ""), ar.get("intro", ""), d.get("image")),
             events_list("Events: all", ("", ""), filters=True)])

    d, en, ar = pg("dining")
    p = page("/visit/dining", page_tpl, ("Restaurants & Cafés", en.get("intro", "")),
             ("المطاعم والمقاهي", ar.get("intro", "")))
    fill(p, [banner(en.get("title") or "Restaurants & Cafés", ar.get("title") or "المطاعم والمقاهي",
                    en.get("intro", ""), ar.get("intro", ""), d.get("image")),
             collection("Dining: all", "restaurants", ("", ""))])

    d, en, ar = pg("planYourVisit")
    here_en, here_ar = en.get("gettingHere") or [], ar.get("gettingHere") or en.get("gettingHere") or []
    mob_en, mob_ar = en.get("mobility") or [], ar.get("mobility") or en.get("mobility") or []
    # An icon for each way of getting around, from the English title.
    icon_words = [("metro", "metro"), ("taxi", "car"), ("car", "car"), ("bus", "bus"), ("buggy", "car"),
                  ("bicycle", "bike"), ("bike", "bike"), ("scooter", "bike"), ("hub", "accessibility")]

    def icon_for(title):
        return next((icon for word, icon in icon_words if word in title.lower()), "map")

    def icon_lines(items, english):
        return [f"{i['title']} | {i['text']} | | {icon_for(e['title'])}" for i, e in zip(items, english)]

    combo_en, combo_ar = en.get("comboTicket") or {}, ar.get("comboTicket") or en.get("comboTicket") or {}
    p = page("/visit/plan-your-visit", page_tpl, ("Plan Your Visit", en.get("intro", "")),
             ("خططوا لرحلتكم", ar.get("intro", "")))
    fill(p, [
        banner(en.get("title") or "Plan Your Visit", ar.get("title") or "خططوا لرحلتكم",
               en.get("intro", ""), ar.get("intro", ""), d.get("image")),
        callout("Plan: opening hours", (en.get("openingHours", ""), ar.get("openingHours", "")),
                eyebrow=("Opening hours", "أوقات الدخول"), theme="sand") if en.get("openingHours") else None,
        grid("Plan: getting here", "cards", ("Getting here", "الوصول إلينا"),
             icon_lines(here_en, here_en), icon_lines(here_ar, here_en)) if here_en else None,
        grid("Plan: mobility", "cards", ("Mobility on-site", "التنقل داخل المدينة"),
             icon_lines(mob_en, mob_en), icon_lines(mob_ar, mob_en), theme="sand") if mob_en else None,
        split((combo_en.get("title") or "Combo ticket", combo_ar.get("title") or "تذكرة مجمّعة"),
              (f"{combo_en.get('text', '')}\n\n{combo_en.get('price', '')}".strip(),
               f"{combo_ar.get('text', '')}\n\n{combo_ar.get('price', '')}".strip()),
              img=pg("attractions")[0].get("image"), eyebrow=("Tickets", "التذاكر"),
              cta=("See attractions", "المعالم", "/visit/attractions")) if combo_en else None,
        faq_list("Plan: FAQs", ("Before you go", "قبل الزيارة"), topic="visiting",
                 cta=("All FAQs", "جميع الأسئلة", "/explore/faqs"), theme="sand"),
    ])

    # Spaces
    d, en, ar = pg("spaces")
    types = DATA.get("eventTypes") or []
    spaces = page("/spaces", page_tpl, ("Event spaces", en.get("intro", "")), ("القاعات والمساحات", ar.get("intro", "")))
    fill(spaces, [
        banner(en.get("title") or "Plan your event at Expo City Dubai",
               ar.get("title") or "خططوا لفعالياتكم في مدينة إكسبو دبي",
               en.get("intro", ""), ar.get("intro", ""), d.get("image")),
        collection("Spaces: flagship", "venues", ("Flagship venues", "الوجهات الرئيسية"), category="flagship"),
        grid("Spaces: by event type", "cards", ("Spaces by event type", "المساحات بحسب نوع الفعالية"),
             [f"{t['en']['title']} | {t['en']['text']} | | {['heart', 'users', 'sun', 'sparkles'][n % 4]}"
              for n, t in enumerate(types)],
             [f"{(t.get('ar') or t['en'])['title']} | {(t.get('ar') or t['en'])['text']} | | "
              f"{['heart', 'users', 'sun', 'sparkles'][n % 4]}" for n, t in enumerate(types)],
             theme="sand") if types else None,
        collection("Spaces: all", "venues", ("All spaces", "جميع المساحات")),
        callout("Spaces: enquiry",
                (en.get("enquiryText") or "Tell us about your event and our venues team will be in touch.",
                 ar.get("enquiryText") or "أخبرونا عن فعاليتكم وسيتواصل معكم فريقنا."),
                cta=("Make an enquiry", "تواصلوا لحجز المساحات", "mailto:venues@expocitydubai.ae"),
                eyebrow=("Make an enquiry", "تواصلوا معنا")),
    ])

    # Explore
    d, en, ar = pg("about")
    explore = page("/explore", page_tpl, ("Explore Expo City Dubai", en.get("intro", "")),
                   ("استكشف مدينة إكسبو دبي", ar.get("intro", "")))
    fill(explore, [
        banner("Explore Expo City Dubai", "استكشف مدينة إكسبو دبي", en.get("intro", ""), ar.get("intro", ""),
               d.get("image")),
        grid("Explore: links", "cards", ("", ""),
             ["About the city | A human-centric city built on the legacy of Expo 2020 Dubai. | /explore/about | building",
              "Sustainability | Our approach, decarbonisation roadmap and impact. | /explore/sustainability | leaf",
              "Accessibility | A city designed for everyone. | /explore/accessibility | accessibility",
              "FAQs | Answers to the questions visitors ask most. | /explore/faqs | info"],
             ["عن المدينة | مدينة محورها الإنسان، مبنية على إرث إكسبو 2020 دبي. | /explore/about | building",
              "الاستدامة | رؤيتنا وخارطة طريق خفض الانبعاثات الكربونية والأثر الملموس. | /explore/sustainability | leaf",
              "إمكانية الوصول | مدينة مصممة للجميع. | /explore/accessibility | accessibility",
              "الأسئلة الشائعة | إجابات عن أكثر أسئلة الزوار شيوعاً. | /explore/faqs | info"]),
    ])

    stats_en = [f"{s['value']} | {s['label']}" for s in en.get("stats", [])]
    stats_ar = [f"{s['value']} | {s['label']}" for s in (ar.get("stats") or en.get("stats", []))]
    body_en, body_ar = en.get("body", []), ar.get("body") or en.get("body", [])
    p = page("/explore/about", page_tpl, ("About the city", en.get("intro", "")), ("عن المدينة", ar.get("intro", "")))
    fill(p, [
        banner(en.get("title") or "About the city", ar.get("title") or "عن المدينة",
               en.get("intro", ""), ar.get("intro", ""), d.get("image")),
        rich_text("About: story", [para(t) for t in body_en], [para(t) for t in body_ar]) if body_en else None,
        grid("About: stats", "stats", ("Expo City Dubai in numbers", "مدينة إكسبو دبي بالأرقام"),
             stats_en, stats_ar, theme="charcoal") if stats_en else None,
        split(("Master plan", "المخطط الرئيسي"), (en.get("masterPlan", ""), ar.get("masterPlan", "")),
              img=pg("sustainability")[0].get("image"), eyebrow=("The city", "المدينة")) if en.get("masterPlan") else None,
        callout("About: spaces", ("Host your next event in the city of the future.",
                                  "استضيفوا فعاليتكم القادمة في مدينة المستقبل."),
                cta=("Event spaces", "القاعات والمساحات", "/spaces"), theme="teal"),
    ])

    d, en, ar = pg("sustainability")
    pillars_en = [f"{x['title']} | {x['text']} | | leaf" for x in en.get("pillars", [])]
    pillars_ar = [f"{x['title']} | {x['text']} | | leaf" for x in (ar.get("pillars") or en.get("pillars", []))]
    body_en, body_ar = en.get("body", []), ar.get("body") or en.get("body", [])
    p = page("/explore/sustainability", page_tpl, ("Sustainability", en.get("intro", "")),
             ("الاستدامة", ar.get("intro", "")))
    fill(p, [
        banner(en.get("title") or "Sustainability", ar.get("title") or "الاستدامة",
               en.get("intro", ""), ar.get("intro", ""), d.get("image")),
        rich_text("Sustainability: story", [para(t) for t in body_en], [para(t) for t in body_ar]) if body_en else None,
        grid("Sustainability: pillars", "cards", ("Our approach", "رؤيتنا"), pillars_en, pillars_ar,
             theme="sand") if pillars_en else None,
        callout("Sustainability: GID", ("UAE's first Green Innovation District, in partnership with the UAE "
                                        "Ministry of Economy and Tourism.",
                                        "أول مجمع لابتكارات الاستدامة في دولة الإمارات، بالشراكة مع وزارة الاقتصاد والسياحة."),
                theme="teal", eyebrow=("Announcement", "إشعار")),
    ])

    d, en, ar = pg("accessibility")
    body_en, body_ar = en.get("body", []), ar.get("body") or en.get("body", [])
    p = page("/explore/accessibility", page_tpl, ("Accessibility", en.get("intro", "")),
             ("إمكانية الوصول", ar.get("intro", "")))
    fill(p, [
        banner(en.get("title") or "Accessibility", ar.get("title") or "إمكانية الوصول",
               en.get("intro", ""), ar.get("intro", ""), d.get("image")),
        rich_text("Accessibility: story", [para(t) for t in body_en], [para(t) for t in body_ar]) if body_en else None,
        faq_list("Accessibility: FAQs", ("Accessibility questions", "أسئلة حول إمكانية الوصول"),
                 topic="accessibility", theme="sand"),
    ])

    p = page("/explore/faqs", page_tpl, ("FAQs", "Answers to the questions visitors ask most about Expo City Dubai."),
             ("الأسئلة الشائعة", "إجابات عن أكثر أسئلة الزوار شيوعاً."))
    fill(p, [banner("Frequently asked questions", "الأسئلة الشائعة"),
             faq_list("FAQs: all", ("", ""))])


def build_detail_pages(detail_tpl):
    """The pages URL-mapped records render on. Sections placed here appear
    under every attraction, event, restaurant or venue."""
    ids = {}
    ids["ExpoAttraction"] = page("/visit/attractions", detail_tpl, ("Attraction", ""), ("معلم", ""),
                                 url="attraction-detail")
    ids["ExpoEvent"] = page("/visit/events", detail_tpl, ("Event", ""), ("فعالية", ""), url="event-detail")
    ids["ExpoRestaurant"] = page("/visit/dining", detail_tpl, ("Restaurant", ""), ("مطعم", ""),
                                 url="restaurant-detail")
    ids["ExpoVenue"] = page("/spaces", detail_tpl, ("Event space", ""), ("مساحة", ""), url="venue-detail")
    return ids


def fill_detail_pages(ids):
    fill(ids["ExpoAttraction"], [collection("Attraction detail: more", "attractions",
                                            ("More to discover", "المزيد لاكتشافه"), count="4", theme="sand")])
    fill(ids["ExpoEvent"], [events_list("Event detail: more", ("More events", "المزيد من الفعاليات"),
                                        count="3", theme="sand", cta=(*VIEW_ALL, "/visit/events"))])
    fill(ids["ExpoRestaurant"], [collection("Restaurant detail: more", "restaurants",
                                            ("More places to eat", "المزيد من المطاعم"), count="4", theme="sand")])
    fill(ids["ExpoVenue"], [collection("Venue detail: more", "venues", ("More spaces", "المزيد من المساحات"),
                                       count="4", theme="sand"),
                            callout("Venue detail: enquiry",
                                    ("Tell us about your event and our venues team will be in touch.",
                                     "أخبرونا عن فعاليتكم وسيتواصل معكم فريقنا."),
                                    cta=("Make an enquiry", "تواصلوا لحجز المساحات",
                                         "mailto:venues@expocitydubai.ae"))])


def main():
    ensure_site()
    ensure_arabic()
    set_menu()
    create_section_types()
    ensure_container()
    home_tpl = template("Expo Home", ["expo-row expo-row--hero"] + ["expo-row"] * 9)
    page_tpl = template("Expo Page", ["expo-row"] * 10)
    detail_tpl = template("Expo Detail", ["expo-row"] * 4)
    details = build_detail_pages(detail_tpl)
    create_record_types(details)
    create_records()
    fill_detail_pages(details)
    build_pages(home_tpl, page_tpl)
    create_settings()
    key = configure_analytics()
    configure_uve()
    for uri in ["/index", "/visit/index", "/visit/attractions/index", "/visit/events/index",
                "/visit/dining/index", "/visit/plan-your-visit/index", "/spaces/index",
                "/explore/index", "/explore/about/index", "/explore/faqs/index"]:
        ns.verify(SITE_ID, uri)
    print(f"\nDone. Site id: {SITE_ID} · Arabic language id: {AR}")
    print(f"Content Analytics site key (NEXT_PUBLIC_DOTCMS_ANALYTICS_SITE_KEY): {key}")


if __name__ == "__main__":
    main()
