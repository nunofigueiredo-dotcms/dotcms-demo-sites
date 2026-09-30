#!/usr/bin/env python3
"""Build the sandler.com demo site on a dotCMS instance.

Creates the site (if missing), its folders and menu, the Sandler content
types, templates, pages and content, places the content on each page, and
points UVE at the frontend on :3006.

    # local Docker stack (default host http://localhost:8082)
    export DOTCMS_AUTH_TOKEN=...
    python3 build-sandler.py

    # awesomedemo-dev (site: trainning-service.com)
    export DOTCMS_HOST=https://awesomedemo-dev.dotcms.dev
    export SANDLER_SITE=trainning-service.com
    export DOTCMS_THEME_ID=ce00bd28-5f66-47f9-96ca-bbf0722a79aa   # landing-page theme
    export DOTCMS_AUTH_TOKEN=...
    python3 build-sandler.py

Content types are created only if missing. Content and pages are NOT
de-duplicated, so the script refuses to run against a site that already has
a home page — delete the site first to rebuild from scratch.
"""
import json
import os
import subprocess
import sys
import time

import dotcms_site as ns
from dotcms_site import h, p, ul

# Hostname of the site to build: sandler.com locally, trainning-service.com
# on awesomedemo-dev.
SITE = os.environ.get("SANDLER_SITE", "sandler.com")
FRONTEND = os.environ.get("SANDLER_FRONTEND", "http://localhost:3006")
# Same identifier on every instance: it ships with dotCMS.
SYSTEM_WORKFLOW = "d61a59e1-a49c-46f2-a929-db2b4bfa88b2"
# Set by ensure_site(); the site's identifier differs per instance.
SITE_ID = ""

FOLDERS = ["/programs", "/about", "/locations", "/articles", "/contact"]

F = "com.dotcms.contenttype.model.field."

# Brand images taken from sandler.com, uploaded into dotCMS as content.
ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sandler-assets")
HERO_IMAGE = "sandler-summit-2026-hero-banner.jpg"

# Menu order and labels, matching sandler.com. Locations lives in the
# top-right selector instead of the menu; Contact is the header button.
MENU = [("programs", "Solutions", True), ("about", "About", True),
        ("articles", "Insights", True), ("locations", "Locations", False),
        ("contact", "Contact", False)]


# --------------------------------------------------------------------------
# Content types — every one has a Site field so content lands on sandler.com
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


def site_field():
    return field("ImmutableHostFolderField", "Site", "site", required=True)


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
    print(f"  ! type {variable} failed: {str(resp)[:300]}")
    return None


# Every solution a center can offer; must match SOLUTIONS in
# frontend-sandler/src/utils/centers.ts. Each has a shared page under
# /center-pages/solutions/{slug}.
SOLUTION_CATALOG = [
    ("Sales Training", "sales-training"),
    ("Sales Leadership Training", "sales-leadership-training"),
    ("Sales Management Training", "sales-management-training"),
    ("Customer Success Training", "customer-success-training"),
    ("Assessments", "assessments"),
    ("Online Training", "online-training"),
    ("Certification", "certification"),
    ("Coaching & Consulting", "coaching-consulting"),
    ("Channel Sales Series", "channel-sales-series"),
    ("Sales Training Boot Camp", "sales-training-boot-camp"),
    ("End of the Year Goals Workshop Series", "end-of-the-year-goals-workshop-series"),
    ("Sandler Reinforcement Services", "sandler-reinforcement-services"),
]


# How visitors can narrow the locations directory. Editors pick which search
# modes a directory offers and the radius choices.
DIRECTORY_SEARCH_FIELDS = [
    field("ImmutableCheckboxField", "Search options", "searchModes",
          values="Distance from a ZIP / postal code or city|radius"
                 "\r\nSame state (United States) or same country (elsewhere)|region",
          hint="Leave both unticked to show the map and list without a search box"),
    field("ImmutableTextField", "Radius choices", "radiusOptions",
          hint="Comma-separated, e.g. 25,50,100,250"),
    field("ImmutableTextField", "Default radius", "defaultRadius",
          hint="One of the radius choices, e.g. 50"),
    field("ImmutableSelectField", "Distance unit", "distanceUnit",
          values="Miles|mi\r\nKilometers|km"),
    field("ImmutableTextField", "Demo visitor location", "demoLocation",
          hint="For demos: a city or ZIP code (e.g. New York, NY) used as every "
               "visitor's location instead of asking the browser. Leave empty on a real site."),
]

LOCATION_FIELDS = [
    site_field(),
    field("ImmutableTextField", "Name", "title", required=True, listed=True),
    field("ImmutableTextField", "Group identifier", "urlTitle", required=True, unique=True,
          hint="The go.sandler.com path, e.g. wilcox. Matches a Training Center's URL "
               "slug when this office has pages on this site."),
    field("ImmutableTextField", "City", "city", required=True, listed=True),
    field("ImmutableTextField", "State / province", "region"),
    field("ImmutableTextField", "State code", "regionCode", indexed=True,
          hint="Two-letter code for US states and Canadian provinces, e.g. MA"),
    field("ImmutableTextField", "Country", "country", required=True, listed=True),
    field("ImmutableTextField", "Country code", "countryCode", required=True,
          hint="ISO 3166 two-letter code, e.g. US"),
    field("ImmutableTextField", "Postal code", "postalCode"),
    field("ImmutableTextField", "Phone", "phone"),
    field("ImmutableTextField", "Latitude", "latitude", required=True),
    field("ImmutableTextField", "Longitude", "longitude", required=True),
    field("ImmutableTextField", "Website", "website",
          hint="Used when there is no Training Center page for this office"),
]

LOCATIONS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sandler-locations.json")


def create_network_locations():
    """Every office listed on go.sandler.com/locations, geocoded (see
    sandler-locations.json). Skips the ones already imported."""
    existing = {c["urlTitle"] for c in ns.api("POST", "/api/content/_search", {
        "query": f"+contentType:SandlerLocation +conHost:{SITE_ID} +deleted:false",
        "limit": 1000,
    })["entity"]["jsonObjectView"]["contentlets"]}
    locations = json.load(open(LOCATIONS_FILE, encoding="utf-8"))["locations"]
    added = 0
    for loc in locations:
        if loc["slug"] in existing or "latitude" not in loc:
            continue
        create("SandlerLocation", title=loc["name"], urlTitle=loc["slug"],
               city=loc["city"], region=loc["state"], regionCode=loc["stateCode"],
               country=loc["country"], countryCode=loc["countryCode"],
               postalCode=loc["postalCode"], phone=loc["phone"],
               latitude=str(loc["latitude"]), longitude=str(loc["longitude"]),
               website=loc["url"])
        added += 1
    print(f"  {added} network locations added ({len(existing)} already there)")


# Every country with a Sandler office (see sandler-locations.json).
CENTER_COUNTRIES = "\r\n".join([
    "United States|US", "Canada|CA", "United Kingdom|GB", "Australia|AU",
    "Belgium|BE", "Cayman Islands|KY", "France|FR", "Greece|GR", "Mexico|MX",
    "Poland|PL", "Serbia|RS", "Slovenia|SI", "United Arab Emirates|AE",
])

def create_types(center_detail, article_detail):
    create_type("SandlerHero", "Sandler Hero", "Page hero with two calls to action", [
        site_field(),
        field("ImmutableTextField", "Headline", "title", required=True, listed=True),
        field("ImmutableTextField", "Eyebrow", "eyebrow"),
        field("ImmutableTextAreaField", "Subtitle", "subtitle"),
        field("ImmutableSelectField", "Size", "size",
              values="Large (home page)|large\r\nCompact (inner pages)|compact"),
        field("ImmutableTextField", "Primary button text", "primaryCtaText"),
        field("ImmutableTextField", "Primary button link", "primaryCtaLink"),
        field("ImmutableTextField", "Secondary button text", "secondaryCtaText"),
        field("ImmutableTextField", "Secondary button link", "secondaryCtaLink"),
        field("ImmutableBinaryField", "Background image", "image"),
    ], icon="view_carousel")

    create_type("SandlerFeatureGrid", "Sandler Feature Grid",
                "A heading plus a grid of items, in one of several layouts", [
        site_field(),
        field("ImmutableTextField", "Internal name", "title", required=True, listed=True),
        field("ImmutableTextField", "Eyebrow", "eyebrow"),
        field("ImmutableTextField", "Heading", "heading"),
        field("ImmutableTextAreaField", "Intro", "intro"),
        field("ImmutableSelectField", "Layout", "layout", required=True,
              values="Cards|cards\r\nNumbered|numbered\r\nSuccess Triangle|triangle"
                     "\r\nStats|stats\r\nAwards|awards\r\nImage + list|split"),
        field("ImmutableSelectField", "Theme", "theme",
              values="Light|light\r\nTinted|muted\r\nDark|dark"),
        field("ImmutableTextAreaField", "Items", "items", required=True,
              hint="One item per line: Title | Description | optional link"),
        field("ImmutableTextField", "Button text", "ctaText"),
        field("ImmutableTextField", "Button link", "ctaLink"),
        field("ImmutableBinaryField", "Image", "image",
              hint="Shown beside the list (Image + list) or as the badge (Awards)"),
    ], icon="grid_view")

    create_type("SandlerLocalCenter", "Sandler Local Center",
                "Shows the visitor's selected training center, or a prompt to pick one", [
        site_field(),
        field("ImmutableTextField", "Internal name", "title", required=True, listed=True),
        field("ImmutableTextField", "Heading", "heading"),
        field("ImmutableTextAreaField", "Text when no center is selected", "fallbackText"),
    ], icon="location_on")

    create_type("SandlerCenterDirectory", "Sandler Center Directory",
                "Map and searchable list of every Sandler location worldwide", [
        site_field(),
        field("ImmutableTextField", "Internal name", "title", required=True, listed=True),
        field("ImmutableTextField", "Heading", "heading"),
        field("ImmutableTextAreaField", "Intro", "intro"),
        *DIRECTORY_SEARCH_FIELDS,
    ], icon="map")

    create_type("SandlerLocation", "Sandler Location",
                "One office in the worldwide Sandler network, shown on the locations "
                "map. Links to its Training Center page when one exists, otherwise "
                "to its website.", LOCATION_FIELDS, icon="pin_drop")

    create_type("SandlerArticleList", "Sandler Article List",
                "The latest Sandler articles", [
        site_field(),
        field("ImmutableTextField", "Internal name", "title", required=True, listed=True),
        field("ImmutableTextField", "Heading", "heading"),
        field("ImmutableSelectField", "Number of articles", "limit",
              values="3|3\r\n6|6\r\n12|12"),
        field("ImmutableTextField", "Button text", "ctaText"),
        field("ImmutableTextField", "Button link", "ctaLink"),
    ], icon="list")

    create_type("TrainingCenter", "Training Center",
                "A locally owned Sandler training center. Drives the location selector.", [
        site_field(),
        field("ImmutableTextField", "Center name", "title", required=True, listed=True),
        field("ImmutableTextField", "URL slug", "urlTitle", required=True, unique=True),
        field("ImmutableTextField", "City", "city", required=True, listed=True),
        field("ImmutableTextField", "State / province", "region", required=True),
        field("ImmutableSelectField", "Country", "country", required=True,
              values=CENTER_COUNTRIES),
        field("ImmutableTextField", "Address", "address"),
        field("ImmutableTextField", "Phone", "phone"),
        field("ImmutableTextField", "Latitude", "latitude",
              hint="Decimal degrees, e.g. 42.3555 — used for 'Use my location'"),
        field("ImmutableTextField", "Longitude", "longitude"),
        field("ImmutableTextField", "Headline", "headline",
              hint="The center page's main heading, e.g. Sales Training in Boston"),
        field("ImmutableTextField", "Tagline", "tagline",
              hint="Shown under the headline on the center page"),
        field("ImmutableTextAreaField", "Summary", "summary",
              hint="One or two sentences, used in the local-center blocks"),
        field("ImmutableTextAreaField", "Intro", "intro"),
        field("ImmutableCheckboxField", "Solutions offered", "solutions",
              values="\r\n".join(f"{label}|{slug}" for label, slug in SOLUTION_CATALOG),
              hint="Tick the solutions this center offers. Each gets a page and "
                   "a Solutions menu entry."),
        field("ImmutableStoryBlockField", "Page body", "body"),
        field("ImmutableTextAreaField", "Why choose us", "benefits",
              hint="One per line: Title | Description"),
        field("ImmutableTextAreaField", "Awards & certifications", "awards",
              hint="One per line"),
    ], icon="storefront", url_map="/locations/{urlTitle}", detail_page=center_detail)

    create_type("SandlerArticle", "Sandler Article", "A Sandler resource article", [
        site_field(),
        field("ImmutableTextField", "Title", "title", required=True, listed=True),
        field("ImmutableTextField", "URL slug", "urlTitle", required=True, unique=True),
        field("ImmutableSelectField", "Category", "category", required=True,
              values="Goal Setting|Goal Setting\r\nSales Process|Sales Process\r\n"
                     "Customer Relationships|Customer Relationships\r\n"
                     "Prospecting|Prospecting\r\nLeadership|Leadership"),
        field("ImmutableDateTimeField", "Publish date", "publishDate",
              required=True, listed=True),
        field("ImmutableTextAreaField", "Teaser", "teaser"),
        field("ImmutableStoryBlockField", "Body", "body"),
    ], icon="article", url_map="/articles/{urlTitle}", detail_page=article_detail)


# --------------------------------------------------------------------------
# Content helpers
# --------------------------------------------------------------------------

def create(content_type, **fields):
    e = ns._entity(ns.fire({"contentType": content_type, "site": SITE_ID,
                            "languageId": 1, **fields}),
                   f"{content_type} {fields.get('title')}")
    return e.get("identifier")


