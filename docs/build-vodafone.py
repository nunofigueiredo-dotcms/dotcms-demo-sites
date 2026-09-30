#!/usr/bin/env python3
"""Build the Vodafone Egypt demo on telcodemo.com (awesomedemo-dev).

Creates the Vodafone content types, templates, folders and menu, the pages
(home, plans, Vodafone Cash, store locator) with their content, the RED rate
plans and their subscription options (a many-to-many relationship), a set
of dummy stores and the site's media library (/images), and points UVE at
the frontend on :3007. Then it runs vodafone-editorial.py (review workflow,
roles, demo users) and vodafone-apis.py (the custom JSON endpoint).

    export DOTCMS_AUTH_TOKEN=...          # an admin token on awesomedemo-dev
    python3 build-vodafone.py

Defaults target awesomedemo-dev and telcodemo.com; override with DOTCMS_HOST,
VODAFONE_SITE, VODAFONE_FRONTEND and DOTCMS_THEME_ID.

Content types are created only if missing. Content and pages are NOT
de-duplicated, so the script refuses to run against a site that already has
a home page — delete the site's pages first to rebuild from scratch.

Brand images in vodafone-assets/ come from web.vodafone.com.eg (requested by
Vodafone for this demo). Stores in vodafone-stores.json are dummy data.
"""
import json
import os
import subprocess
import sys
import time

# dotcms_site reads these at import time.
os.environ.setdefault("DOTCMS_HOST", "https://awesomedemo-dev.dotcms.dev")
# awesomedemo-dev's landing-page theme; headless templates still need one.
os.environ.setdefault("DOTCMS_THEME_ID", "ce00bd28-5f66-47f9-96ca-bbf0722a79aa")

import dotcms_site as ns  # noqa: E402

SITE = os.environ.get("VODAFONE_SITE", "telcodemo.com")
FRONTEND = os.environ.get("VODAFONE_FRONTEND", "http://localhost:3007")
# Same identifier on every instance: it ships with dotCMS.
SYSTEM_WORKFLOW = "d61a59e1-a49c-46f2-a929-db2b4bfa88b2"
# Set by ensure_site().
SITE_ID = ""

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "vodafone-assets")
STORES_FILE = os.path.join(HERE, "vodafone-stores.json")

FOLDERS = ["/plans", "/vodafone-cash", "/store-locator"]
# (folder, menu title, show on menu) in menu order.
MENU = [("plans", "Plans", True), ("vodafone-cash", "Vodafone Cash", True),
        ("store-locator", "Store Locator", True)]

F = "com.dotcms.contenttype.model.field."

# Icons the frontend can draw (frontend-vodafone/src/components/Icon.tsx).
ICONS = ["account", "shop", "store", "contact", "plans", "cash", "dsl",
         "internet", "app", "router", "4g", "wifi", "family", "star", "bill"]

GOVERNORATES = ["Cairo", "Giza", "Alexandria", "Dakahlia", "Gharbia",
                "Port Said", "Ismailia", "Assiut", "Luxor", "Aswan",
                "Red Sea", "South Sinai"]

STORE_SERVICES = [("Vodafone Cash", "cash"), ("New lines & migration", "lines"),
                  ("Devices & accessories", "devices"), ("Home DSL", "dsl"),
                  ("Business customers", "business")]


# --------------------------------------------------------------------------
# Content types — every one has a Site field so content lands on telcodemo.com
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


def cta_fields(label="Button"):
    return [field("ImmutableTextField", f"{label} text", "ctaText"),
            field("ImmutableTextField", f"{label} link", "ctaLink",
                  hint="A page on this site (/plans) or a full URL")]


def create_type(variable, name, description, fields, icon="article"):
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
    resp = ns.api("POST", "/api/v1/contenttype", [body])
    ent = resp.get("entity")
    if isinstance(ent, list) and ent:
        print(f"  type {variable} created")
        return ent[0]["id"]
    print(f"  ! type {variable} failed: {str(resp)[:300]}")
    return None