def image(name):
    """Upload a file from sandler-assets/ and return its temp id. Each
    contentlet needs its own upload — a temp id is used up once saved."""
    return ns.upload_image(os.path.join(ASSETS, name))


def hero(title, subtitle, eyebrow="", size="compact",
         primary=("", ""), secondary=("", "")):
    return create("SandlerHero", title=title, subtitle=subtitle, eyebrow=eyebrow,
                  size=size, primaryCtaText=primary[0], primaryCtaLink=primary[1],
                  secondaryCtaText=secondary[0], secondaryCtaLink=secondary[1],
                  image=image(HERO_IMAGE))


def grid(title, layout, items, heading="", eyebrow="", intro="", theme="light",
         cta=("", ""), image_file=None):
    extra = {"image": image(image_file)} if image_file else {}
    return create("SandlerFeatureGrid", title=title, layout=layout, theme=theme,
                  heading=heading, eyebrow=eyebrow, intro=intro,
                  items="\n".join(items), ctaText=cta[0], ctaLink=cta[1], **extra)


def local_center(title, heading, fallback):
    return create("SandlerLocalCenter", title=title, heading=heading,
                  fallbackText=fallback)


def text_block(title, nodes):
    return ns.block(SITE_ID, title, nodes)


def page_at(title, folder, url, template_id):
    """Like ns.page, but with a leaf name other than `index` (detail pages)."""
    e = ns._entity(ns.fire({"contentType": "htmlpageasset", "title": title,
                            "url": url, "hostFolder": f"{SITE_ID}:{folder}",
                            "template": template_id, "friendlyName": title,
                            "cachettl": "0", "languageId": 1}),
                   f"page {title}")
    return e.get("identifier")


def fill(page_id, content_ids):
    """One contentlet per full-width row, top to bottom."""
    ns.place(page_id, [(str(i + 1), [cid]) for i, cid in enumerate(content_ids) if cid])


# --------------------------------------------------------------------------
# Training centers — four real Sandler centers from go.sandler.com/locations.
# Name, address and phone are as published there (cross-checked between the
# directory and each center's own page). Section headings follow each
# center's page; body copy is written for the demo from those pages.
# --------------------------------------------------------------------------

CENTERS = [
    {
        "title": "Greg Nanigian & Associates Inc.",
        "urlTitle": "gnatraining-downtown-boston",
        "city": "Boston", "region": "MA", "country": "US",
        "address": "53 State Street, Suite 500, Boston, MA 02109",
        "phone": "(617) 338-0993",
        "latitude": "42.3590", "longitude": "-71.0570",
        "tagline": "Leadership, Sales, Team Building & Communication Training",
        "summary": "Sandler training for sales teams and leaders across Greater "
                   "Boston, from offices downtown, in Braintree, Needham and Woburn.",
        "intro": "Greg Nanigian & Associates is a premier Sandler Training "
                 "Center helping Boston-area companies grow. Built on the Sandler "
                 "Selling System — refined over more than 50 years — our programs "
                 "change how salespeople and managers prospect, qualify and close.",
        "solutions": ["sales-training", "sales-leadership-training", "customer-success-training", "assessments"],
        "body": [
            ("Achieve Exceptional Results with Our Sandler Training Center",
             "We work with owners, sales leaders and their teams to build a "
             "sales culture that performs quarter after quarter — not a burst "
             "of motivation that fades after the workshop."),
            ("Tailored Sales Coaching for Every Industry",
             "Every business faces different challenges. We customise each "
             "program to your market, your sales cycle and the way your buyers "
             "make decisions."),
            ("The Essence of the Sandler Selling System",
             "Training is built on the Sandler Success Triangle — behavior, "
             "attitude and technique — and reinforced continuously, so we solve "
             "the root cause of a sales problem rather than the symptom."),
            ("Your Boston Sales Coaching Experts",
             "Our coaches bring years of real-world selling and leadership "
             "experience, and act as change partners for your team long after "
             "the first session."),
        ],
        "also": ["Braintree — 400 Washington Street, Suite 302",
                 "Needham — 163 Highland Ave., #1022",
                 "Woburn — 400 TradeCenter, Suite 5900"],
        "benefits": [
            "Proprietary resources | Tools, templates and online learning "
            "available only through Sandler.",
            "Customizable programs | Built around your goals, team structure "
            "and sales cycle.",
            "Local and global expertise | A Boston team backed by a worldwide "
            "Sandler network.",
            "Behavioral coaching | Ongoing reinforcement so new habits stick.",
        ],
        "awards": [],
    },
    {
        "title": "Sandler Minnesota",
        "urlTitle": "salespro",
        "city": "Minneapolis", "region": "MN", "country": "US",
        "address": "8401 Wayzata Boulevard, Suite 180, Minneapolis, MN 55426",
        "phone": "(952) 300-0906",
        "latitude": "44.9695", "longitude": "-93.3790",
        "tagline": "Experience Mastery in Business Development",
        "summary": "Award-winning Sandler training for sales teams and leaders "
                   "across the Twin Cities and Minnesota.",
        "intro": "Sandler Minnesota is a premier Sandler Training Center. The "
                 "Sandler Selling System is a proven method, refined through "
                 "relentless innovation over 50+ years, that has helped more "
                 "than 50,000 businesses grow.",
        "solutions": ["sales-training", "sales-leadership-training", "assessments", "coaching-consulting"],
        "body": [
            ("Promoting Excellence with Tailored Solutions",
             "From hiring assessments and online courses to on-site training "
             "and one-to-one sales coaching, every engagement is shaped around "
             "what your team needs next."),
            ("Uncover the Sandler Selling System",
             "At the core is the BAT triangle — Behavior, Attitude and "
             "Technique. Lasting results come from all three working together, "
             "not from scripts or tactics alone."),
            ("The Driving Force Behind Sandler Minnesota",
             "Our team combines deep business development experience with local "
             "knowledge of the Minnesota market and the industries that drive it."),
        ],
        "also": [],
        "benefits": [
            "Strategies Adaptable Across All Industries | The same proven system "
            "works for manufacturers, professional services and technology firms.",
            "Customized Training Solutions | Programs built around your people "
            "and your goals.",
            "Continuous Reinforcement | Ongoing sessions so skills are used, "
            "not forgotten.",
            "Local Insight with Global Resources | A Minneapolis team with the "
            "full Sandler network behind it.",
        ],
        "awards": ["Sandler Pinnacle Award", "Sandler Top Training 2025",
                   "Franchisee Excellence Award (FBR)",
                   "Sandler Certified Instructor",
                   "Extended DISC Certification", "Talogy Caliper Certified"],
    },
    {
        "title": "Robin Singh | Sandler, Mississauga",
        "urlTitle": "singh",
        "city": "Mississauga", "region": "ON", "country": "CA",
        "address": "77 City Centre Drive, East Tower, Suite 501, Mississauga, ON L5B 1M5",
        "phone": "(647) 988-1037",
        "latitude": "43.5930", "longitude": "-79.6420",
        "tagline": "Empowering Local Enterprises With Advanced Sales Resources",
        "summary": "Sandler sales and leadership training for businesses across "
                   "Mississauga and the Greater Toronto Area.",
        "intro": "Robin Singh | Sandler, Mississauga is committed to sales "
                 "excellence that goes beyond conventional training — giving "
                 "local companies the methodology, coaching and reinforcement to "
                 "grow revenue predictably.",
        "solutions": ["sales-training", "sales-leadership-training", "customer-success-training", "assessments"],
        "body": [
            ("Custom Sales Training for Businesses of All Kinds",
             "Whether you are a growing company making your first sales hires "
             "or an established team, programs are adapted to your industry "
             "and the way your customers buy."),
            ("Explore the Sandler Selling System",
             "The BAT framework — Behavior, Attitude, Technique — is the "
             "foundation, with ongoing reinforcement so new skills hold up in "
             "real conversations."),
            ("Meet Your Mississauga Sales Coaches",
             "Seasoned sales professionals with local market expertise, who "
             "coach your team on the deals they are working today."),
        ],
        "also": [],
        "benefits": [
            "Customizable solutions | Training designed around your market "
            "and team.",
            "Ongoing support | Reinforcement and coaching after every session.",
            "Local expertise | Coaches who know the Mississauga and GTA market.",
            "The BAT approach | Behavior, attitude and technique, together.",
        ],
        "awards": [],
    },
    {
        "title": "GTM Performance Ltd",
        "urlTitle": "londoncity",
        "city": "London", "region": "Greater London", "country": "GB",
        "address": "Worklife Suite, 20 Red Lion House, Holborn, London WC1R 4PQ",
        "phone": "020 3105 0266",
        "latitude": "51.5194", "longitude": "-0.1175",
        "tagline": "The Trusted Solution for Coaching, Sales Courses, & More",
        "summary": "Sandler training and coaching for sales teams in the City "
                   "of London and across the UK.",
        "intro": "In one of the most competitive markets in the world, GTM "
                 "Performance brings the Sandler approach to London businesses "
                 "with personalised training, coaching and sales courses.",
        "solutions": ["sales-training", "sales-leadership-training", "customer-success-training", "assessments"],
        "body": [
            ("Tailored Solutions for Every Business",
             "Assessments, online courses and coaching, combined to suit "
             "organisations of every size — from founder-led start-ups to "
             "enterprise sales teams."),
            ("How The Sandler Selling System Stands Out",
             "A proprietary methodology focused on behavior, attitude and "
             "technique, with continuous reinforcement instead of a one-off "
             "event."),
            ("Meet Our Team of Experienced Sales Coaches",
             "Experienced sales professionals who provide a personalised "
             "learning experience for every participant."),
        ],
        "also": [],
        "benefits": [
            "Proven methodology | More than 50 years of refinement.",
            "Learning paths | Structured programs for every role on the team.",
            "Multiple delivery formats | In person in Holborn, live online, "
            "or blended.",
            "Local support | A London team you can call on between sessions.",
        ],
        "awards": [],
    },
    {
        "title": "Cora Growth Partners, LLC",
        "urlTitle": "cora",
        "city": "Irvine", "region": "CA", "country": "US",
        "address": "1711 Cassidy Street, Irvine, CA 92612",
        "phone": "(760) 707-4633",
        "latitude": "33.6600", "longitude": "-117.8450",
        "tagline": "Practical Sales Coaching Designed for Real-World Results",
        "summary": "Sandler sales and leadership training for Orange County "
                   "businesses, from Irvine.",
        "intro": "Cora Growth Partners helps Irvine and Orange County companies "
                 "build sales teams that perform consistently, with programs "
                 "shaped around how each organisation actually sells.",
        "solutions": ["sales-training", "sales-leadership-training", "customer-success-training", "assessments"],
        "body": [
            ("Customized Sales Development Built Around Your Goals",
             "Programs adapt to your organisation's structure and goals rather "
             "than forcing a rigid, one-size-fits-all model."),
            ("A Proven System That Builds Confidence & Consistency",
             "The Sandler Success Triangle strengthens behavior, attitude and "
             "technique together, so skills hold up in real conversations."),
            ("Experienced Coaches Who Understand Today's Sales Challenges",
             "Coaches bring real-world selling experience and use it to create "
             "lasting change in how your team works."),
        ],
        "also": [],
        "benefits": [
            "Time-Tested Sales Methodologies | Built on decades of research "
            "across diverse industries.",
            "Adaptable Training Solutions | Programs adjusted to your "
            "organisation's specific challenges.",
            "Continuous Reinforcement | Ongoing coaching turns knowledge into "
            "daily habits.",
            "Local Support with Global Insight | Personal attention, backed by "
            "the international Sandler network.",
        ],
        "awards": ["Extended DISC Certified"],
    },
    {
        "title": "Sandler by Wilcox & Associates",
        "urlTitle": "wilcox",
        "city": "Fort Wayne", "region": "IN", "country": "US",
        "address": "1625 Magnavox Way, Suite A, Fort Wayne, IN 46804",
        "phone": "(260) 399-5913",
        "latitude": "41.0490", "longitude": "-85.2240",
        "tagline": "Grow Your People. Strengthen Your Organization. Accelerate Results.",
        "summary": "Sandler training for businesses across Indiana, Illinois "
                   "and North Carolina, from offices in Fort Wayne, "
                   "Springfield and Cornelius.",
        "intro": "Experience exponential sales growth by partnering with "
                 "Sandler by Wilcox & Associates. Every engagement starts by "
                 "diagnosing the root cause, before recommending any training.",
        "solutions": ["sales-training", "sales-leadership-training", "customer-success-training", "assessments"],
        "body": [
            ("Performance Improvement Starts With the Right Diagnosis",
             "We identify what is really holding performance back before "
             "recommending a solution."),
            ("Tailor-Made Solutions for Every Business",
             "Online courses, on-site training, assessments and coaching, "
             "combined around each client's needs."),
            ("The Sandler Selling System Is Our Core Training Philosophy",
             "Training centres on behavior, attitude and technique through the "
             "Sandler Success Triangle."),
            ("Seasoned Sales Coaches in Indiana, Illinois & North Carolina",
             "Experienced mentors give practical, industry-specific guidance, "
             "not just theory."),
        ],
        "also": ["Springfield, IL — 3555 Ogden Rd., Suite B · (217) 595-1602",
                 "Cornelius, NC · (704) 561-1201"],
        "benefits": [
            "Steadfast support | Sales coaching for consistent excellence.",
            "A unique methodology | Business development that suits your needs.",
            "Customized programs | Sales training for every level of scale.",
            "Global and local | International perspective with local industry "
            "insight.",
        ],
        "awards": ["Sandler Top Training 2025", "2025 Culture Award",
                   "Selling Power 2024", "Top 20 Sales Training 2024",
                   "Sandler Essentials", "Extended DISC"],
    },
    {
        "title": "The Ruby Group LLC",
        "urlTitle": "therubygroup",
        "city": "Akron", "region": "OH", "country": "US",
        "address": "3480 West Market Street, Suite 102, Akron, OH 44333",
        "phone": "(330) 929-9449",
        "latitude": "41.1470", "longitude": "-81.6310",
        "tagline": "Sales Training Designed to Change Behavior — Not Just Teach Theory",
        "summary": "Sandler sales, customer service and leadership training "
                   "across Akron & Columbus, OH, Jacksonville, FL and the "
                   "Capital Region, NY.",
        "intro": "Proudly evolving sales teams across Akron & Columbus, OH, "
                 "Jacksonville, FL, and the Capital Region, NY. The Ruby Group "
                 "is a partner in sales growth — practical, real-world programs "
                 "designed to change behavior and reinforce long-term success.",
        "solutions": ["sales-training", "sales-leadership-training",
                      "sales-management-training", "customer-success-training",
                      "assessments", "online-training", "certification",
                      "coaching-consulting", "channel-sales-series",
                      "sales-training-boot-camp",
                      "end-of-the-year-goals-workshop-series",
                      "sandler-reinforcement-services"],
        "body": [
            ("Crafting Success with Precision and Passion",
             "Programs are tailored to your goals, challenges and industry, "
             "using hiring assessments, online courses, on-site training and "
             "sales coaching."),
            ("Unlocking Your Potential with the Sandler Selling System",
             "Training is anchored in the BAT triangle — behavior, attitude and "
             "technique — and delivered as a continuous partnership, not a "
             "one-off seminar."),
            ("The Architects of Success at The Ruby Group LLC",
             "Coaches are seasoned business development practitioners, backed "
             "by the global Sandler network."),
        ],
        "also": ["Albany, NY (Capital Region) · (330) 929-9449",
                 "Jacksonville, FL · (904) 646-1900",
                 "Worthington, OH · (614) 324-6666"],
        "benefits": [
            "An Adaptable Methodology for Diverse Industries | One proven system, "
            "applied to your market.",
            "Customized Solutions for Every Business Size | From first sales "
            "hire to enterprise teams.",
            "Unwavering Support for Continuous Improvement | Reinforcement long "
            "after the first session.",
            "Local Insight with a Global Outlook | Ohio, Florida and New York "
            "teams with worldwide resources.",
        ],
        "awards": [],
    },
]


def center_body(center):
    """StoryBlock body for a center page: its sections, plus other offices."""
    nodes = []
    for heading, text in center["body"]:
        nodes += [h(2, heading), p(text)]
    if center["also"]:
        nodes += [h(2, f"Other {center['title']} locations"), ul(center["also"])]
    return ns.doc(nodes)


def create_centers():
    for c in CENTERS:
        create("TrainingCenter", title=c["title"], urlTitle=c["urlTitle"],
               city=c["city"], region=c["region"], country=c["country"],
               address=c["address"], phone=c["phone"], latitude=c["latitude"],
               longitude=c["longitude"], headline=f"Sales Training in {c['city']}",
               tagline=c["tagline"],
               summary=c["summary"], intro=c["intro"],
               solutions=",".join(c["solutions"]), body=center_body(c),
               benefits="\n".join(c["benefits"]), awards="\n".join(c["awards"]))


# --------------------------------------------------------------------------
# Articles
# --------------------------------------------------------------------------

ARTICLES = [
    # Deliberately short (41 words): used to demo Smartcat on a free plan's
    # word allowance.
    ("Ask Better Questions", "ask-better-questions", "Sales Process",
     "2026-09-27 09:00:00",
     "Great discovery starts with curiosity, not a pitch.",
     [h(2, "Listen first"),
      p("Prospects buy when they feel understood. Ask about the problem, its "
        "cost and who decides, then stop talking."),
      p("Your next question should come from their last answer.")]),
    ("7 Essential Goal-Setting Strategies for Sales Professionals",
     "goal-setting-strategies-for-sales-professionals", "Goal Setting",
     "2026-01-12 09:00:00",
     "A revenue number is not a plan. Here's how top performers turn an annual "
     "target into weekly behaviors they actually control.",
     [p("Every January, sales teams get a number. Most salespeople write it "
        "down, maybe divide it by twelve, and hope. The ones who hit it do "
        "something different: they turn the outcome they can't control into "
        "behaviors they can."),
      h(2, "1. Start with your personal goals, not the company's"),
      p("Quota is a company goal. The reason you'll make the extra call on a "
        "Friday afternoon is personal — a house, tuition, a trip. Write that "
        "down first. It's the fuel for everything else."),
      h(2, "2. Work backwards to activity"),
      p("If you need twelve new clients and you close one in four qualified "
        "opportunities, you need 48 opportunities. If one in five first "
        "meetings qualifies, that's 240 meetings. Now you have a weekly number "
        "you can act on."),
      h(2, "3. Build a behavior plan you can see every day"),
      ul(["Dials and emails per day", "First meetings booked per week",
          "Referral conversations per month",
          "Time blocked for prospecting, protected like a client meeting"]),
      h(2, "4. Review weekly, not quarterly"),
      p("By the time a quarterly review tells you you're behind, it's too late "
        "to fix. A 15-minute weekly check against your behavior plan tells you "
        "on Monday what to change."),
      h(2, "5–7. Share it, reward it, adjust it"),
      p("Tell your manager or a peer what you've committed to. Celebrate the "
        "behavior, not just the closed deal. And when your ratios change, "
        "change the plan — the goal stays, the math moves.")]),
    ("Navigating the AI Revolution in Sales",
     "navigating-the-ai-revolution", "Sales Process", "2026-06-03 09:00:00",
     "AI can research an account in seconds. It can't earn a buyer's trust. "
     "Where the new tools help — and where the fundamentals matter more than ever.",
     [p("Every sales team we work with is asking the same question: what "
        "should we hand to AI, and what should stay human?"),
      h(2, "Let AI do the preparation"),
      p("Account research, call summaries, first-draft follow-ups and CRM "
        "hygiene are exactly the tasks that eat selling time. Automating them "
        "gives salespeople back hours every week."),
      h(2, "Keep the conversation human"),
      p("Buyers can tell when they're being processed. The moments that decide "
        "a deal — uncovering the real pain, talking honestly about budget, "
        "agreeing on how a decision gets made — depend on trust, and trust is "
        "built person to person."),
      h(2, "The fundamentals are now the differentiator"),
      p("When every competitor has the same tools, the difference is the "
        "salesperson. Teams that can qualify, communicate and follow a clear "
        "process will get more from AI, not less, because they know what to "
        "ask it for.")]),
    ("Five Common Mistakes to Avoid When Breaking the News About a Price Increase",
     "price-increase-mistakes-to-avoid", "Customer Relationships",
     "2026-04-21 09:00:00",
     "Price increases don't lose clients. The way they're communicated does. "
     "Five mistakes we see again and again — and what to do instead.",
     [p("Costs go up and prices have to follow. Handled well, a price increase "
        "is a routine business conversation. Handled badly, it invites a "
        "competitor to the table."),
      h(2, "1. Hiding it in an invoice"),
      p("Clients should never discover an increase. Tell them first, in a "
        "conversation, with enough notice to plan."),
      h(2, "2. Apologizing for it"),
      p("Over-apologizing signals the price isn't justified. Be clear, calm "
        "and matter-of-fact."),
      h(2, "3. Leading with the number"),
      p("Start with what the client has achieved with you and what's coming "
        "next. Then the number."),
      h(2, "4. Negotiating against yourself"),
      p("Offering a discount before the client has even reacted teaches them "
        "that every increase is negotiable."),
      h(2, "5. Treating every account the same"),
      p("Your most strategic accounts deserve a personal conversation, not a "
        "form letter. Segment, and plan the conversation for each group.")]),
    ("Why \"Just Checking In\" Is Killing Your Follow-Up",
     "just-checking-in-follow-up", "Prospecting", "2026-08-18 09:00:00",
     "If your follow-up email could be sent to any prospect, it will be "
     "ignored by all of them. How to follow up with a reason.",
     [p("\"Just checking in\" is the most common follow-up line in sales, and "
        "the easiest to ignore. It asks the prospect to do the work of "
        "remembering why they should care."),
      h(2, "Agree on the next step before you hang up"),
      p("The best follow-up is one the prospect already agreed to. End every "
        "call with a clear, mutual next step — who does what, by when."),
      h(2, "Bring something new"),
      p("A relevant insight, a question about something they told you, or a "
        "short case study from a similar company gives them a reason to reply."),
      h(2, "Give them permission to say no"),
      p("\"If this isn't a priority any more, it's fine to tell me\" gets more "
        "replies than a fourth reminder — and a clear no is worth more than a "
        "maybe that never closes.")]),
]


def create_articles():
    for title, slug, category, date, teaser, nodes in ARTICLES:
        create("SandlerArticle", title=title, urlTitle=slug, category=category,
               publishDate=date, teaser=teaser, body=ns.doc(nodes))


# --------------------------------------------------------------------------
# Pages
# --------------------------------------------------------------------------

LOCAL_FALLBACK = ("Sandler is delivered through a network of locally owned "
                  "training centers. Choose yours to see the programs it runs "
                  "and who to talk to.")

AWARDS = [
    "Training Industry | Top 20 Sales Training Company, 2025",
    "Training Industry | Top 20 Sales Training Company, 2024",
    "Selling Power | Top Sales Training Companies, 2024",
    "Selling Power | Top 25 Virtual Sales Training, 2023 & 2022",
]
AWARD_BADGE = "Top-20-2025-Company-Logo.png"

STATS = [
    "50+ | Years helping sales teams grow",
    "50,000+ | Businesses trained",
    "Millions | Sales professionals coached",
    "Local | Training centers near you",
]

# Published on sandler.com's "Our Impact" section.
IMPACT = [
    "400+ | Sales leaders in our network",
    "500k~ | Hours of training around the globe each year",
    "50% | More salespeople hit quotas than those without Sandler",
    "88% | Of salespeople said their sales strategy improved",
    "96% | Of clients polled would recommend Sandler",
]

TRIANGLE = [
    "Build Better Habits | Behavior: consistent daily actions — prospecting "
    "time, pre-call planning, honest debriefs — turn good intentions into a "
    "predictable pipeline.",
    "Reinforce Positive Beliefs | Attitude: how salespeople see themselves, "
    "their buyers and their role decides whether new skills get used under "
    "pressure.",
    "Execute Innovative Strategies | Technique: a clear, repeatable process "
    "for qualifying, presenting and closing that works in any market.",
]