def create_types():
    # A slide placed on a page is one banner (the home page's default); a
    # Vodafone Hero Carousel rotates several slides picked in its Slides field.
    create_type("VodafoneHeroSlide", "Vodafone Hero Slide",
                "One hero banner: copy on one side, image on the other. Place it on "
                "a page as a banner, or add it to a Vodafone Hero Carousel.", [
        site_field(),
        field("ImmutableTextField", "Headline", "title", required=True, listed=True),
        field("ImmutableTextField", "Highlighted word", "highlight",
              hint="Shown in Vodafone red at the end of the headline, e.g. RED"),
        field("ImmutableTextAreaField", "Text", "text"),
        *cta_fields(),
        field("ImmutableImageField", "Desktop image", "image", required=True),
        field("ImmutableImageField", "Mobile image", "mobileImage",
              hint="Optional; the desktop image is used when empty"),
    ], icon="view_carousel")

    create_type("VodafoneHeroCarousel", "Vodafone Hero Carousel",
                "A rotating hero banner made of Hero Slides. Add it to a page, then "
                "pick and order its slides.", [
        site_field(),
        internal_name(),
        {**field("ImmutableRelationshipField", "Slides", "slides",
                 hint="The slides to rotate through, in order"),
         "relationType": "VodafoneHeroSlide", "values": "1", "indexed": True},
        field("ImmutableSelectField", "Seconds per slide", "interval",
              values=options([("5", "5"), ("7", "7"), ("10", "10"), ("Don't rotate", "0")])),
    ], icon="slideshow")

    create_type("VodafonePageBanner", "Vodafone Page Banner",
                "Hero banner for inner pages", [
        site_field(),
        field("ImmutableTextField", "Headline", "title", required=True, listed=True),
        field("ImmutableTextAreaField", "Subtitle", "subtitle"),
        *cta_fields(),
        field("ImmutableSelectField", "Style", "bannerStyle",
              values=options([("Image across the banner", "overlay"),
                              ("Text beside the image", "split"),
                              ("Red, no image", "red")])),
        field("ImmutableImageField", "Image", "image"),
    ], icon="panorama")

    create_type("VodafoneQuickLinks", "Vodafone Quick Links",
                "The red strip of icon links under the home hero", [
        site_field(),
        internal_name(),
        field("ImmutableTextAreaField", "Links", "items", required=True,
              hint="One per line: Label | link | icon. Icons: " + ", ".join(ICONS)),
    ], icon="link")

    create_type("VodafoneTile", "Vodafone Tile",
                "A white card with image, title, text and a 'Know More' link", [
        site_field(),
        field("ImmutableTextField", "Title", "title", required=True, listed=True),
        field("ImmutableTextAreaField", "Text", "text"),
        *cta_fields("Link"),
        field("ImmutableSelectField", "Size", "size",
              values=options([("Large (image on top)", "large"),
                              ("Compact (image beside)", "compact")])),
        field("ImmutableImageField", "Image", "image"),
    ], icon="crop_portrait")

    create_type("VodafoneServiceCarousel", "Vodafone Service Carousel",
                "A heading plus a scrolling row of service cards with icons", [
        site_field(),
        internal_name(),
        field("ImmutableTextField", "Heading", "heading"),
        field("ImmutableTextAreaField", "Services", "items", required=True,
              hint="One per line: Title | Text | Link text | link | icon. Icons: "
                   + ", ".join(ICONS)),
    ], icon="view_week")

    create_type("VodafoneSubscription", "Vodafone Subscription",
                "An entertainment subscription that RED plans can include", [
        site_field(),
        field("ImmutableTextField", "Name", "title", required=True, listed=True),
        field("ImmutableTextField", "Identifier", "urlTitle", required=True, unique=True,
              hint="Unique across the instance, e.g. vf-sub-disney-plus"),
        field("ImmutableSelectField", "Category", "category", required=True, listed=True,
              values=options([("Video streaming", "video"), ("Music", "music"), ("Sports", "sports")])),
        field("ImmutableTextAreaField", "Description", "description"),
        field("ImmutableTextField", "Website", "website"),
        field("ImmutableImageField", "Logo", "logo", hint="Optional, from the media library"),
    ], icon="subscriptions")

    create_type("VodafonePlan", "Vodafone Plan",
                "One rate plan (RED, Flex, ...), listed by a Vodafone Plan List", [
        site_field(),
        field("ImmutableTextField", "Plan name", "title", required=True, listed=True),
        field("ImmutableSelectField", "Plan family", "family", required=True, listed=True,
              values=options([("RED", "red"), ("Flex", "flex"),
                              ("Mobile Internet", "internet"), ("Home DSL", "dsl")])),
        field("ImmutableTextField", "Data", "data", hint="e.g. 200 GB"),
        field("ImmutableTextField", "Minutes", "minutes", hint="e.g. 11,000"),
        field("ImmutableTextField", "Monthly price (EGP)", "price", required=True, listed=True),
        field("ImmutableTextField", "Price note", "priceNote", hint="e.g. Tax Exclusive"),
        field("ImmutableTextField", "Badge", "badge", hint="Optional ribbon, e.g. Best value"),
        field("ImmutableTextAreaField", "Benefits", "benefits", hint="One per line"),
        *cta_fields(),
        # Not "sortOrder": that name is a built-in contentlet property, and
        # dotCMS then rejects every later edit of the content (BADTYPE).
        field("ImmutableTextField", "Order", "displayOrder", hint="1 shows first"),
        field("ImmutableTextField", "Subscriptions included", "subscriptionsIncluded",
              hint="How many of the options the customer picks, e.g. 5"),
        # Many-to-many (cardinality 1) to VodafoneSubscription.
        {**field("ImmutableRelationshipField", "Subscription options", "subscriptions",
                 hint="The subscriptions customers on this plan can choose from"),
         "relationType": "VodafoneSubscription", "values": "1", "indexed": True},
    ], icon="sim_card")

    # The other side of Plan → Subscription options, so a subscription shows
    # the plans that offer it (same relationship, not a second one).
    sub = ns.api("GET", "/api/v1/contenttype/id/VodafoneSubscription")["entity"]
    if not any(f["variable"] == "plans" for f in sub["fields"]):
        ns.api("POST", f"/api/v1/contenttype/{sub['id']}/fields", {
            **field("ImmutableRelationshipField", "Offered on plans", "plans",
                    hint="The RED plans that include this subscription"),
            "relationType": "VodafonePlan.subscriptions", "values": "1", "indexed": True,
            "contentTypeId": sub["id"]})

    create_type("VodafonePlanList", "Vodafone Plan List",
                "Cards for every published plan in one plan family", [
        site_field(),
        internal_name(),
        field("ImmutableTextField", "Heading", "heading"),
        field("ImmutableTextAreaField", "Intro", "intro"),
        field("ImmutableSelectField", "Plan family", "family", required=True,
              values=options([("RED", "red"), ("Flex", "flex"),
                              ("Mobile Internet", "internet"), ("Home DSL", "dsl")])),
    ], icon="view_list")

    create_type("VodafoneFeatureSplit", "Vodafone Feature Split",
                "Image on one side, heading, text and a button on the other", [
        site_field(),
        field("ImmutableTextField", "Heading", "title", required=True, listed=True),
        field("ImmutableTextAreaField", "Text", "text"),
        *cta_fields(),
        field("ImmutableImageField", "Image", "image"),
        field("ImmutableSelectField", "Image side", "imagePosition",
              values=options([("Left", "left"), ("Right", "right")])),
        field("ImmutableSelectField", "Background", "theme",
              values=options([("White", "light"), ("Grey", "grey"), ("Dark", "dark")])),
    ], icon="vertical_split")

    create_type("VodafoneFeatureGrid", "Vodafone Feature Grid",
                "A heading plus a grid of items, as cards, numbered steps or stats", [
        site_field(),
        internal_name(),
        field("ImmutableTextField", "Heading", "heading"),
        field("ImmutableTextAreaField", "Intro", "intro"),
        field("ImmutableSelectField", "Layout", "layout", required=True,
              values=options([("Cards", "cards"), ("Numbered steps", "steps"),
                              ("Stats", "stats")])),
        field("ImmutableSelectField", "Background", "theme",
              values=options([("Grey", "grey"), ("White", "light"), ("Red", "red")])),
        field("ImmutableTextAreaField", "Items", "items", required=True,
              hint="One per line: Title | Text | optional link | optional icon. "
                   "Stats: Value | Label"),
        *cta_fields(),
    ], icon="grid_view")

    create_type("VodafoneFaq", "Vodafone FAQ",
                "Expandable questions and answers", [
        site_field(),
        internal_name(),
        field("ImmutableTextField", "Heading", "heading"),
        field("ImmutableTextAreaField", "Intro", "intro"),
        field("ImmutableTextAreaField", "Questions", "items", required=True,
              hint="One per line: Question | Answer"),
    ], icon="help")

    create_type("VodafoneStore", "Vodafone Store",
                "One store or dealer, shown by the Vodafone Store Locator", [
        site_field(),
        field("ImmutableTextField", "Store name", "title", required=True, listed=True),
        field("ImmutableTextField", "Identifier", "urlTitle", required=True, unique=True,
              hint="Unique across the instance, e.g. vf-cairo-city-stars"),
        field("ImmutableSelectField", "Store type", "storeType", required=True, listed=True,
              values=options([(t, t) for t in
                              ["Vodafone Store", "Exclusive Dealer", "Business Center"]])),
        field("ImmutableSelectField", "Governorate", "governorate", required=True, listed=True,
              values=options([(g, g) for g in GOVERNORATES])),
        field("ImmutableTextField", "Area", "area"),
        field("ImmutableTextField", "Address", "address", required=True),
        field("ImmutableTextField", "Phone", "phone"),
        field("ImmutableTextField", "Opening hours", "hours"),
        field("ImmutableTextField", "Latitude", "latitude", required=True),
        field("ImmutableTextField", "Longitude", "longitude", required=True),
        field("ImmutableCheckboxField", "Services", "services",
              values=options(STORE_SERVICES)),
    ], icon="storefront")

    create_type("VodafoneStoreLocator", "Vodafone Store Locator",
                "Map and filterable list of every published Vodafone Store", [
        site_field(),
        internal_name(),
        field("ImmutableTextField", "Heading", "heading"),
        field("ImmutableTextAreaField", "Intro", "intro"),
        field("ImmutableSelectField", "Default governorate", "defaultGovernorate",
              values=options([("All of Egypt", "all")] + [(g, g) for g in GOVERNORATES])),
    ], icon="map")