def build_pages(tpl):
    home = ns.page(SITE_ID, "Sales Training & Business Development | Sandler", "/", tpl)
    fill(home, [
        hero("Ready to Evolve Your Sales Approach?",
             "For more than 50 years, Sandler has helped sales teams replace "
             "pressure tactics with a repeatable, buyer-respecting system — "
             "and the habits to use it every day.",
             eyebrow="Sales training for the way buyers buy now", size="large",
             primary=("Find Your Training Center", "/locations"),
             secondary=("Let's Connect", "/contact")),
        grid("Home — challenges", "split", [
            "Finding and Closing Enough Profitable Deals | Pipelines look full "
            "until the quarter closes. Learn to qualify hard and early, so time "
            "goes to deals that will actually close.",
            "Helping Prospects Navigate the Buying Journey | Buyers are "
            "overwhelmed, not uninterested. Lead a clear, mutual process "
            "instead of chasing.",
            "Eroding Margins with Discounts and Concessions | When price is "
            "the only lever, margins pay for it. Establish value and budget "
            "before a proposal ever goes out.",
        ], eyebrow="Sound familiar?",
           heading="The challenges that keep sales leaders up at night",
           image_file="Footer-min.png"),
        grid("Home — our impact", "stats", IMPACT, eyebrow="Our Impact"),
        text_block("Home — intro", [
            h(2, "Sales Training and Business Development with Sandler"),
            h(3, "Elevating sales performance for lasting success"),
            p("For more than 50 years, Sandler has partnered with businesses of "
              "every size to build sales teams that perform quarter after "
              "quarter. The Sandler Selling System is not a quick fix. It is a "
              "transformative approach that focuses on sustainable results — "
              "changing how your people prospect, qualify, present and close."),
            p("Training is delivered by locally owned Sandler centers, in person "
              "and online, and reinforced over months rather than crammed into "
              "a single workshop."),
        ]),
        grid("Home — Success Triangle", "triangle", TRIANGLE,
             eyebrow="The Sandler Difference",
             heading="Empowered more than 50,000 businesses and millions of "
                     "sales professionals",
             intro="Sandler is a behavioral change system, not a one-time "
                   "event. Lasting results come from three things working "
                   "together — the Sandler Success Triangle.",
             theme="muted", cta=("Discover the Sandler Difference", "/about")),
        local_center("Home — local center", "Your local Sandler team", LOCAL_FALLBACK),
        grid("Home — awards", "awards", AWARDS, heading="Recognized by the industry",
             image_file=AWARD_BADGE),
        create("SandlerArticleList", title="Home — latest articles",
               heading="Insights for sales professionals", limit="3",
               ctaText="Browse all resources", ctaLink="/articles"),
    ])

    programs = ns.page(SITE_ID, "Sales Training Programs | Sandler", "/programs", tpl)
    fill(programs, [
        hero("Sales training built for how your team actually sells",
             "From a first sales hire to a global enterprise team, every "
             "Sandler program is built on the same proven system and tailored "
             "to your market.",
             eyebrow="Solutions", primary=("Talk to a Local Center", "/contact")),
        grid("Programs — catalog", "cards", [
            "Sandler Selling System | The foundation: a clear, repeatable "
            "process for qualifying, presenting and closing without pressure. "
            "| /contact",
            "Sales Management Training | Coach, hold accountable and grow the "
            "team you have — instead of doing the selling for them. | /contact",
            "Prospecting & Business Development | Build a pipeline you can "
            "count on with a weekly behavior plan and messaging that earns "
            "replies. | /contact",
            "Negotiation & Pricing | Protect margin by establishing value and "
            "budget early, and handle concessions with a plan. | /contact",
            "Enterprise & Key Account Selling | Navigate complex, multi-"
            "stakeholder deals and grow strategic accounts. | /contact",
            "Leadership Development | Develop the managers and executives who "
            "set the standard for everyone else. | /contact",
            "Customer Service & Account Management | Turn every client "
            "conversation into retention and expansion. | /contact",
            "Assessments & Sales Kickoffs | Benchmark your team, then launch "
            "the year with a kickoff that changes behavior. | /contact",
        ], eyebrow="What we teach", heading="Programs for every role on the team"),
        grid("Programs — how it works", "numbered", [
            "Assess | We start by understanding your market, your team and "
            "where deals are stalling today.",
            "Design | Your local center tailors a program to your goals, sales "
            "cycle and team structure.",
            "Train | Live, interactive sessions — in person or virtual — with "
            "role-play on your real deals.",
            "Reinforce | Ongoing coaching and accountability so new behaviors "
            "stick long after the first session.",
        ], eyebrow="How it works", heading="Training that sticks", theme="muted"),
        local_center("Programs — local center", "Programs near you", LOCAL_FALLBACK),
    ])

    about = ns.page(SITE_ID, "The Sandler Difference | Sandler", "/about", tpl)
    fill(about, [
        hero("The Sandler Difference",
             "A behavioral change system, not a one-time event.",
             eyebrow="About Sandler",
             primary=("Find Your Training Center", "/locations")),
        text_block("About — story", [
            h(2, "Sales training that respects the buyer"),
            p("David H. Sandler founded Sandler in 1967 on a simple observation: "
              "traditional selling made buyers defensive and salespeople "
              "miserable. He built a system around honest, two-way "
              "conversations in which both sides can say no — and in which "
              "salespeople spend their time on buyers who can say yes."),
            p("Today Sandler is headquartered in Owings Mills, Maryland, and "
              "delivered through a worldwide network of locally owned training "
              "centers. The system has been refined across more than five "
              "decades, but the principle is the same."),
        ]),
        grid("About — Success Triangle", "triangle", TRIANGLE,
             eyebrow="The Sandler Success Triangle",
             heading="Behavior, attitude and technique — together",
             theme="muted"),
        grid("About — stats", "stats", STATS, theme="dark"),
        grid("About — awards", "awards", AWARDS, heading="Recognized by the industry",
             image_file=AWARD_BADGE),
    ])

    locations = ns.page(SITE_ID, "Find Your Training Center | Sandler", "/locations", tpl)
    fill(locations, [
        hero("Find Your Training Center",
             "Sandler programs are delivered by locally owned centers who know "
             "your market. Pick yours and we'll remember it across the site.",
             eyebrow="Locations"),
        create("SandlerCenterDirectory", title="Locations — directory",
               heading="Sandler locations worldwide",
               intro="More than 200 locally owned offices. Search by ZIP code or "
                     "city, or zoom into the map.",
               searchModes="radius,region", radiusOptions="25,50,100,250",
               defaultRadius="50", distanceUnit="mi", demoLocation="New York, NY"),
    ])

    articles = ns.page(SITE_ID, "Resources | Sandler", "/articles", tpl)
    fill(articles, [
        hero("Resources for sales professionals",
             "Practical advice on prospecting, qualifying, negotiating and "
             "leading a sales team — from the Sandler network.",
             eyebrow="Insights"),
        create("SandlerArticleList", title="Resources — all articles",
               heading="Latest articles", limit="12"),
    ])

    contact = ns.page(SITE_ID, "Let's Connect | Sandler", "/contact", tpl)
    fill(contact, [
        hero("Let's Connect",
             "Every Sandler engagement starts with a conversation with your "
             "local training center.",
             eyebrow="Contact"),
        local_center("Contact — local center", "Your training center",
                     "Choose a training center and we'll show you how to "
                     "reach them directly."),
        text_block("Contact — headquarters", [
            h(2, "Sandler headquarters"),
            p("Sandler Systems, LLC · 300 Red Brook Blvd, Suite 10, Owings "
              "Mills, MD 21117"),
            p("For training enquiries, your local center is the fastest way "
              "to get an answer."),
        ]),
    ])
    return home


CENTER_CHALLENGES = [
    "Finding and Closing Enough Profitable Deals | Qualify hard and early, so "
    "time goes to deals that will actually close.",
    "Helping Prospects Navigate the Buying Journey | Lead a clear, mutual "
    "process instead of chasing.",
    "Eroding Margins with Discounts and Concessions | Establish value and "
    "budget before a proposal goes out.",
    "Finding and Keeping Top Talent | Hire for the behaviors that predict "
    "success, then develop them.",
]

CENTER_NEXT_STEPS = [
    "Crash a Class | Join a complimentary Sandler session and see the "
    "methodology in action. | ~/events",
    "Read Articles | Practical advice on prospecting, qualifying and leading "
    "a sales team. | /articles",
    "View All Events | Workshops, webinars and open programs near you. "
    "| ~/events",
]


def center_shared_sections():
    return [
        ("1", [grid("Center detail — challenges", "numbered", CENTER_CHALLENGES,
                    eyebrow="Start Solving Challenges",
                    heading="What's holding your sales team back?",
                    theme="muted")]),
        ("2", [grid("Center detail — next steps", "cards", CENTER_NEXT_STEPS,
                    heading="Experience Sandler for yourself")]),
    ]


# --------------------------------------------------------------------------
# Center subpages — one shared set of dotCMS pages under /center-pages/,
# served by the frontend under every center: /locations/{center}/{page}.
# As on go.sandler.com, the copy is shared; the center's own details come
# from its TrainingCenter content. Links starting "~/" resolve to the
# current center (e.g. "~/contact-us" -> /locations/minnesota/contact-us).
# Headings follow go.sandler.com's center subpages; body copy is written
# for the demo.
# --------------------------------------------------------------------------

CENTER_PAGES_FOLDER = "/center-pages"


def create_event_types():
    create_type("SandlerEventList", "Sandler Event List",
                "Upcoming events for the current training center", [
        site_field(),
        field("ImmutableTextField", "Internal name", "title", required=True, listed=True),
        field("ImmutableTextField", "Heading", "heading"),
        field("ImmutableTextAreaField", "Text when there are no events", "emptyText"),
    ], icon="event")
    create_type("SandlerEvent", "Sandler Event",
                "A workshop, class or webinar run by a training center", [
        site_field(),
        field("ImmutableTextField", "Title", "title", required=True, listed=True),
        {"clazz": F + "ImmutableRelationshipField", "name": "Training center",
         "variable": "center", "required": True, "indexed": True, "searchable": True,
         # 3 = many-to-one: each event belongs to one center.
         "relationships": {"cardinality": 3, "velocityVar": "TrainingCenter",
                           "isParentField": True}},
        field("ImmutableDateTimeField", "Starts", "startDate", required=True, listed=True),
        field("ImmutableSelectField", "Format", "format", required=True,
              values="Online|Online\r\nIn person|In person\r\nHybrid|Hybrid"),
        field("ImmutableTextField", "Venue", "venue", hint="Leave empty for online events"),
        field("ImmutableTextAreaField", "Summary", "summary"),
    ], icon="event")


# Sample events for the demo — go.sandler.com's center calendars list no
# events at the moment, so these are illustrative, not real bookings.
EVENTS = {
    "gnatraining-downtown-boston": [
        ("Crash a Class: Sandler Selling System Fundamentals", "2026-10-08 12:00:00",
         "Online", "", "A complimentary live session on the core of the Sandler "
         "Selling System — see how the methodology works before you commit."),
        ("Sales Leadership Roundtable", "2026-10-22 08:00:00", "In person",
         "53 State Street, Suite 500, Boston", "A breakfast discussion for sales "
         "managers on coaching, accountability and hiring."),
        ("Prospecting Bootcamp", "2026-11-12 09:00:00", "In person",
         "400 Washington Street, Suite 302, Braintree", "A half-day workshop on "
         "building a weekly prospecting plan you will actually follow."),
    ],
    "salespro": [
        ("Crash a Class: Up-Front Contracts", "2026-10-06 11:30:00", "Online",
         "", "Learn how to set a clear agenda and outcome for every sales "
         "conversation."),
        ("Negotiating Without Discounting", "2026-10-29 08:30:00", "In person",
         "8401 Wayzata Boulevard, Suite 180, Minneapolis", "Protect margin by "
         "establishing value and budget before a proposal goes out."),
        ("Sales Leadership Roundtable", "2026-11-19 08:00:00", "Hybrid",
         "8401 Wayzata Boulevard, Suite 180, Minneapolis", "Twin Cities sales "
         "leaders compare notes on building a coaching culture."),
    ],
    "singh": [
        ("Crash a Class: Qualifying Without Pressure", "2026-10-14 12:00:00",
         "Online", "", "A complimentary session on uncovering pain, budget and "
         "decision process — without sounding like an interrogation."),
        ("Customer Success Workshop", "2026-11-05 09:00:00", "In person",
         "77 City Centre Drive, East Tower, Suite 501, Mississauga",
         "Turn account conversations into retention, referrals and expansion."),
    ],
    "cora": [
        ("Crash a Class: Sandler Selling System Fundamentals", "2026-10-15 11:00:00",
         "Online", "", "A complimentary live session on the core of the "
         "Sandler approach, run from Irvine."),
        ("Sales Leadership Breakfast", "2026-11-10 08:00:00", "In person",
         "1711 Cassidy Street, Irvine", "Orange County sales leaders on "
         "coaching, accountability and hiring."),
    ],
    "therubygroup": [
        ("Sales Training Boot Camp", "2026-10-21 09:00:00", "In person",
         "3480 West Market Street, Suite 102, Akron", "Two days to review your "
         "sales system, refresh your skills and sharpen your qualifying."),
        ("Crash a Class: Up-Front Contracts", "2026-11-04 12:00:00", "Online",
         "", "A complimentary session on setting a clear agenda for every "
         "sales conversation."),
    ],
    "wilcox": [
        ("Crash a Class: Diagnosing Sales Performance", "2026-10-20 12:00:00",
         "Online", "", "Why the right diagnosis comes before any training "
         "plan."),
        ("Customer Success Workshop", "2026-11-17 09:00:00", "In person",
         "1625 Magnavox Way, Suite A, Fort Wayne", "Turn account "
         "conversations into retention, referrals and expansion."),
    ],
    "londoncity": [
        ("Crash a Class: The Sandler Selling System", "2026-10-13 12:30:00",
         "Online", "", "A live introduction to the Sandler approach, run from "
         "London for UK and European teams."),
        ("Leadership for Organisational Excellence Briefing", "2026-11-03 08:30:00",
         "In person", "Worklife Suite, 20 Red Lion House, Holborn",
         "A morning briefing for sales directors on leading high-performing teams."),
        ("Prospecting Masterclass", "2026-12-01 09:30:00", "Hybrid",
         "Worklife Suite, 20 Red Lion House, Holborn", "Build a pipeline you "
         "can count on with a behaviour plan and messaging that earns replies."),
    ],
}


def create_events():
    # Centers were just created; the search index can take a few seconds.
    for _ in range(30):
        centers = {c["urlTitle"]: c["identifier"] for c in ns.api(
            "POST", "/api/content/_search",
            {"query": f"+contentType:TrainingCenter +conHost:{SITE_ID} +live:true",
             "limit": 100})["entity"]["jsonObjectView"]["contentlets"]}
        if all(slug in centers for slug in EVENTS):
            break
        time.sleep(2)
    else:
        sys.exit(f"centers not indexed yet: {sorted(set(EVENTS) - set(centers))}")
    for slug, events in EVENTS.items():
        for title, start, fmt, venue, summary in events:
            create("SandlerEvent", title=title, center=centers[slug],
                   startDate=start, format=fmt, venue=venue, summary=summary)


def center_hero(title, subtitle):
    """Center subpage hero. The frontend replaces the eyebrow with the
    current center's name and location."""
    return hero(title, subtitle, eyebrow="Sandler Training Center",
                primary=("Let's Connect", "~/contact-us"))


def local(title, heading):
    return local_center(title, heading, LOCAL_FALLBACK)


def build_center_pages(tpl):
    ns.create_folders(SITE, [CENTER_PAGES_FOLDER, f"{CENTER_PAGES_FOLDER}/solutions",
                             f"{CENTER_PAGES_FOLDER}/solutions/sales-training",
                             f"{CENTER_PAGES_FOLDER}/solutions/sales-leadership-training",
                             f"{CENTER_PAGES_FOLDER}/solutions/customer-success-training",
                             f"{CENTER_PAGES_FOLDER}/solutions/assessments",
                             f"{CENTER_PAGES_FOLDER}/solutions/coaching-consulting",
                             f"{CENTER_PAGES_FOLDER}/about-us",
                             f"{CENTER_PAGES_FOLDER}/events",
                             f"{CENTER_PAGES_FOLDER}/contact-us"])
    S = f"{CENTER_PAGES_FOLDER}/solutions"

    fill(ns.page(SITE_ID, "Sales Training", f"{S}/sales-training", tpl), [
        center_hero("Sales Training",
                    "Improve sales skills with Sandler's proprietary methodology "
                    "— for new hires and seasoned sellers alike."),
        text_block("Sales Training — intro", [
            h(2, "Improve Sales Skills with Sandler"),
            p("Sales training is one of the most important investments a "
              "company can make in its team. Sandler's methodology gives "
              "salespeople a repeatable process for every stage of the sale."),
            h(2, "Sales Training for Your Team"),
            p("Personalised programs for salespeople at every level, delivered "
              "in person, live online or through self-paced courses."),
        ]),
        grid("Sales Training — journey", "numbered", [
            "Start with evaluation | Understand where your team is today and "
            "where deals stall.",
            "Launch with essential training | Build the foundation with the "
            "Sandler Selling System.",
            "Accelerate execution | Apply it to live deals with coaching and "
            "role-play.",
            "Continuously improve with accountability | Reinforcement that "
            "keeps new habits in place.",
        ], eyebrow="Your learning journey", heading="Sandler® Sales Training Solutions",
           theme="muted"),
        grid("Sales Training — strategies", "split", [
            "Shorten sales cycles and improve cash flow",
            "Overcome insecurities in prospecting",
            "Grow accounts with proven systems",
            "Apply a \"more, better, different\" approach to goals and plans",
        ], heading="Cutting-Edge Sales Strategies for Today's Challenges",
           intro="Techniques to close more deals and get past the obstacles "
                 "that stall them."),
        grid("Sales Training — benefits", "cards", [
            "Tailored Learning Paths | A program built around each role on "
            "the team.",
            "Access to Cutting-Edge Sales Techniques | Methods refined across "
            "more than 50 years and 50,000 companies.",
            "Enhanced Negotiation Skills | Hold price and protect margin.",
            "Building a Sales Mindset | Attitudes that hold up under pressure.",
            "Accelerated Sales Performance | Results that show in the pipeline.",
        ], heading="Achieve Your Full Potential With Sandler Sales Training",
           theme="dark"),
        local("Sales Training — local center", "Start sales training near you"),
    ])

    fill(ns.page(SITE_ID, "Sales Leadership Training",
                 f"{S}/sales-leadership-training", tpl), [
        center_hero("Sales Leadership Training",
                    "Develop the leaders who drive teams, implement strategy and "
                    "improve sales, morale and retention."),
        grid("Sales Leadership — lead your team", "split", [
            "Elevate leadership & communication skills",
            "Hire top talent",
            "Create a culture of accountability",
            "Develop a coaching mindset",
            "Accelerate performance",
        ], heading="Lead Your Team to Success",
           intro="Sales leaders need the skills and tools to become strategic "
                 "leaders in their organisations."),
        text_block("Sales Leadership — results", [
            h(2, "Sales Leadership Training That Produces Results"),
            p("Managers leave with tools and strategies to lift team "
              "performance — helping reps prioritise the right opportunities "
              "and keep the pipeline healthy."),
        ]),
        grid("Sales Leadership — invest", "cards", [
            "Multi-modal Resources | A digital learning platform with current "
            "courses, plus on-site workshops.",
            "Personalized Learning Paths | Tailored to each team's challenges "
            "and goals.",
            "Proven Training Methods | Sandler's BAT Triangle: behavior, "
            "attitude and technique.",
            "Strategies to Elevate Rep Performance | Help every rep meet and "
            "exceed target.",
            "Ongoing Support and Development | Resources for each new "
            "challenge the team faces.",
        ], heading="Invest in Professional Sales Leader Training", theme="muted"),
        local("Sales Leadership — local center", "Transform Your Sales Results"),
    ])

    fill(ns.page(SITE_ID, "Customer Success Training",
                 f"{S}/customer-success-training", tpl), [
        center_hero("Customer Success Training",
                    "Help your team get more from every customer interaction."),
        text_block("Customer Success — intro", [
            h(2, "Get the Most Out of Your Customer Interactions"),
            p("Every client conversation shapes retention and growth. Sandler "
              "gives customer-facing teams the skills to deliver an "
              "exceptional experience."),
            h(2, "Transform Your Customer Success and Service Teams"),
            p("For customer success managers, account managers and support "
              "teams: retention, cross-selling and long-term relationships."),
        ]),
        grid("Customer Success — opportunities", "split", [
            "Maximise customer lifetime value and referral business",
            "Handle resistance and concerns with confidence",
            "Use active listening and questioning to uncover real needs",
            "Build trust, rapport and long-term partnerships",
        ], heading="Transforming Interactions Into Opportunities"),
        grid("Customer Success — further", "cards", [
            "Proven strategies | Methods tested across thousands of companies.",
            "Industry-specific solutions | Adapted to your market.",
            "Enhanced communication skills | Clearer, calmer conversations.",
            "A customer-centric mindset | Every interaction adds value.",
        ], heading="Professional Training Can Take You Further", theme="muted"),
        local("Customer Success — local center", "Transform Your Customer Success Team"),
    ])

    fill(ns.page(SITE_ID, "Team Assessments", f"{S}/assessments", tpl), [
        center_hero("Team Assessments",
                    "Identify the gaps in your team's performance — and the "
                    "solutions to close them."),
        text_block("Assessments — intro", [
            h(2, "Identify Business Gaps & Gain Solutions to Close Them"),
            p("Sandler's assessments pinpoint where performance is being lost "
              "and recommend targeted improvements."),
            h(2, "Raise The Skill Level of Your Team By Benchmarking And "
                 "Driving Best Practices"),
            p("Online questionnaires analyse your organisation and turn the "
              "results into clear recommendations."),
        ]),
        grid("Assessments — grow", "split", [
            "Identify areas for improvement and development",
            "Set clear standards to evaluate and track performance",
            "Increase productivity with targeted training",
            "Use data to make better hiring decisions",
        ], heading="Assess Your Team, Boost Your Advantage",
           intro="Grow your business by:"),
        grid("Assessments — why", "cards", [
            "Unbiased Perspective | External assessments are objective.",
            "Access to Expertise | Industry-specific knowledge and solutions.",
            "Identifying Blind Spots | Find what internal reviews miss.",
            "Proven Solutions | Trusted development and coaching resources.",
            "Ongoing Support | Help that continues after the assessment.",
        ], heading="Why Professional Assessments Outperform Internal Assessments",
           theme="dark"),
        local("Assessments — local center", "Book a team assessment"),
    ])

    fill(ns.page(SITE_ID, "Coaching & Consulting", f"{S}/coaching-consulting", tpl), [
        center_hero("Coaching & Consulting",
                    "Personalised coaching and consulting, built on the Sandler "
                    "Selling System."),
        text_block("Coaching — intro", [
            h(2, "Navigate the Complexities of Sales & Leadership"),
            p("We blend coaching and consulting, drawing on more than 50 years "
              "of the Sandler Selling System and 50,000 companies."),
        ]),
        grid("Coaching — career", "split", [
            "Create sales processes that shorten cycles and improve cash flow",
            "Overcome the fear of rejection to prospect better",
            "Install a \"more, better, different\" approach to goals and plans",
            "Develop low-pressure tactics that close more sales",
        ], heading="Accelerate Your Sales Career", theme="muted"),
        grid("Coaching — consulting", "split", [
            "Define a clear vision and mission",
            "Recruit top talent with a deep understanding of each role",
            "Establish systems and processes that drive success",
            "Set measurable KPIs and success metrics",
        ], heading="Sandler Consulting for Business Leaders"),
        local("Coaching — local center",
              "We're Your Trusted Performance Improvement & Strategic Sales Partner"),
    ])

    fill(ns.page(SITE_ID, "About Us", f"{CENTER_PAGES_FOLDER}/about-us", tpl), [
        center_hero("About Us",
                    "Sales training, professional development and business "
                    "resources, delivered locally."),
        text_block("About Us — story", [
            h(2, "Sales Training, Professional Development, & Business Resources"),
            p("Sandler develops professionals and organisations through "
              "collaborative training, self-guided programs and skill-building "
              "tools refined over more than 50 years."),
            h(2, "The Sandler Selling Methodology"),
            p("David Sandler's psychology-based approach is built on mutual "
              "respect and clear decisions. It takes the pressure out of "
              "selling for both buyer and seller."),
            h(2, "Reinforcement Ensures Long-Term Success"),
            p("Support continues after training ends, so knowledge and skills "
              "last — a partnership, not an event."),
        ]),
        grid("About Us — triangle", "triangle", TRIANGLE,
             eyebrow="The Sandler Success Triangle",
             heading="Behavior, attitude and technique — together", theme="muted"),
        grid("About Us — impact", "stats", IMPACT, eyebrow="Our Impact"),
        local("About Us — local center",
              "Get Started with Expert Sales Training & Coaching"),
    ])

    fill(ns.page(SITE_ID, "Events", f"{CENTER_PAGES_FOLDER}/events", tpl), [
        center_hero("Events",
                    "Workshops, webinars and complimentary classes from your "
                    "local Sandler team."),
        create("SandlerEventList", title="Events — list", heading="Upcoming events",
               emptyText="There are no events to view at this time. Please "
                         "check back later for updates."),
        local("Events — local center", "Prefer to talk to someone first?"),
    ])

    fill(ns.page(SITE_ID, "Contact Us", f"{CENTER_PAGES_FOLDER}/contact-us", tpl), [
        hero("Contact Us",
             "Every Sandler engagement starts with a conversation with your "
             "local team.", eyebrow="Sandler Training Center"),
        local("Contact Us — center", "Talk to your local Sandler team"),
        text_block("Contact Us — next steps", [
            h(2, "What happens next"),
            p("A member of the local team will get back to you to understand "
              "your goals, your team and where deals are stalling today — "
              "then recommend where to start."),
        ]),
    ])


def set_menu():
    """DotNavigation lists only folders with showOnMenu. `name` must be left
    out of the payload, or dotCMS treats it as a rename and rejects it."""
    for order, (folder, title, show) in enumerate(MENU, start=1):
        # Folders created moments ago may not be ready yet; retry briefly.
        for _ in range(10):
            resp = ns.api("PUT", "/api/v1/assets/folders", {
                "assetPath": f"//{SITE}/{folder}/",
                "data": {"title": title, "showOnMenu": show, "sortOrder": order}})
            if isinstance(resp, dict) and resp.get("entity"):
                break
            time.sleep(2)
        else:
            print(f"  ! menu {folder}: {str(resp)[:200]}")


# --------------------------------------------------------------------------
# HubSpot form widget — a dotCMS Widget type holding a HubSpot form's IDs and
# presentation. The Next.js frontend renders it as a Sandler-styled form that
# submits to HubSpot's Forms API; widgetCode is HubSpot's standard embed, so
# the same widget also works on Velocity-rendered pages.
# --------------------------------------------------------------------------

HUBSPOT_EMBED = """<script src="https://js.hsforms.net/forms/embed/$!{portalId}.js" defer></script>
<div class="hs-form-frame" data-region="$!{region}" data-form-id="$!{formId}" data-portal-id="$!{portalId}"></div>"""

HUBSPOT_FIELDS = "\n".join([
    "firstname | First name | text | required",
    "lastname | Last name | text | required",
    "email | Business email | email | required",
    "company | Organization name | text | required",
    "phone | Phone number | tel",
    "message | How can we help? | textarea",
])


def create_hubspot_type():
    create_type_raw({
        "clazz": "com.dotcms.contenttype.model.type.ImmutableWidgetContentType",
        "name": "HubSpot Form", "variable": "HubSpotForm",
        "description": "A HubSpot form. Submissions go straight to HubSpot.",
        "host": SITE_ID, "icon": "contact_mail", "workflow": [SYSTEM_WORKFLOW],
        "fields": [
            field("ImmutableTextField", "Widget title", "widgetTitle",
                  required=True, listed=True),
            {"clazz": F + "ImmutableHostFolderField", "name": "Site",
             "variable": "contentHost", "required": True, "indexed": True},
            {"clazz": F + "ImmutableConstantField", "name": "Widget usage",
             "variable": "widgetUsage",
             "values": "Fill in the HubSpot portal and form IDs. Field names "
                       "must be HubSpot contact property names."},
            {"clazz": F + "ImmutableConstantField", "name": "Widget code",
             "variable": "widgetCode", "values": HUBSPOT_EMBED},
            {"clazz": F + "ImmutableConstantField", "name": "Widget pre-execute",
             "variable": "widgetPreexecute", "values": ""},
            field("ImmutableTextField", "HubSpot portal ID", "portalId",
                  hint="Your HubSpot account (Hub) ID, e.g. 1234567"),
            field("ImmutableTextField", "HubSpot form ID", "formId",
                  hint="The form's GUID, from its embed code or URL"),
            field("ImmutableSelectField", "HubSpot region", "region",
                  values="North America|na1\r\nEurope|eu1"),
            field("ImmutableTextField", "Heading", "heading"),
            field("ImmutableTextAreaField", "Intro", "intro"),
            field("ImmutableTextAreaField", "Form fields", "formFields",
                  hint="One per line: HubSpot property | Label | text, email, "
                       "tel or textarea | required"),
            field("ImmutableTextField", "Training center property", "centerProperty",
                  hint="HubSpot property that receives the chosen training "
                       "center. Leave empty to add it to the message instead."),
            field("ImmutableTextField", "Button text", "submitText"),
            field("ImmutableTextAreaField", "Thank-you message", "successMessage"),
            field("ImmutableTextAreaField", "Consent text", "consentText",
                  hint="Optional. If set, visitors must tick it and it is sent "
                       "to HubSpot as consent to process."),
        ],
    })


def create_type_raw(body):
    variable = body["variable"]
    resp = ns.api("GET", f"/api/v1/contenttype/id/{variable}")
    if isinstance(resp, dict) and isinstance(resp.get("entity"), dict):
        print(f"  type {variable} exists")
        return resp["entity"]["id"]
    resp = ns.api("POST", "/api/v1/contenttype", [body])
    ent = resp.get("entity")
    if isinstance(ent, list) and ent:
        print(f"  type {variable} created")
        return ent[0]["id"]
    print(f"  ! type {variable} failed: {str(resp)[:300]}")
    return None