# --------------------------------------------------------------------------
# Content helpers
# --------------------------------------------------------------------------

def create(content_type, **fields):
    e = ns._entity(ns.fire({"contentType": content_type, "site": SITE_ID,
                            "languageId": 1, **fields}),
                   f"{content_type} {fields.get('title')}")
    return e.get("identifier")


# The site's media library: every image is uploaded once, as a file in a
# topic folder under /images, and content references it (Image fields). The
# Vodafone Cash photo, for one, is shared by a home tile and the Cash banner.
MEDIA = {
    "hero": {"hero-red.jpg": "RED hero banner", "hero-flex.png": "Flex bundles hero banner",
             "hero-wifi-calling.jpg": "Wi-Fi Calling hero banner",
             "hero-wifi-calling-mobile.jpg": "Wi-Fi Calling hero banner (mobile)"},
    "home": {"rate-plans.jpg": "Vodafone rate plans", "home-dsl.png": "Home DSL router"},
    "cash": {"vodafone-cash.jpg": "Vodafone Cash"},
    "red": {"red-banner-large.png": "RED plans banner", "red-tv.png": "RED entertainment",
            "red-lifestyle.png": "RED lifestyle", "red-family.png": "RED family"},
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
    """Like ns.template, but rows can carry a CSS class for the frontend.
    rows: [(widths, style_class), ...] on a 12-unit grid."""
    uuid = 0
    body, layout_rows = [], []
    for widths, style in rows:
        cols, offset = [], 1
        for w in widths:
            uuid += 1
            cols.append({"styleClass": "", "leftOffset": offset, "width": w,
                         "containers": [{"identifier": "SYSTEM_CONTAINER",
                                         "uuid": str(uuid)}]})
            body.append(f'#parseContainer("SYSTEM_CONTAINER","{uuid}")')
            offset += w
        layout_rows.append({"styleClass": style, "columns": cols})
    resp = ns.api("POST", "/api/v1/templates", {
        "title": title, "friendlyName": title, "siteId": SITE_ID,
        "theme": ns.STARTER_THEME, "drawed": True,
        "body": "\n".join(body), "drawedBody": "\n".join(body),
        "layout": {"body": {"rows": layout_rows},
                   "header": True, "footer": True, "sidebar": None},
    })
    return ns._entity(resp, f"template {title}").get("identifier")


def fill(page_id, slots):
    """slots: {uuid: [content ids]}; None ids are skipped."""
    ns.place(page_id, [(str(u), [c for c in ids if c]) for u, ids in slots.items()])


# --------------------------------------------------------------------------
# Content
# --------------------------------------------------------------------------

HOME_SLIDES = [
    dict(title="New World of", highlight="RED !",
         text="RED is built for the way you live, offering curated entertainment and "
              "lifestyle benefits like YouTube Premium, Disney+, WATCH IT, OSN+, Anghami "
              "Plus, Amazon Prime, Yango Play, and TOD, plus everyday perks including "
              "talabat pro, BEFIT, and exclusive Qanz discounts at Zara, Massimo Dutti, "
              "OYSHO, KIKO, and more.",
         ctaText="Join Now", ctaLink="/plans", image="hero-red.jpg"),
    dict(title="Flex Bundles Got Bigger & Better", highlight="",
         text="Along with subscriptions in WATCH IT, Anghami Plus & Yango Play!",
         ctaText="Subscribe now", ctaLink="/plans", image="hero-flex.png"),
    dict(title="Wi-Fi Calling", highlight="",
         text="Now you can make calls over your Home DSL without being connected to a network!",
         ctaText="Know more", ctaLink="https://web.vodafone.com.eg/en/wifi-calling",
         image="hero-wifi-calling.jpg", mobileImage="hero-wifi-calling-mobile.jpg"),
]

QUICK_LINKS = [
    "Manage Account | https://web.vodafone.com.eg/spa/myHome | account",
    "Shop | https://eshop.vodafone.com.eg/en/ | shop",
    "Store Locator | /store-locator | store",
    "Contact Us | https://web.vodafone.com.eg/spa/contact-us | contact",
]

OTHER_SERVICES = [
    "Ana Vodafone App | All Vodafone services are at your fingertips. | Download App "
    "| https://web.vodafone.com.eg/en/ana-vodafone | app",
    "Home Wireless | Enjoy more than 50% OFF on Home Wireless routers! | Know More "
    "| https://eshop.vodafone.com.eg/en/ | router",
    "Internet Bundles | Select from a variety of extreme bundles. | Know More "
    "| https://web.vodafone.com.eg/en/mobile-internet-bundles | internet",
    "4G Readiness | Are you ready for our new Network? | Know More "
    "| https://web.vodafone.com.eg/en/4g | 4g",
    "Wi-Fi Calling | Make calls over your Home DSL, even with no mobile signal. "
    "| Know More | https://web.vodafone.com.eg/en/wifi-calling | wifi",
]

# The RED plans as published on web.vodafone.com.eg/en/vodafone-red1.
RED_PLANS = [
    dict(title="RED EXCLUSIVE", data="200 GB", minutes="11,000", price="3450",
         badge="Everything included", benefits=[
             "Enjoy talabat pro for free",
             "Enjoy exclusive events for free",
             "50% off BEFIT points",
             "20% off on your favorite brands when you shop with Qanz Card",
             "Family sharing: add up to 6 members to share quota together",
             "750GBs of Home DSL with a speed up to 30Mbps or 135GBs Home Wireless",
             "Mobile installments up to 60,000 EGP",
             "Take your bundle abroad for 4 weeks/year and 60 international minutes",
             "15 roaming outgoing minutes & 15 roaming incoming minutes"]),
    dict(title="RED ELITE+", data="85 GB", minutes="10,000", price="2000", benefits=[
             "Enjoy talabat pro subscription for free",
             "Enjoy exclusive events for free",
             "50% off BEFIT points",
             "20% off on your favorite brands when you shop with Qanz Card",
             "Family sharing: add up to 5 members to share quota together",
             "300GBs of Home DSL with a speed up to 30Mbps or 135GBs Home Wireless",
             "Mobile installments up to 40,000 EGP",
             "Take your bundle abroad for 3 weeks/year and 10 international minutes",
             "10 roaming outgoing minutes & 10 roaming incoming minutes"]),
    dict(title="RED PRIME+", data="50 GB", minutes="8,000", price="1380",
         badge="Most popular", benefits=[
             "Enjoy talabat pro subscription for free",
             "Enjoy exclusive events for free",
             "50% off BEFIT points",
             "20% off on your favorite brands when you shop with Qanz Card",
             "Family sharing: add up to 3 members to share quota together",
             "200GBs of Home DSL with a speed up to 30Mbps or 135GBs Home Wireless",
             "Mobile installments up to 30,000 EGP",
             "Take your bundle abroad for 2 weeks/year"]),
    dict(title="RED ADVANCE+", data="32 GB", minutes="6,000", price="980", benefits=[
             "Enjoy talabat pro subscription for free",
             "Enjoy exclusive events for free",
             "50% off BEFIT points",
             "20% off on your favorite brands when you shop with Qanz Card",
             "Family sharing: add up to 2 members to share quota together",
             "150GBs of Home DSL with a speed up to 30Mbps or 40GBs Home Wireless",
             "Mobile installments up to 20,000 EGP",
             "Take your bundle abroad for 1 week/year"]),
    dict(title="RED ESSENTIAL+", data="16 GB", minutes="3,500", price="575", benefits=[
             "25% off BEFIT points",
             "20% off on your favorite brands when you shop with Qanz Card",
             "Family sharing: add up to 1 member to share your bundle with",
             "150GBs of Home DSL with a speed up to 30Mbps or 40GBs Home Wireless",
             "Mobile installments up to 15,000 EGP"]),
]

RED_FAQ = [
    "What are the major extra benefits of the new plans over the last ones? | RED "
    "introduces all-inclusive plans for you and your family: one bill that brings together "
    "entertainment (WATCH IT, OSN+, Anghami Plus, Amazon Prime, Yango Play, TOD, Disney+ "
    "and YouTube Premium), lifestyle (BEFIT, talabat pro, Qanz), Home DSL, and the option "
    "to take your bundle abroad.",
    "How do I migrate to the new RED? | If you are already a postpaid customer, open the "
    "Ana Vodafone app, tap More, then My Plan, and choose the rate plan you want. If you "
    "are a prepaid customer, head to the nearest Vodafone store to migrate to RED. For any "
    "extra support call 888.",
    "How can I add member(s) to my RED Family? | Open the Ana Vodafone app and send an "
    "invitation to your loved ones to join your RED family.",
    "What are my roaming benefits? | Take your bundle abroad free of charge: enjoy your "
    "local megabytes while roaming for a set number of weeks per year, depending on your plan.",
    "What Home DSL benefits do I get with my RED plan? | Enjoy a Home DSL bundle of up to "
    "750GBs for free, depending on your RED plan.",
]

CASH_SERVICES = [
    "Card to wallet | Deposit money in your wallet using your bank's credit or debit card. | | cash",
    "Money Transfer | Save time and effort and transfer money to any Vodafone number "
    "anywhere in Egypt. | | cash",
    "Renew your bundle anytime | Renew your Flex or Mobile Internet bundle with a simple click. "
    "| | internet",
    "Vodafone Cash ATM service | Deposit and withdraw your money with Vodafone Cash through "
    "ATM machines. | | cash",
    "Online payment | Pay safely online with only your phone number, on any Egyptian or "
    "international website. | | shop",
    "Utility bill payment | Pay your bills with a click, wherever you are, any time. | | bill",
    "Donations | Donate to charity organizations from your mobile phone with one click. "
    "| | family",
    "Recharge & bill payment | Recharge and pay the bill of any Vodafone number from your "
    "Vodafone Cash account. | | app",
]


def create_slides():
    """The home hero slides, in page order."""
    ids = []
    for s in HOME_SLIDES:
        extra = {"mobileImage": image(s["mobileImage"])} if s.get("mobileImage") else {}
        ids.append(create("VodafoneHeroSlide", title=s["title"], highlight=s["highlight"],
                          text=s["text"], ctaText=s["ctaText"], ctaLink=s["ctaLink"],
                          image=image(s["image"]), **extra))
    print(f"  {len(ids)} hero slides")
    return ids


# The RED entertainment subscriptions: (name, slug, category, description, website).
SUBSCRIPTIONS = [
    ("Disney+", "disney-plus", "video", "Disney, Pixar, Marvel, Star Wars and National Geographic films and series.", "https://www.disneyplus.com"),
    ("YouTube Premium", "youtube-premium", "video", "YouTube and YouTube Music without ads, with downloads and background play.", "https://www.youtube.com/premium"),
    ("WATCH IT", "watch-it", "video", "Egyptian and Arabic series, films and exclusive originals.", "https://www.watchit.com"),
    ("OSN+", "osn-plus", "video", "HBO, Paramount+ and Arabic originals, first in the region.", "https://osnplus.com"),
    ("Anghami Plus", "anghami-plus", "music", "Unlimited Arabic and international music, ad-free and offline.", "https://www.anghami.com"),
    ("Amazon Prime", "amazon-prime", "video", "Prime Video films and series, plus Amazon Prime shopping benefits.", "https://www.primevideo.com"),
    ("Yango Play", "yango-play", "video", "Films, series and music in one app, with Arabic and international titles.", "https://play.yango.com"),
    ("TOD", "tod", "sports", "Live football and sports, including major leagues and tournaments.", "https://www.tod.tv"),
]
ALL_SUBSCRIPTIONS = [s[0] for s in SUBSCRIPTIONS]
# Each plan: how many subscriptions the customer picks, and from which options
# (as published on web.vodafone.com.eg/en/vodafone-red1).
PLAN_SUBSCRIPTIONS = {
    "RED EXCLUSIVE": ("8", ALL_SUBSCRIPTIONS),
    "RED ELITE+": ("7", ALL_SUBSCRIPTIONS),
    "RED PRIME+": ("6", ALL_SUBSCRIPTIONS),
    "RED ADVANCE+": ("5", [s for s in ALL_SUBSCRIPTIONS if s != "YouTube Premium"]),
    "RED ESSENTIAL+": ("4", ["WATCH IT", "OSN+", "Anghami Plus", "Amazon Prime", "Yango Play"]),
}


def create_subscriptions():
    ids = {name: create("VodafoneSubscription", title=name, urlTitle=f"vf-sub-{slug}",
                        category=category, description=description, website=website)
           for name, slug, category, description, website in SUBSCRIPTIONS}
    print(f"  {len(ids)} subscriptions")
    return ids


def create_plans(subscriptions):
    for order, p in enumerate(RED_PLANS, start=1):
        choose, offered = PLAN_SUBSCRIPTIONS[p["title"]]
        create("VodafonePlan", title=p["title"], family="red", data=p["data"],
               minutes=p["minutes"], price=p["price"], priceNote="Tax Exclusive",
               badge=p.get("badge", ""), benefits=lines(p["benefits"]),
               ctaText="Buy now", ctaLink="https://eshop.vodafone.com.eg/en/lines/red/numbers",
               displayOrder=str(order), subscriptionsIncluded=choose,
               # A relationship field takes a query for the related content.
               subscriptions="+identifier:(" + " OR ".join(subscriptions[s] for s in offered) + ")")
    print(f"  {len(RED_PLANS)} RED plans")


def create_stores():
    stores = json.load(open(STORES_FILE, encoding="utf-8"))["stores"]
    for s in stores:
        create("VodafoneStore", title=s["name"], urlTitle=f"vf-{s['slug']}",
               storeType=s["type"], governorate=s["governorate"], area=s["area"],
               address=s["address"], phone=s["phone"], hours=s["hours"],
               latitude=str(s["latitude"]), longitude=str(s["longitude"]),
               services=",".join(s["services"]))
    print(f"  {len(stores)} stores")


def build_pages(home_tpl, page_tpl, slides):
    home = ns.page(SITE_ID, "Vodafone Egypt | Home", "/", home_tpl)
    fill(home, {
        # One banner by default; the offers carousel is ready to add.
        1: slides[:1],
        2: [create("VodafoneQuickLinks", title="Home — quick links",
                   items=lines(QUICK_LINKS))],
        3: [create("VodafoneTile", title="Vodafone rate plans",
                   text="Explore our rate plans tailored to match your needs. Our rate "
                        "plans range from bundles that have everything you need to pay "
                        "as you go plans.",
                   ctaText="Know More", ctaLink="/plans", size="large",
                   image=image("rate-plans.jpg"))],
        4: [create("VodafoneTile", title="Vodafone Cash",
                   text="Vodafone Cash is an E-Wallet provided by Vodafone to make your "
                        "life easier and run all your errands with a click.",
                   ctaText="Know More", ctaLink="/vodafone-cash", size="compact",
                   image=image("vodafone-cash.jpg")),
            create("VodafoneTile", title="Vodafone Home DSL",
                   text="Enjoy fast and reliable home internet you can count on every "
                        "day, with a smooth and stable connection for work, entertainment, "
                        "and everything in between.",
                   ctaText="Know More", ctaLink="https://web.vodafone.com.eg/en/HomeDSLcatalog",
                   size="compact", image=image("home-dsl.png"))],
        5: [create("VodafoneServiceCarousel", title="Home — other services",
                   heading="Other Services", items=lines(OTHER_SERVICES))],
    })

    plans = ns.page(SITE_ID, "RED Rate Plans | Vodafone Egypt", "/plans", page_tpl)
    fill(plans, {
        1: [create("VodafonePageBanner", title="Welcome to the World of RED",
                   subtitle="Enjoy the latest entertainment apps in the market that fit "
                            "your needs. Download the app and migrate to the new RED plans.",
                   ctaText="Download the app",
                   ctaLink="https://web.vodafone.com.eg/en/ana-vodafone",
                   bannerStyle="overlay", image=image("red-banner-large.png"))],
        2: [create("VodafonePlanList", title="Plans — RED",
                   heading="Enjoy the Latest Entertainment and Lifestyle Apps, Curated Just for You",
                   intro="Every RED plan comes with data, minutes to any network and a "
                         "bundle of subscriptions and lifestyle perks.",
                   family="red")],
        3: [create("VodafoneFeatureSplit", title="Endless entertainment",
                   text="RED brings you the latest entertainment apps in the market, "
                        "tailored to your needs. Dive into endless content with YouTube "
                        "Premium, Disney+, WATCH IT, OSN+, Anghami Plus, Amazon Prime, "
                        "Yango Play, and TOD!",
                   ctaText="Learn how to subscribe", ctaLink="#plans",
                   image=image("red-tv.png"), imagePosition="left", theme="light")],
        4: [create("VodafoneFeatureSplit", title="Built for the way you live",
                   text="RED is built for the way you live, with lifestyle benefits made "
                        "for your everyday. From food delivery with talabat pro, to fitness "
                        "with BEFIT, and exclusive shopping discounts through Qanz at Zara, "
                        "Massimo Dutti, OYSHO, KIKO, and much more.",
                   ctaText="Get your line now",
                   ctaLink="https://eshop.vodafone.com.eg/en/lines/red/numbers",
                   image=image("red-lifestyle.png"), imagePosition="right", theme="dark")],
        5: [create("VodafoneFeatureSplit", title="Stay close to your family",
                   text="RED helps you stay connected with the people who matter most. "
                        "Share your internet and minutes with Family Bundle Sharing, keep "
                        "all charges in one place with Family Wallet, and locate your loved "
                        "ones with Find My Family.",
                   ctaText="Get your line now",
                   ctaLink="https://eshop.vodafone.com.eg/en/lines/red/numbers",
                   image=image("red-family.png"), imagePosition="left", theme="light")],
        6: [create("VodafoneFaq", title="Plans — FAQ",
                   heading="Still Wondering?",
                   intro="We thought you might still have questions.",
                   items=lines(RED_FAQ))],
    })

    cash = ns.page(SITE_ID, "Vodafone Cash | Vodafone Egypt", "/vodafone-cash", page_tpl)
    fill(cash, {
        1: [create("VodafonePageBanner", title="Vodafone Cash",
                   subtitle="Vodafone Cash is an E-Wallet provided by Vodafone to make your "
                            "life easier and run all your errands with a click.",
                   ctaText="Find a store near you", ctaLink="/store-locator",
                   bannerStyle="split", image=image("vodafone-cash.jpg"))],
        2: [create("VodafoneFeatureGrid", title="Cash — who can use it",
                   heading="Customers who can use Vodafone Cash", layout="cards",
                   theme="light", items=lines([
                       "Prepaid | Every prepaid Vodafone line can open a wallet. | | plans",
                       "Postpaid | RED and other postpaid customers can open a wallet on "
                       "their line. | | star",
                       "Business line (Enterprise) | Available for enterprise lines too. "
                       "| | account"]))],
        3: [create("VodafoneFeatureGrid", title="Cash — create your wallet",
                   heading="How to create your Vodafone Cash wallet", layout="steps",
                   theme="grey", items=lines([
                       "Visit the nearest Vodafone store | Visit any Vodafone store or "
                       "exclusive dealer and register for free with your national ID.",
                       "Create your PIN | You will receive an SMS confirming your "
                       "registration. Create a 6-digit PIN by dialling *9*5# to activate "
                       "the service.",
                       "Deposit or withdraw money | Use Vodafone stores, exclusive dealers, "
                       "Basata, Aman and Fawry branches or ATMs, and enjoy all Vodafone "
                       "Cash services."]),
                   ctaText="Find a store", ctaLink="/store-locator")],
        4: [create("VodafoneFeatureGrid", title="Cash — services",
                   heading="What are Vodafone Cash services?", layout="cards",
                   theme="light", items=lines(CASH_SERVICES))],
        5: [create("VodafoneFeatureGrid", title="Cash — wallet limits",
                   heading="What are the wallet limits?", layout="stats", theme="red",
                   items=lines(["60,000 EGP | Daily wallet transactions limit",
                                "200,000 EGP | Monthly wallet transactions limit"]))],
        6: [create("VodafoneFaq", title="Cash — help",
                   heading="Need further help?",
                   intro="Call Vodafone Cash customer service on 7001, dial *9# or call "
                         "7000. To find the nearest store, exclusive dealer, Basata, Fawry "
                         "or Aman branch, dial *9*9#.",
                   items=lines([
                       "Is registration free? | Yes. Opening a Vodafone Cash wallet is free "
                       "at any Vodafone store or exclusive dealer; bring your national ID.",
                       "I forgot my PIN. What should I do? | Visit any Vodafone store with "
                       "your national ID to reset your PIN, or call 7001.",
                       "Can I send money to someone on another network? | Money Transfer "
                       "works between Vodafone numbers. To pay other wallets or bank cards, "
                       "use the payment services in the Ana Vodafone app."]))],
    })

    stores = ns.page(SITE_ID, "Store Locator | Vodafone Egypt", "/store-locator", page_tpl)
    fill(stores, {
        1: [create("VodafonePageBanner", title="Store Locator",
                   subtitle="Find a Vodafone store, exclusive dealer or business center "
                            "near you, with opening hours and services.",
                   bannerStyle="red")],
        2: [create("VodafoneStoreLocator", title="Store locator — map",
                   heading="Find your nearest store",
                   intro="Filter by governorate or service, or use your location to sort "
                         "stores by distance.",
                   defaultGovernorate="all")],
    })
    return home


# --------------------------------------------------------------------------

def ensure_site():
    """Find and publish the site, and create its page folders. Refuses to
    continue if the site already has a home page."""
    global SITE_ID
    resp = ns.api("POST", "/api/v1/site/_byname", {"siteName": SITE})
    site = resp.get("entity") if isinstance(resp, dict) else None
    if not site or not site.get("identifier"):
        SITE_ID = ns.create_site(SITE, "Vodafone Egypt demo site")
        if not SITE_ID:
            sys.exit(f"could not create {SITE}")
    else:
        SITE_ID = site["identifier"]
        # A page request for a site with no pages falls back to the default
        # site's page, so compare the host of what comes back.
        home = ns.api("GET", f"/api/v1/page/json/index?language_id=1&host_id={SITE_ID}")
        page = (home.get("entity") or {}).get("page") if isinstance(home, dict) else None
        if page and page.get("host") == SITE_ID:
            sys.exit(f"{SITE} already has pages on {ns.HOST} — refusing to "
                     "create duplicates. Delete them to rebuild.")
        if not site.get("live"):
            ns.api("PUT", f"/api/v1/site/{SITE_ID}/_publish")
        print(f"  site {SITE} -> {SITE_ID} (published)")
    ns.create_folders(SITE, FOLDERS)


def set_menu():
    """DotNavigation lists only folders with showOnMenu. `name` must be left
    out of the payload, or dotCMS treats it as a rename and rejects it."""
    for order, (folder, title, show) in enumerate(MENU, start=1):
        for _ in range(10):
            resp = ns.api("PUT", "/api/v1/assets/folders", {
                "assetPath": f"//{SITE}/{folder}/",
                "data": {"title": title, "showOnMenu": show, "sortOrder": order}})
            if isinstance(resp, dict) and resp.get("entity"):
                break
            time.sleep(2)
        else:
            print(f"  ! menu {folder}: {str(resp)[:200]}")


def main():
    ensure_site()
    set_menu()
    create_types()
    # Home: hero slides (a carousel on the site), quick links, then tiles in two columns (rate plans on the
    # left, Cash and DSL stacked on the right), then other services.
    home_tpl = template("Vodafone Home", [
        ([12], "vf-row vf-row--hero"), ([12], "vf-row"), ([6, 6], "vf-row vf-row--tiles"),
        ([12], "vf-row"), ([12], "vf-row"), ([12], "vf-row")])
    page_tpl = template("Vodafone Full Width", [([12], "vf-row")] * 8)
    slides = create_slides()
    # Not placed on a page: adding it in the editor is a demo step. An
    # ordered list of identifiers keeps the slides in this order.
    create("VodafoneHeroCarousel", title="Home — offers carousel", interval="7",
           slides=",".join(slides))
    create_plans(create_subscriptions())
    create_stores()
    build_pages(home_tpl, page_tpl, slides)
    ns.configure_uve(SITE_ID, FRONTEND)
    for uri in ["/index", "/plans/index", "/vodafone-cash/index", "/store-locator/index"]:
        ns.verify(SITE_ID, uri)
    # Last, once the content exists (it is created with the System Workflow):
    # the review workflow, roles and demo users, then the custom JSON API.
    for script in ("vodafone-editorial.py", "vodafone-apis.py"):
        print(f"\n{script}")
        subprocess.run([sys.executable, os.path.join(HERE, script)], check=True)
    print(f"\nDone. Site id: {SITE_ID}")


if __name__ == "__main__":
    main()