def hubspot_form(title, portal_id="", form_id=""):
    e = ns._entity(ns.fire({
        "contentType": "HubSpotForm", "contentHost": SITE_ID, "languageId": 1,
        "widgetTitle": title, "portalId": portal_id, "formId": form_id,
        "region": "na1",
        "heading": "Let's connect – we'll guide you to the right solution",
        "intro": "Tell us a little about your team and a local Sandler "
                 "training center will be in touch.",
        "formFields": HUBSPOT_FIELDS, "centerProperty": "",
        "submitText": "Let's Connect",
        "successMessage": "Thanks — we've received your details. A member of "
                          "your local Sandler team will be in touch shortly.",
        "consentText": "I agree to Sandler processing my details to respond "
                       "to this request.",
    }), f"hubspot form {title}")
    return e.get("identifier")


def build_connect_page(tpl):
    ns.create_folders(SITE, ["/lets-connect"])
    form = hubspot_form("Let's Connect — HubSpot form")
    fill(ns.page(SITE_ID, "Let's Connect | Sandler", "/lets-connect", tpl), [
        hero("Let's Connect",
             "Every Sandler engagement starts with a conversation. Share a few "
             "details and we'll point you to the right program and the right "
             "local team.", eyebrow="Contact"),
        form,
        local_center("Let's Connect — local center", "Prefer to call?",
                     LOCAL_FALLBACK),
    ])
    # The same form, above the contact details, on the site's contact page
    # (the header's Let's Connect button) and every center's Contact Us page.
    for path in ["/contact", "/center-pages/contact-us"]:
        page = ns.api("GET", f"/api/v1/page/json{path}?host_id={SITE_ID}")["entity"]
        slots = {}
        for container in page["containers"].values():
            for uuid, items in container["contentlets"].items():
                slots[uuid.replace("uuid-", "")] = [c["identifier"] for c in items]
        if form not in slots.get("2", []):
            slots["2"] = [form] + slots.get("2", [])
            ns.place(page["page"]["identifier"], sorted(slots.items()))


# --------------------------------------------------------------------------
# Translation with Smartcat — a dotCMS workflow for sending articles to
# Smartcat and reviewing what comes back, plus a Translation Job type that
# records each Smartcat project. The bridge that talks to Smartcat is
# frontend-sandler/scripts/smartcat.mjs; it finds the workflow's steps and
# actions by name, so nothing here is hard-coded by identifier.
# --------------------------------------------------------------------------

TRANSLATION_SCHEME = "Smartcat Translation"
# Its name before it was renamed in dotCMS; still recognised on re-runs.
OLD_TRANSLATION_SCHEMES = ["Sandler Translation"]
TRANSLATION_STEPS = ["Editing", "Queued for Smartcat", "In translation at Smartcat",
                     "Translation ready for review", "Published"]
SHOW_ALL = ["NEW", "EDITING", "LOCKED", "UNLOCKED", "PUBLISHED", "UNPUBLISHED", "LISTING"]
A = "com.dotmarketing.portlets.workflows.actionlet."


def find_role(search, key=None, name=None, workflow=False):
    url = (f"/api/v1/roles/_search?searchName={search}&per_page=50"
           + ("&includeWorkflowRoles=true" if workflow else ""))
    for r in ns.api("GET", url).get("entity") or []:
        if (key and r.get("roleKey") == key) or (name and r.get("name") == name):
            return r["id"]
    sys.exit(f"role {key or name} not found")


def create_translation_workflow():
    """Create (or complete) the translation workflow. Safe to re-run: it
    reuses the scheme and steps by name and only adds missing actions."""
    schemes = ns.api("GET", "/api/v1/workflow/schemes").get("entity") or []
    existing = next((s for s in schemes
                     if s["name"] in [TRANSLATION_SCHEME, *OLD_TRANSLATION_SCHEMES]), None)
    scheme = existing["id"] if existing else ns.api("POST", "/api/v1/workflow/schemes", {
        "schemeName": TRANSLATION_SCHEME,
        "schemeDescription": "Send content to Smartcat for translation, then "
                             "review and publish each language version.",
        "schemeArchived": False})["entity"]["id"]

    steps = {s["name"]: s["id"] for s in
             ns.api("GET", f"/api/v1/workflow/schemes/{scheme}/steps").get("entity") or []}
    for name in TRANSLATION_STEPS:
        if name not in steps:
            steps[name] = ns.api("POST", "/api/v1/workflow/steps", {
                "schemeId": scheme, "stepName": name, "stepResolved": name == "Published",
                "enableEscalation": False, "escalationAction": "", "escalationTime": "0",
            })["entity"]["id"]
    have = {a["name"]: a["id"] for a in
            ns.api("GET", f"/api/v1/workflow/schemes/{scheme}/actions").get("entity") or []}

    edit = find_role("Anyone", key="cms_workflow_any_who_can_edit", workflow=True)
    publish = find_role("Anyone", key="cms_workflow_any_who_can_publish", workflow=True)
    # Actions must name an assignee role even when nothing is assigned. Use
    # the one the System Workflow's own actions use (CMS Anonymous).
    system_actions = ns.api("GET", f"/api/v1/workflow/schemes/{SYSTEM_WORKFLOW}/actions")
    nobody = next(a["nextAssign"] for a in system_actions["entity"] if a.get("nextAssign"))

    def attach(action_id, step_names):
        for step in step_names:
            on_step = {a["id"] for a in ns.api(
                "GET", f"/api/v1/workflow/steps/{steps[step]}/actions").get("entity") or []}
            if action_id not in on_step:
                ns.api("POST", f"/api/v1/workflow/steps/{steps[step]}/actions",
                       {"actionId": action_id})

    def action(name, on_steps, next_step, actionlets, who, icon="workflowIcon"):
        if name in have:
            attach(have[name], on_steps)
            return
        a = ns.api("POST", "/api/v1/workflow/actions", {
            "schemeId": scheme, "stepId": steps[on_steps[0]], "actionName": name,
            "whoCanUse": who, "actionIcon": icon, "actionAssignable": False,
            "actionCommentable": False, "actionRoleHierarchyForAssign": False,
            "showOn": SHOW_ALL, "actionNextStep": steps.get(next_step, next_step),
            "actionNextAssign": nobody, "actionCondition": ""})
        if not isinstance(a.get("entity"), dict):
            sys.exit(f"  ! action {name}: {str(a)[:300]}")
        action_id = a["entity"]["id"]
        attach(action_id, on_steps[1:])
        for order, clazz in enumerate(actionlets):
            ns.api("POST", f"/api/v1/workflow/actions/{action_id}/actionlets",
                   {"actionletClass": A + clazz, "order": order, "parameters": {}})
        print(f"  action {name}")

    review, published = "Translation ready for review", "Published"
    # Editor actions.
    action("Save", ["Editing", review, published], "currentstep",
           ["SaveContentActionlet"], [edit], "saveIcon")
    action("Publish", ["Editing"], published,
           ["SaveContentActionlet", "PublishContentActionlet", "CheckinContentActionlet"],
           [publish], "publishIcon")
    action("Send to Smartcat", ["Editing", published], "Queued for Smartcat",
           ["CheckinContentActionlet"], [edit], "shareIcon")
    action("Publish translation", [review], published,
           ["PublishContentActionlet", "CheckinContentActionlet"], [publish], "publishIcon")
    action("Cancel translation", ["Queued for Smartcat", "In translation at Smartcat"],
           "Editing", [], [edit], "cancelIcon")
    # Bridge actions (the Smartcat script fires these by name).
    action("Mark in translation", ["Queued for Smartcat"], "In translation at Smartcat",
           [], [edit])
    action("Import translation", ["Editing"], review,
           ["SaveContentActionlet", "CheckinContentActionlet"], [edit])
    action("Mark translated", ["In translation at Smartcat"], published, [], [edit])
    print(f"  workflow {TRANSLATION_SCHEME} -> {scheme}")
    return scheme


def create_translation_job_type():
    create_type("TranslationJob", "Translation Job",
                "One Smartcat project for one piece of content. Written by the "
                "Smartcat bridge (frontend-sandler/scripts/smartcat.mjs).", [
        site_field(),
        field("ImmutableTextField", "Title", "title", required=True, listed=True),
        field("ImmutableTextField", "Content identifier", "contentId", required=True),
        field("ImmutableTextField", "Content type", "sourceType"),
        field("ImmutableTextField", "Target languages", "targetLanguages",
              hint="Smartcat language codes, comma-separated, e.g. es,fr"),
        field("ImmutableSelectField", "Status", "status", required=True, listed=True,
              values="Sent to Smartcat|sent\r\nIn translation|in-translation\r\n"
                     "Imported for review|imported\r\nFailed|failed"),
        field("ImmutableTextField", "Smartcat project ID", "smartcatProjectId"),
        field("ImmutableTextField", "Smartcat project URL", "smartcatUrl"),
        field("ImmutableTextField", "Imported languages", "importedLanguages"),
        field("ImmutableTextAreaField", "Log", "log"),
    ], icon="translate")


def enable_translation(scheme_id, type_variable="SandlerArticle"):
    """Make the translation workflow the content type's only workflow.

    It has to be the only one: content sitting in a System Workflow step only
    gets that step's actions, so "Send to Smartcat" would never appear. With
    the System Workflow removed, existing content falls back to this
    workflow's first step (Editing). Its Save/Publish actions are mapped to
    dotCMS's default system actions so API calls like fire/PUBLISH still work.
    """
    t = ns.api("GET", f"/api/v1/contenttype/id/{type_variable}")["entity"]
    if [w["id"] for w in t.get("workflows") or []] != [scheme_id]:
        t["workflow"] = [scheme_id]
        t.pop("workflows", None)
        r = ns.api("PUT", f"/api/v1/contenttype/id/{t['id']}", t)
        ok = [w["id"] for w in (r.get("entity") or {}).get("workflows") or []] == [scheme_id]
        print(f"  {type_variable} workflow -> {'ok' if ok else str(r)[:200]}")
    actions = {a["name"]: a["id"] for a in
               ns.api("GET", f"/api/v1/workflow/schemes/{scheme_id}/actions")["entity"]}
    for system_action, name in [("NEW", "Save"), ("EDIT", "Save"), ("PUBLISH", "Publish")]:
        r = ns.api("PUT", "/api/v1/workflow/system/actions", {
            "actionId": actions[name], "schemeId": scheme_id, "systemAction": system_action})
        if not r.get("entity"):
            print(f"  ! system action {system_action}: {str(r)[:200]}")


# --------------------------------------------------------------------------
# Smartcat inside dotCMS — JavaScript actionlets on the translation workflow.
# "Send to Smartcat" creates the Smartcat project when the editor clicks it;
# "Check Smartcat" imports finished languages for review. Their code lives in
# frontend-sandler/dotcms/smartcat/ (common.js + send.js / check.js).
# Credentials are in a Smartcat Settings item readable by administrators
# only (dotCMS secrets are disabled for scripts on awesomedemo-dev).
# --------------------------------------------------------------------------

SMARTCAT_JS = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           "..", "frontend-sandler", "dotcms", "smartcat")
JS_ACTIONLET = "com.dotcms.rendering.js.JsScriptActionlet"
VTL_ACTIONLET = A + "VelocityScriptActionlet"
# Runs before each Smartcat actionlet: hands the fired content's inode to the
# JavaScript, which can't get it itself when the action is fired from the
# editor (see currentArticle() in common.js).
FIRED_INODE_VTL = ('## Hand the fired content to the Smartcat JavaScript actionlet.\n'
                   '#set($ok = $dotcache.put("smartcat-fired-inode", $contentlet.getInode(), 120))')


def smartcat_code(name):
    read = lambda f: open(os.path.join(SMARTCAT_JS, f), encoding="utf-8").read()
    return read("common.js") + "\n" + read(f"{name}.js")


SMARTCAT_FOLDER = "/_smartcat"


def restrict_folder_to_owner(folder_id):
    """Only the current user's role (and administrators) can see the folder
    or content inherited from it. Content permissions can't be replaced
    through the REST API (updates merge), so access is controlled here."""
    me = ns.api("GET", "/api/v1/users/current")
    owner = me.get("roleId")
    ns.api("PUT", f"/api/v1/permissions/role/{owner}/asset/{folder_id}", {"permissions": {
        "INDIVIDUAL": ["READ", "WRITE", "PUBLISH", "EDIT_PERMISSIONS", "CAN_ADD_CHILDREN"],
        "CONTENT": ["READ", "WRITE", "PUBLISH", "EDIT_PERMISSIONS"]}})
    for p in ns.api("GET", f"/api/v1/permissions/{folder_id}")["entity"]["permissions"]:
        if p["roleId"] != owner:
            ns.api("PUT", f"/api/v1/permissions/role/{p['roleId']}/asset/{folder_id}",
                   {"permissions": {"INDIVIDUAL": [], "CONTENT": [], "FOLDER": []}})
    left = [p["roleId"] for p in ns.api("GET", f"/api/v1/permissions/{folder_id}")["entity"]["permissions"]]
    if left != [owner]:
        sys.exit(f"  ! {SMARTCAT_FOLDER} still grants access to other roles: {left}")


def create_smartcat_settings(values):
    """values: accountId, apiKey, server, targets, mtEngine, dotcmsToken.

    The item holds an API key and a dotCMS token, so it lives in a folder
    only its owner can read, is saved unpublished, and is published only
    after an anonymous request is confirmed to see nothing.
    """
    create_type("SmartcatSettings", "Smartcat Settings",
                "Credentials for the Smartcat workflow actions. Keep it in the "
                "restricted /_smartcat folder.", [
        site_field(),
        field("ImmutableTextField", "Title", "title", required=True, listed=True),
        field("ImmutableTextField", "Smartcat account ID", "accountId", required=True),
        field("ImmutableTextField", "Smartcat API key", "apiKey", required=True),
        field("ImmutableTextField", "Smartcat API server", "server",
              hint="https://smartcat.ai (Europe), https://us.smartcat.ai or https://ea.smartcat.ai"),
        field("ImmutableTextField", "Target languages", "targets", hint="e.g. es,fr"),
        field("ImmutableTextField", "Machine-translation engine", "mtEngine",
              hint="Optional, e.g. DeepL or engine:Google"),
        field("ImmutableTextField", "dotCMS API token", "dotcmsToken", required=True,
              hint="Used by the actionlets to read and write content via the REST API"),
        field("ImmutableTextField", "Site identifier", "siteId", required=True),
    ], icon="key")

    ns.create_folders(SITE, [SMARTCAT_FOLDER])
    folder = ns.api("GET", f"/api/v1/folder/siteId/{SITE_ID}/path/{SMARTCAT_FOLDER.strip('/')}")["entity"]["identifier"]
    restrict_folder_to_owner(folder)

    found = ns.api("POST", "/api/content/_search", {
        "query": "+contentType:SmartcatSettings", "limit": 1})["entity"]["jsonObjectView"]["contentlets"]
    item = {"contentType": "SmartcatSettings", "site": folder, "languageId": 1,
            "title": "Smartcat Settings", "siteId": SITE_ID, **values}
    if found:
        item["identifier"] = found[0]["identifier"]
    saved = ns.api("PUT", "/api/v1/workflow/actions/default/fire/EDIT", {"contentlet": item}).get("entity") or {}
    if not saved.get("identifier"):
        sys.exit("  ! could not save Smartcat Settings")
    ns.api("PUT", f"/api/v1/permissions/{saved['identifier']}/_reset")  # inherit from the folder

    # Publish, then prove an anonymous request can't read it; unpublish if it can.
    ns.api("PUT", f"/api/v1/workflow/actions/default/fire/PUBLISH?identifier={saved['identifier']}", {})
    time.sleep(3)
    anon = subprocess.run(["curl", "-s", "-X", "POST", f"{ns.HOST}/api/content/_search",
                           "-H", "Content-Type: application/json", "-d",
                           json.dumps({"query": "+contentType:SmartcatSettings", "limit": 1})],
                          capture_output=True, text=True).stdout
    if '"apiKey"' in anon:
        ns.api("PUT", f"/api/v1/workflow/actions/default/fire/UNPUBLISH?identifier={saved['identifier']}", {})
        sys.exit("  ! Smartcat Settings was readable anonymously — unpublished it; fix permissions")
    print(f"  Smartcat Settings {saved['identifier']} (in {SMARTCAT_FOLDER}, not readable anonymously)")


def install_smartcat_actionlets(scheme):
    steps = {s["name"]: s["id"] for s in
             ns.api("GET", f"/api/v1/workflow/schemes/{scheme}/steps")["entity"]}
    actions = {a["name"]: a for a in
               ns.api("GET", f"/api/v1/workflow/schemes/{scheme}/actions")["entity"]}
    edit = find_role("Anyone", key="cms_workflow_any_who_can_edit", workflow=True)
    system_actions = ns.api("GET", f"/api/v1/workflow/schemes/{SYSTEM_WORKFLOW}/actions")
    nobody = next(a["nextAssign"] for a in system_actions["entity"] if a.get("nextAssign"))

    def set_actionlets(action_id, actionlets):
        for a in ns.api("GET", f"/api/v1/workflow/actions/{action_id}/actionlets")["entity"]:
            ns.api("DELETE", f"/api/v1/workflow/actionlets/{a['id']}")
        for order, (clazz, params) in enumerate(actionlets):
            r = ns.api("POST", f"/api/v1/workflow/actions/{action_id}/actionlets",
                       {"actionletClass": clazz, "order": order, "parameters": params})
            if isinstance(r, dict) and r.get("message"):
                sys.exit(f"  ! actionlet {clazz}: {r['message'][:200]}")

    def upsert(name, step, next_step, icon):
        body = {"schemeId": scheme, "stepId": steps[step], "actionName": name,
                "whoCanUse": [edit], "actionIcon": icon, "actionAssignable": False,
                "actionCommentable": False, "actionRoleHierarchyForAssign": False,
                "showOn": SHOW_ALL, "actionNextStep": steps.get(next_step, next_step),
                "actionNextAssign": nobody, "actionCondition": ""}
        if name in actions:
            ns.api("PUT", f"/api/v1/workflow/actions/{actions[name]['id']}", body)
            return actions[name]["id"]
        return ns.api("POST", "/api/v1/workflow/actions", body)["entity"]["id"]

    send = upsert("Send to Smartcat", "Editing", "In translation at Smartcat", "shareIcon")
    set_actionlets(send, [
        (VTL_ACTIONLET, {"script": FIRED_INODE_VTL, "resultKey": "firedInode"}),
        (JS_ACTIONLET, {"javascriptCode": smartcat_code("send"), "resultKey": "smartcatResult"}),
        (A + "CheckinContentActionlet", {})])
    check = upsert("Check Smartcat", "In translation at Smartcat", "currentstep", "refreshIcon")
    set_actionlets(check, [
        (VTL_ACTIONLET, {"script": FIRED_INODE_VTL, "resultKey": "firedInode"}),
        (JS_ACTIONLET, {"javascriptCode": smartcat_code("check"), "resultKey": "smartcatResult"})])
    print("  actionlets: Send to Smartcat, Check Smartcat")

    # dotCMS adds "Notify Assignee" to new actions; nobody is assigned here.
    for a in ns.api("GET", f"/api/v1/workflow/schemes/{scheme}/actions")["entity"]:
        for sub in ns.api("GET", f"/api/v1/workflow/actions/{a['id']}/actionlets")["entity"]:
            if sub.get("name") == "Notify Assignee":
                ns.api("DELETE", f"/api/v1/workflow/actionlets/{sub['id']}")


# --------------------------------------------------------------------------
# Testimonials — as on each center's go.sandler.com "About Us › Testimonials"
# page. The 36 quotes in sandler-testimonials.json are verbatim from those
# pages. Visitors can submit a review from the site; it is saved unpublished
# (source "submitted") so an editor approves it by publishing it.
# --------------------------------------------------------------------------

TESTIMONIALS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                 "sandler-testimonials.json")


def create_testimonial_types():
    create_type("SandlerTestimonial", "Sandler Testimonial",
                "A client testimonial for one training center", [
        site_field(),
        field("ImmutableTextField", "Internal name", "title", required=True, listed=True),
        {"clazz": F + "ImmutableRelationshipField", "name": "Training center",
         "variable": "center", "required": True, "indexed": True, "searchable": True,
         "relationships": {"cardinality": 3, "velocityVar": "TrainingCenter",
                           "isParentField": True}},
        field("ImmutableTextAreaField", "Quote", "quote", required=True),
        field("ImmutableTextField", "Name", "name", listed=True,
              hint="Leave empty for an anonymous testimonial"),
        field("ImmutableTextField", "Title and company", "role"),
        field("ImmutableTextField", "Review title", "headline",
              hint="From the site's review form"),
        field("ImmutableSelectField", "Rating", "rating",
              values="No rating|\r\n5 stars|5\r\n4 stars|4\r\n3 stars|3\r\n2 stars|2\r\n1 star|1"),
        field("ImmutableTextField", "Location", "location", hint="City, state / province"),
        field("ImmutableTextField", "Email (not shown)", "email"),
        field("ImmutableSelectField", "Source", "source", listed=True,
              values="Sandler website|website\r\nSubmitted on this site|submitted"),
    ], icon="format_quote")
    create_type("SandlerTestimonialList", "Sandler Testimonial List",
                "Testimonials for the current training center", [
        site_field(),
        field("ImmutableTextField", "Internal name", "title", required=True, listed=True),
        field("ImmutableTextField", "Heading", "heading"),
        field("ImmutableTextAreaField", "Text when there are none", "emptyText"),
        field("ImmutableSelectField", "Show", "limit",
              values="All|\r\n3, with a link to the rest|3\r\n6, with a link to the rest|6"),
    ], icon="format_quote")
    create_type("SandlerReviewForm", "Sandler Review Form",
                "Lets visitors submit a review of the current training center", [
        site_field(),
        field("ImmutableTextField", "Internal name", "title", required=True, listed=True),
        field("ImmutableTextField", "Heading", "heading"),
        field("ImmutableTextAreaField", "Intro", "intro"),
        field("ImmutableTextAreaField", "Thank-you message", "successMessage"),
    ], icon="rate_review")


def create_testimonials():
    data = json.load(open(TESTIMONIALS_FILE, encoding="utf-8"))["testimonials"]
    centers = {c["urlTitle"]: c["identifier"] for c in ns.api(
        "POST", "/api/content/_search",
        {"query": f"+contentType:TrainingCenter +conHost:{SITE_ID} +live:true", "limit": 100}
    )["entity"]["jsonObjectView"]["contentlets"]}
    for t in data:
        if t["center"] not in centers:
            print(f"  ! no center {t['center']} — skipped a testimonial")
            continue
        create("SandlerTestimonial",
               title=f"{t['name'] or 'Anonymous'} — {t['center']}",
               center=centers[t["center"]], quote=t["quote"], name=t["name"],
               role=t["role"], source="website")


def build_testimonials_page(tpl):
    folder = f"{CENTER_PAGES_FOLDER}/about-us/testimonials"
    ns.create_folders(SITE, [folder])
    fill(ns.page(SITE_ID, "Testimonials", folder, tpl), [
        center_hero("Testimonials",
                    "What clients say about working with their local Sandler team."),
        create("SandlerTestimonialList", title="Testimonials — list",
               heading="What our clients say",
               emptyText="No testimonials have been published for this center "
                         "yet. Be the first to share your experience."),
        create("SandlerReviewForm", title="Testimonials — review form",
               heading="Write a Review",
               intro="Tell us about your experience with Sandler. Reviews are "
                     "published once our team has approved them.",
               successMessage="Thank you — your review has been received and will "
                              "appear once it has been approved."),
    ])


def build_more_solution_pages(tpl):
    """The seven solutions added with The Ruby Group's catalogue. Headings
    follow the matching go.sandler.com pages; body copy is written for the
    demo."""
    S = f"{CENTER_PAGES_FOLDER}/solutions"
    slugs = ["sales-management-training", "online-training", "certification",
             "channel-sales-series", "sales-training-boot-camp",
             "end-of-the-year-goals-workshop-series", "sandler-reinforcement-services"]
    ns.create_folders(SITE, [f"{S}/{slug}" for slug in slugs])

    fill(ns.page(SITE_ID, "Sales Management Training", f"{S}/sales-management-training", tpl), [
        center_hero("Sales Management Training",
                    "Find growth for your business, teams, and yourself."),
        text_block("Sales Management — intro", [
            h(2, "Sales Management Training and Development"),
            p("Give revenue-generating leaders the skills and strategies that "
              "drive measurable results across their teams."),
            h(2, "If you want better results and better sales teams, invest in better leaders."),
            p("Many managers step into the role without training in coaching, "
              "pipeline management or hiring — and it shows in team results."),
        ]),
        grid("Sales Management — paths", "numbered", [
            "Role and style development | Understand your leadership style and "
            "the role of a sales manager.",
            "Talent management | Hire, onboard and develop the right people.",
            "Sales performance coaching | Coach to behaviors, pipeline and results.",
        ], heading="3 Learning Paths for a Comprehensive Growth Plan", theme="muted"),
        local("Sales Management — local center", "Develop your sales leaders"),
    ])

    fill(ns.page(SITE_ID, "Online Sales Training", f"{S}/online-training", tpl), [
        center_hero("Online Sales Training", "Self-paced sales courses for the modern seller."),
        text_block("Online Training — intro", [
            h(2, "Take the Next Step in Your Future"),
            p("Self-paced training that covers everything from prospecting to "
              "relationship building, for every career stage."),
        ]),
        grid("Online Training — benefits", "split", [
            "Leverage a robust library of online resources for continuous learning",
            "Enhance live training sessions with complementary digital content",
            "Apply new skills in real-world scenarios with practical tools",
            "Tailor materials to your organisation's goals and challenges",
        ], heading="Evolve Your Sales Process, Business Performance, & More"),
        grid("Online Training — advantages", "cards", [
            "Accessing On-Demand Resources | Learn when and where it suits you.",
            "Boosting Knowledge Retention | Short lessons, revisited often.",
            "Optimizing Your Training Budget | Scale learning across the team.",
            "Building on Proven Methodologies | The Sandler Selling System, online.",
        ], heading="Online Sales Training Accelerates Growth", theme="muted"),
        local("Online Training — local center", "Combine online and live training"),
    ])

    fill(ns.page(SITE_ID, "Sandler Sales Certification", f"{S}/certification", tpl), [
        center_hero("Sandler Sales Certification", "Measured learning equals consistent results."),
        text_block("Certification — intro", [
            h(2, "Get the Most Out of Your Training Investment"),
            p("Industry-recognised credentials that show sales competency and "
              "give your team a competitive advantage."),
            h(2, "Get Certified With Sandler"),
            p("Three progressive levels build expertise from the foundations to "
              "expert application in a specific role."),
        ]),
        grid("Certification — benefits", "split", [
            "A deep understanding of the psychology behind successful selling",
            "The ability to build and maintain long-lasting client relationships",
            "The skills to handle objections and overcome obstacles",
            "Increased confidence and motivation in sales situations",
        ], heading="Benefits of Getting Certified by Sandler", theme="muted"),
        local("Certification — local center", "Start your certification path"),
    ])

    fill(ns.page(SITE_ID, "Channel Sales Series", f"{S}/channel-sales-series", tpl), [
        center_hero("Channel Sales Series", "Turn partner-facing reps into growth leaders."),
        text_block("Channel Sales — intro", [
            h(2, "A system for scalable channel growth"),
            p("Channel teams have to deliver revenue without direct authority "
              "over the people who sell. That takes structure and training."),
        ]),
        grid("Channel Sales — benefits", "split", [
            "Adopt a high-impact sales mindset & process",
            "Deepen relationship and discovery skills",
            "Shorten sales cycles and close more deals",
            "Personalized, ongoing development, and reinforcement",
        ], heading="Turn Channel Potential into Sales Performance", theme="muted"),
        local("Channel Sales — local center",
              "Equip your team with a system that turns partner activity into measurable results"),
    ])

    fill(ns.page(SITE_ID, "Sales Training Boot Camp", f"{S}/sales-training-boot-camp", tpl), [
        center_hero("Sales Training Boot Camps",
                    "People make buying decisions emotionally… and they justify "
                    "those decisions intellectually. — David Sandler"),
        text_block("Boot Camp — intro", [
            h(2, "Have You Reached Your Sales Potential?"),
            p("Two intensive days on the attitudes, behaviors and techniques "
              "that separate top performers. Includes 60 days of Sandler Online "
              "and a behavioral assessment."),
        ]),
        grid("Boot Camp — outcomes", "split", [
            "Review your current sales system and identify gaps",
            "Build on your selling foundation and refresh your skills",
            "Establish a system that puts you and the prospect at ease",
            "Update your tailored qualifying process",
            'Learn to differentiate yourself from "traditional" salespeople',
        ], heading="Boot Camp Attendees Will:", theme="muted"),
        local("Boot Camp — local center", "Save your seat at the next boot camp"),
    ])

    fill(ns.page(SITE_ID, "End of the Year Goals Workshop Series",
                 f"{S}/end-of-the-year-goals-workshop-series", tpl), [
        center_hero("End of the Year Goals Workshop Series",
                    "Setting you up for success in the year ahead."),
        grid("Goals Workshops — series", "numbered", [
            "Successful Goal Setting | Set SMART goals across eight areas of "
            "life, with an actionable vision and accountability.",
            "Vision Boarding | Build a visual reminder of what you're working "
            "towards, to stay motivated all year.",
            "Cookbooks for Success | Turn goals into a weekly behavior plan you "
            "can measure.",
        ], heading="Three workshops, one plan", theme="muted"),
        text_block("Goals Workshops — quote", [
            p("\u201cDecide what you want, build a plan, and you can bet on the "
              "outcome!\u201d — David Sandler"),
        ]),
        local("Goals Workshops — local center", "Join the next workshop series"),
    ])

    fill(ns.page(SITE_ID, "Sandler Reinforcement Services",
                 f"{S}/sandler-reinforcement-services", tpl), [
        center_hero("Sandler Reinforcement Services",
                    "Empower learning, elevate selling, and unlock limitless growth."),
        text_block("Reinforcement — intro", [
            h(2, "From Practice to Performance"),
            p("Adaptive coaching, CRM guidance and AI call intelligence, working "
              "together to keep sales teams consistent."),
            h(2, "Own Every Stage of the Sales Journey"),
            p("The right coaching and resources help teams train effectively, "
              "sell confidently and accelerate results."),
        ]),
        grid("Reinforcement — tools", "split", [
            "Build on Sandler's trusted methodologies to strengthen skills",
            "Use AI-powered insights to make better decisions at every stage",
            "Streamline admin work and fit into your current workflows",
            "Deliver timely support that shortens cycles and boosts win rates",
        ], heading="Fuel sales success with tools designed to:", theme="muted"),
        local("Reinforcement — local center", "Keep the training working"),
    ])


def ensure_site():
    """Find or create (and publish) the site, and create its page folders.
    Refuses to continue if the site already has a home page, because content
    and pages are not de-duplicated."""
    global SITE_ID
    sites = ns.api("GET", f"/api/v1/site?filter={SITE}&per_page=50").get("entity") or []
    match = [s for s in sites if s.get("hostname") == SITE]
    if match:
        SITE_ID = match[0]["identifier"]
        home = ns.api("GET", f"/api/v1/page/json/index?language_id=1&host_id={SITE_ID}")
        if isinstance(home, dict) and home.get("entity"):
            sys.exit(f"{SITE} already has pages on {ns.HOST} — refusing to "
                     "create duplicates. Delete the site to rebuild.")
        print(f"  site {SITE} exists -> {SITE_ID}")
    else:
        SITE_ID = ns.create_site(SITE, "Sandler sales training demo site")
        if not SITE_ID:
            sys.exit(f"could not create {SITE}")
    ns.create_folders(SITE, FOLDERS)



# --------------------------------------------------------------------------
# Each center's own page, /locations/<slug>/index, built from sections so
# editors can edit, move, add and remove them in the Universal Visual Editor
# like any other page. dotCMS serves it ahead of the TrainingCenter URL map.
# The first version of each section is filled from the center's content.
# --------------------------------------------------------------------------

def create_center_page_types():
    create_type("SandlerCenterHero", "Sandler Center Hero",
                "Hero for a training center's page: headline and subtitle, with the "
                "center's address, phone and buttons", [
        site_field(),
        field("ImmutableTextField", "Internal name", "title", required=True, listed=True),
        field("ImmutableTextField", "Headline", "headline"),
        field("ImmutableTextAreaField", "Subtitle", "subtitle"),
    ], icon="storefront")
    create_type("SandlerRichText", "Sandler Rich Text", "A block of formatted text", [
        site_field(),
        field("ImmutableTextField", "Internal name", "title", required=True, listed=True),
        field("ImmutableStoryBlockField", "Body", "body"),
    ], icon="notes")
    create_type("SandlerCenterIntro", "Sandler Center Intro",
                "A center's introduction beside the solutions it offers", [
        site_field(),
        field("ImmutableTextField", "Internal name", "title", required=True, listed=True),
        field("ImmutableTextField", "Eyebrow", "eyebrow"),
        field("ImmutableTextField", "Heading", "heading"),
        field("ImmutableTextAreaField", "Intro", "intro"),
    ], icon="info")


def page_contentlets(path):
    """Contentlet ids on a page, in order."""
    page = ns.api("GET", f"/api/v1/page/json{path}?host_id={SITE_ID}&language_id=1").get("entity") or {}
    ids = []
    for container in (page.get("containers") or {}).values():
        for items in container.get("contentlets", {}).values():
            ids += [c["identifier"] for c in items]
    return ids


def own_page(path):
    """The page at path/index, or None. Without one, dotCMS answers with the
    URL-mapped center detail page, which carries urlContentMap."""
    page = ns.api("GET", f"/api/v1/page/json{path}?host_id={SITE_ID}&language_id=1").get("entity") or {}
    if page.get("urlContentMap") or not page.get("page"):
        return None
    return page["page"]["identifier"]


def related(content_type, center_id):
    items = ns.api("POST", "/api/content/_search", {
        "query": f"+contentType:{content_type} +conHost:{SITE_ID} +live:true +languageId:1",
        # Relationship fields are only filled in with depth >= 1.
        "limit": 1000, "depth": 1})["entity"]["jsonObjectView"]["contentlets"]
    def linked(value):
        # A many-to-one relationship comes back as one object, not a list.
        values = value if isinstance(value, list) else [value] if value else []
        return any((v.get("identifier") if isinstance(v, dict) else v) == center_id for v in values)
    return [i for i in items if linked(i.get("center"))]


def build_center_overview_pages(tpl):
    shared = page_contentlets("/locations/center-detail")
    centers = ns.api("POST", "/api/content/_search", {
        "query": f"+contentType:TrainingCenter +conHost:{SITE_ID} +live:true +languageId:1",
        "limit": 100})["entity"]["jsonObjectView"]["contentlets"]
    for c in centers:
        slug, name, city = c["urlTitle"], c["title"], c["city"]
        path = f"/locations/{slug}"
        if [i for i in page_contentlets(path) if i not in shared]:
            print(f"  {path}: has its own sections, left as is")
            continue
        ns.create_folders(SITE, [path])
        page = own_page(path) or ns.page(SITE_ID, f"{name} | Sandler", path, tpl)
        # Sections live in the center's folder, so whoever may edit that
        # folder (its franchisee, see provision-franchisees.py) may edit them.
        here = f"{SITE_ID}:{path}"
        ids = [
            create("SandlerCenterHero", site=here, title=f"{name} — hero",
                   headline=c.get("headline") or f"Sales Training in {city}",
                   subtitle=c.get("tagline", "")),
            create("SandlerCenterIntro", site=here, title=f"{name} — intro",
                   eyebrow=f"Sales Training in {city}",
                   heading=c.get("tagline") or name, intro=c.get("intro", "")),
        ]
        if c.get("body"):
            body = c["body"] if isinstance(c["body"], str) else json.dumps(c["body"])
            ids.append(create("SandlerRichText", site=here, title=f"{name} — about", body=body))
        if c.get("benefits"):
            ids.append(create("SandlerFeatureGrid", site=here, title=f"{name} — why choose us",
                              eyebrow="Why Sandler", heading=f"Why Choose {name}?",
                              layout="cards", theme="dark", items=c["benefits"]))
        if related("SandlerTestimonial", c["identifier"]):
            ids.append(create("SandlerTestimonialList", site=here, title=f"{name} — testimonials",
                              heading="What clients say", limit="3"))
        if related("SandlerEvent", c["identifier"]):
            ids.append(create("SandlerEventList", site=here, title=f"{name} — events",
                              heading=f"Upcoming events in {city}",
                              emptyText="No upcoming events right now."))
        if c.get("awards"):
            ids.append(create("SandlerFeatureGrid", site=here, title=f"{name} — awards",
                              eyebrow="Recognition", heading="Awards & Certifications",
                              layout="awards", theme="light", items=c["awards"]))
        ns.place(page, [("1", [i for i in ids if i] + shared)])
        print(f"  {path}: {len(ids)} sections + {len(shared)} shared")


# --------------------------------------------------------------------------
# Interface labels as dotCMS Language Variables (Settings → Languages →
# Language Variables), so editors can change or translate the site's buttons,
# menus and messages. The defaults live in the frontend's
# src/i18n/ui-strings.json; each becomes "sandler.<key>" in every language
# listed there. Existing values are left alone: an editor's change wins.
# --------------------------------------------------------------------------

UI_STRINGS = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          "..", "frontend-sandler", "src", "i18n", "ui-strings.json")


def create_language_variables():
    labels = {k: v for k, v in json.load(open(UI_STRINGS, encoding="utf-8")).items()
              if not k.startswith("_")}
    lang_ids = {l["languageCode"]: l["id"] for l in ns.api("GET", "/api/v2/languages")["entity"]}
    existing = {}
    for c in ns.api("POST", "/api/content/_search", {
            "query": "+contentType:Languagevariable +Languagevariable.key:sandler.* +deleted:false",
            "limit": 5000})["entity"]["jsonObjectView"]["contentlets"]:
        existing.setdefault(c["key"], {})[c["languageId"]] = c["identifier"]
    added = 0
    for key, texts in labels.items():
        full = "sandler." + key
        identifier = next(iter(existing.get(full, {}).values()), None)
        for code in ["en"] + [c for c in texts if c != "en"]:
            lang = lang_ids.get(code)
            if not lang or lang in existing.get(full, {}) or not texts.get(code):
                continue
            fields = {"contentType": "Languagevariable", "languageId": lang,
                      "key": full, "value": texts[code]}
            if identifier:
                fields["identifier"] = identifier  # the same variable, in another language
            e = ns.fire(fields).get("entity") or {}
            identifier = identifier or e.get("identifier")
            added += bool(e.get("identifier"))
    print(f"  language variables: {added} added ({len(labels)} labels)")

def main():
    ensure_site()
    set_menu()
    tpl, _ = ns.template(SITE_ID, "Sandler Full Width", [[12]] * 8)
    detail_tpl, _ = ns.template(SITE_ID, "Sandler Detail", [[12], [12]])

    center_detail = page_at("Training Center", "/locations", "center-detail", detail_tpl)
    article_detail = page_at("Article", "/articles", "article-detail", detail_tpl)

    create_types(center_detail, article_detail)

    # Shared sections under every center page (the detail page's layout), as
    # on each go.sandler.com center page: challenges, then next steps.
    ns.place(center_detail, center_shared_sections())
    ns.place(article_detail, [("1", [local_center(
        "Article detail — local center", "Put this into practice with your team",
        LOCAL_FALLBACK)])])

    create_centers()
    create_network_locations()
    create_articles()
    build_pages(tpl)
    create_event_types()
    create_events()
    build_center_pages(tpl)
    create_center_page_types()
    build_center_overview_pages(tpl)
    create_language_variables()
    build_more_solution_pages(tpl)
    create_hubspot_type()
    build_connect_page(tpl)
    create_testimonial_types()
    create_testimonials()
    build_testimonials_page(tpl)
    scheme = create_translation_workflow()
    enable_translation(scheme)
    create_translation_job_type()
    # Smartcat credentials come from the environment (see the docstring).
    if os.environ.get("SMARTCAT_API_KEY"):
        create_smartcat_settings({
            "accountId": os.environ["SMARTCAT_ACCOUNT_ID"],
            "apiKey": os.environ["SMARTCAT_API_KEY"],
            "server": os.environ.get("SMARTCAT_SERVER", "https://smartcat.ai"),
            "targets": os.environ.get("SMARTCAT_TARGETS", "es,fr"),
            "mtEngine": os.environ.get("SMARTCAT_MT_ENGINE", ""),
            "dotcmsToken": os.environ["DOTCMS_AUTH_TOKEN"]})
    install_smartcat_actionlets(scheme)

    ns.configure_uve(SITE_ID, FRONTEND)
    for uri in ["/index", "/programs/index", "/about/index", "/locations/index",
                "/articles/index", "/contact/index"]:
        ns.verify(SITE_ID, uri)


if __name__ == "__main__":
    main()
