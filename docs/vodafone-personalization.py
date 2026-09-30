#!/usr/bin/env python3
"""Personalization for the Vodafone Egypt demo (telcodemo.com).

Three personas, each with its own home-page hero and "Offers for you" row:

  Tourist / visitor to Egypt   browsing from outside Egypt, or arriving via a
                               travel or airport campaign   → tourist SIM, eSIM,
                                                               short-stay bundles
  Young social-first prepaid   arriving from a social media campaign
                                                             → "Social Unlimited"
                                                               add-on, youth plans
  Device shopper               has browsed /devices this visit
                                                             → device instalments
                                                               and plans to pair

It creates: the personas; the plan families tourist/youth/device (+ a Price
period field on plans); their plans; three persona hero slides; the default
"Offers for you" section; the /devices page (VodafoneDevice + VodafoneDeviceList
types, five phones); an "Offers" row after the quick links on the Vodafone Home
template; persona placements on the home page; and three dotCMS rules that
assign the personas (shown in the Rules screen — the headless site resolves the
same triggers itself, see frontend-vodafone/src/utils/personaTargeting.ts).

Prices are illustrative, not Vodafone Egypt's real offers.

    export DOTCMS_HOST=https://awesomedemo-dev.dotcms.dev
    export DOTCMS_AUTH_TOKEN=...          # admin
    python3 vodafone-personalization.py

Safe to re-run: personas, content, pages and rules are matched by name and
reused; placements and the template row are set, not appended.
"""
import os
import sys

os.environ.setdefault("DOTCMS_HOST", "https://awesomedemo-dev.dotcms.dev")
import dotcms_site as ns  # noqa: E402

SITE = os.environ.get("VODAFONE_SITE", "telcodemo.com")
HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "vodafone-assets")
F = "com.dotcms.contenttype.model.field."
EDITORIAL = "Vodafone Editorial"
SITE_ID = ""

# The home page's hero row (container uuid on the Vodafone Home template).
# The offers row is inserted after the quick links; dotCMS renumbers a drawn
# template's containers in layout order when it's saved (moving placed content
# along), so the offers row's uuid is looked up by its row class, not fixed.
HERO_SLOT = "1"
OFFERS_ROW_CLASS = "vf-row--offers"

PERSONAS = [
    {"key": "VodafoneTourist", "name": "Tourist / Visitor to Egypt",
     "description": "Browsing from outside Egypt, or arriving via a travel or airport "
                    "campaign link. Needs data and a local number for a short stay.",
     "tags": "tourist,travel,esim,short stay,roaming,airport", "photo": "hero-wifi-calling-mobile.jpg"},
    {"key": "VodafoneSocialPrepaid", "name": "Young Social-First Prepaid",
     "description": "Arrived from a social media campaign. Prepaid, lives on TikTok, "
                    "Instagram and WhatsApp, watches every pound.",
     "tags": "social,prepaid,youth,flex,social unlimited,data", "photo": "hero-flex.png"},
    {"key": "VodafoneDeviceShopper", "name": "Device Shopper",
     "description": "Has browsed device pages during this visit. Wants a new phone "
                    "without paying it all at once.",
     "tags": "devices,smartphones,instalments,upgrade,red", "photo": "rate-plans-mobile.jpg"},
]

# ── Offers (plans, illustrative prices) ──────────────────────────────────────
PLANS = [
    # Tourist SIMs and eSIM
    dict(title="Tourist SIM 7 Days", family="tourist", data="15 GB", minutes="100", price="450",
         pricePeriod="one-off", priceNote="Valid 7 days · passport required", badge="Best for a week",
         benefits=["Pick it up at Cairo, Hurghada and Sharm El Sheikh airports",
                   "100 local minutes and 20 international minutes",
                   "WhatsApp, maps and ride-hailing apps don't use your data",
                   "Top up any time with a card or Vodafone Cash"],
         ctaText="Get a Tourist SIM", ctaLink="/store-locator"),
    dict(title="Tourist SIM 15 Days", family="tourist", data="35 GB", minutes="200", price="750",
         pricePeriod="one-off", priceNote="Valid 15 days · passport required",
         benefits=["Pick it up at Cairo, Hurghada and Sharm El Sheikh airports",
                   "200 local minutes and 40 international minutes",
                   "WhatsApp, maps and ride-hailing apps don't use your data",
                   "Keep your number for your next trip for 90 days"],
         ctaText="Get a Tourist SIM", ctaLink="/store-locator"),
    dict(title="Travel eSIM 30 Days", family="tourist", data="60 GB", minutes="300", price="1100",
         pricePeriod="one-off", priceNote="Valid 30 days · activate before you fly", badge="No SIM swap",
         benefits=["Buy online and scan a QR code — ready when you land",
                   "Keep your home SIM active for calls and texts",
                   "300 local minutes and 60 international minutes",
                   "Works on any eSIM-compatible phone"],
         ctaText="Get the eSIM", ctaLink="https://eshop.vodafone.com.eg/en/"),
    # Young social-first prepaid
    dict(title="Social Unlimited", family="youth", data="Unlimited", minutes="", price="60",
         pricePeriod="/month", priceNote="Add-on for any prepaid line", badge="New",
         benefits=["Unlimited TikTok, Instagram, Facebook, WhatsApp and Snapchat",
                   "Add it in seconds from Ana Vodafone or by dialling *060#",
                   "Renews monthly — cancel any time",
                   "Pay with your balance or Vodafone Cash"],
         ctaText="Add Social Unlimited", ctaLink="https://web.vodafone.com.eg/en/ana-vodafone"),
    dict(title="Flex Youth 120", family="youth", data="12 GB", minutes="600", price="120",
         pricePeriod="/month", priceNote="Prepaid · for customers under 26",
         benefits=["600 minutes to any network",
                   "Double data at night, 12 am to 8 am",
                   "WATCH IT and Anghami Plus trials included",
                   "Add Social Unlimited for EGP 40 instead of 60"],
         ctaText="Get Flex Youth", ctaLink="https://eshop.vodafone.com.eg/en/"),
    dict(title="Flex Youth 200", family="youth", data="25 GB", minutes="1,200", price="200",
         pricePeriod="/month", priceNote="Prepaid · for customers under 26", badge="Social Unlimited included",
         benefits=["Social Unlimited included — scroll without counting",
                   "1,200 minutes to any network",
                   "Double data at night, 12 am to 8 am",
                   "Share 2 GB a month with a friend"],
         ctaText="Get Flex Youth", ctaLink="https://eshop.vodafone.com.eg/en/"),
    # Plans that pair with a device instalment (RED figures as published)
    dict(title="RED ESSENTIAL+ with a new phone", family="device", data="16 GB", minutes="3,500",
         price="575", pricePeriod="/month", priceNote="Tax Exclusive · plus your device instalment",
         benefits=["Device instalments up to EGP 15,000", "0% interest over 12 months",
                   "4 entertainment subscriptions to choose from", "Pick your phone in store or online"],
         ctaText="Choose a phone", ctaLink="/devices"),
    dict(title="RED ADVANCE+ with a new phone", family="device", data="32 GB", minutes="6,000",
         price="980", pricePeriod="/month", priceNote="Tax Exclusive · plus your device instalment",
         badge="Most chosen with a phone",
         benefits=["Device instalments up to EGP 20,000", "0% interest over 12 months",
                   "5 entertainment subscriptions to choose from", "Trade in your old phone for credit"],
         ctaText="Choose a phone", ctaLink="/devices"),
    dict(title="RED PRIME+ with a new phone", family="device", data="50 GB", minutes="8,000",
         price="1380", pricePeriod="/month", priceNote="Tax Exclusive · plus your device instalment",
         benefits=["Device instalments up to EGP 30,000", "0% interest over 12 months",
                   "6 entertainment subscriptions to choose from", "Trade in your old phone for credit"],
         ctaText="Choose a phone", ctaLink="/devices"),
]

# ── Persona hero slides (images reused from the media library) ────────────────
SLIDES = {
    "VodafoneTourist": dict(
        title="Welcome to Egypt.", highlight="Stay connected.",
        text="Tourist SIMs and eSIMs with data from the moment you land. Pick one up at Cairo, "
             "Hurghada or Sharm El Sheikh airport, or set up an eSIM before you fly.",
        ctaText="See tourist offers", ctaLink="#plans", image="red-lifestyle.png"),
    "VodafoneSocialPrepaid": dict(
        title="Scroll, post, repeat with", highlight="Social Unlimited",
        text="Unlimited TikTok, Instagram, Facebook, WhatsApp and Snapchat for EGP 60 a month. "
             "Add it to any prepaid line in seconds.",
        ctaText="Get Social Unlimited", ctaLink="#plans", image="hero-flex.png"),
    "VodafoneDeviceShopper": dict(
        title="Your new phone,", highlight="0% instalments",
        text="Spread the cost of a new smartphone over 12 months when you pair it with a RED plan "
             "— instalments up to EGP 30,000.",
        ctaText="Browse devices", ctaLink="/devices", image="rate-plans.jpg"),
}

OFFERS = {
    "VodafoneTourist": dict(heading="Tourist SIMs and eSIMs",
                            intro="Short-stay bundles for your trip — data, local minutes and a number "
                                  "that works from the airport.", family="tourist"),
    "VodafoneSocialPrepaid": dict(heading="Made for your feed",
                                  intro="The Social Unlimited add-on and prepaid plans for under-26s.",
                                  family="youth"),
    "VodafoneDeviceShopper": dict(heading="Plans that pair with your new phone",
                                  intro="Every RED plan comes with 0% device instalments. The bigger the "
                                        "plan, the higher the instalment limit.", family="device"),
}

DEFAULT_OFFERS = [
    "RED plans | Entertainment, lifestyle perks and family sharing in one bill. | /plans | star",
    "Vodafone Cash | Send money, pay bills and shop online with your number. | /vodafone-cash | cash",
    "Home Wireless | More than 50% off Home Wireless routers this month. | "
    "https://eshop.vodafone.com.eg/en/ | router",
]

# ── Devices (illustrative prices) ─────────────────────────────────────────────
DEVICES = [
    dict(title="iPhone 17 Pro", brand="Apple", storage="256 GB", price="79999", badge="New"),
    dict(title="Samsung Galaxy S26 Ultra", brand="Samsung", storage="512 GB", price="69999"),
    dict(title="Samsung Galaxy A57", brand="Samsung", storage="256 GB", price="21999", badge="Best value"),
    dict(title="Xiaomi Redmi Note 15 Pro", brand="Xiaomi", storage="256 GB", price="14999"),
    dict(title="OPPO Reno 15", brand="OPPO", storage="256 GB", price="17999"),
]

# ── Rules (conditions in one OR group; keywords must not overlap) ──────────────
RULES = [
    ("Persona: Tourist — outside Egypt, travel & airport campaigns", 10, "VodafoneTourist", [
        ("UsersCountryConditionlet", {"comparison": "isNot", "country": "EG"}),
        ("RequestParameterConditionlet", {"comparison": "contains", "request-parameter": "utm_campaign",
                                          "request-parameter-value": "airport"}),
        ("RequestParameterConditionlet", {"comparison": "contains", "request-parameter": "utm_campaign",
                                          "request-parameter-value": "visit-egypt"}),
        ("RequestParameterConditionlet", {"comparison": "is", "request-parameter": "utm_source",
                                          "request-parameter-value": "travel"}),
    ]),
    ("Persona: Young social-first prepaid — social campaigns", 20, "VodafoneSocialPrepaid", [
        ("RequestParameterConditionlet", {"comparison": "is", "request-parameter": "utm_source",
                                          "request-parameter-value": "tiktok"}),
        ("RequestParameterConditionlet", {"comparison": "is", "request-parameter": "utm_source",
                                          "request-parameter-value": "instagram"}),
        ("RequestParameterConditionlet", {"comparison": "is", "request-parameter": "utm_source",
                                          "request-parameter-value": "facebook"}),
        ("RequestParameterConditionlet", {"comparison": "contains", "request-parameter": "utm_campaign",
                                          "request-parameter-value": "social-unlimited"}),
    ]),
    ("Persona: Device shopper — browsed device pages", 30, "VodafoneDeviceShopper", [
        ("VisitedUrlConditionlet", {"comparison": "startsWith", "has-visited-url": "/devices"}),
        ("RequestParameterConditionlet", {"comparison": "contains", "request-parameter": "utm_campaign",
                                          "request-parameter-value": "device-instalments"}),
    ]),
]


# ─────────────────────────────────────────────────────────────────────────────

def entity(resp, what):
    e = resp.get("entity") if isinstance(resp, dict) else None
    if e is None or (isinstance(resp, dict) and resp.get("errors")):
        sys.exit(f"  ! {what}: {str(resp)[:300]}")
    return e


def search(query, limit=100):
    r = ns.api("POST", "/api/content/_search", {"query": query, "limit": limit})
    return r["entity"]["jsonObjectView"]["contentlets"]


def find(content_type, title):
    hits = [c for c in search(f"+contentType:{content_type} +conHost:{SITE_ID} +working:true +deleted:false")
            if c.get("title") == title or c.get("name") == title]
    return hits[0]["identifier"] if hits else None


def publish(identifier, content_type):
    ns.api("PUT", f"/api/v1/workflow/actions/default/fire/PUBLISH?identifier={identifier}&indexPolicy=WAIT_FOR",
           {"contentlet": {"identifier": identifier, "contentType": content_type, "languageId": 1}})


def upsert(content_type, title, **fields):
    """Create (Save, then Publish — Vodafone Editorial needs both) or update."""
    existing = find(content_type, title)
    body = {"contentType": content_type, "languageId": 1, "title": title, **fields}
    if existing:
        body["identifier"] = existing
        ns.api("PUT", f"/api/v1/workflow/actions/default/fire/EDIT?identifier={existing}&indexPolicy=WAIT_FOR",
               {"contentlet": body})
        ident = existing
    else:
        ident = entity(ns.fire({**body, "site": SITE_ID}, action="NEW"), f"{content_type} {title}")["identifier"]
    publish(ident, content_type)
    return ident


def image(name):
    """An image already in the media library (/images/...), by file name."""
    hits = [c for c in search(f"+basetype:4 +conHost:{SITE_ID} +deleted:false +working:true", 200)
            if (c.get("path") or "").endswith("/" + name)]
    if not hits:
        sys.exit(f"  ! {name} is not in the media library — run build-vodafone.py first")
    return hits[0]["identifier"]


def field(kind, name, variable, **kw):
    return {"clazz": F + kind, "name": name, "variable": variable, **kw}


def add_field(type_variable, new):
    t = entity(ns.api("GET", f"/api/v1/contenttype/id/{type_variable}"), type_variable)
    if not any(f["variable"] == new["variable"] for f in t["fields"]):
        entity(ns.api("POST", f"/api/v1/contenttype/{t['id']}/fields", {**new, "contentTypeId": t["id"]}),
               f"{type_variable}.{new['variable']}")


FAMILIES = ("RED|red\r\nFlex|flex\r\nMobile Internet|internet\r\nHome DSL|dsl\r\n"
            "Tourist SIM & eSIM|tourist\r\nYouth prepaid|youth\r\nDevice plans|device")


def extend_plans():
    """New plan families and a Price period on the Plan type."""
    t = entity(ns.api("GET", "/api/v1/contenttype/id/VodafonePlan"), "VodafonePlan")
    fam = next(f for f in t["fields"] if f["variable"] == "family")
    if "tourist" not in (fam.get("values") or ""):
        fam["values"] = FAMILIES
        entity(ns.api("PUT", f"/api/v1/contenttype/{t['id']}/fields/id/{fam['id']}", fam),
               "VodafonePlan.family")
    add_field("VodafonePlan", field("ImmutableTextField", "Price period", "pricePeriod",
                                    hint="Shown after the price: /month (default), /week, one-off"))
    print("  plan families: tourist, youth, device (+ Price period)")


def device_types(scheme):
    for variable, name, description, fields, icon in [
        ("VodafoneDevice", "Vodafone Device", "A phone or tablet sold with instalments", [
            field("ImmutableHostFolderField", "Site", "site", required=True, indexed=True),
            field("ImmutableTextField", "Name", "title", required=True, indexed=True, listed=True),
            field("ImmutableTextField", "Brand", "brand", indexed=True, listed=True),
            field("ImmutableTextField", "Storage", "storage"),
            field("ImmutableTextField", "Price (EGP)", "price", required=True, indexed=True),
            field("ImmutableTextField", "Badge", "badge"),
            field("ImmutableImageField", "Image", "image", hint="Optional, from the media library"),
        ], "smartphone"),
        ("VodafoneDeviceList", "Vodafone Device List", "Cards for every published device, with instalments", [
            field("ImmutableHostFolderField", "Site", "site", required=True, indexed=True),
            field("ImmutableTextField", "Internal name", "title", required=True, indexed=True, listed=True),
            field("ImmutableTextField", "Heading", "heading"),
            field("ImmutableTextAreaField", "Intro", "intro"),
            field("ImmutableTextField", "Instalment months", "months", hint="e.g. 12"),
        ], "devices"),
    ]:
        r = ns.api("GET", f"/api/v1/contenttype/id/{variable}")  # a missing type returns a bare 404
        if not (isinstance(r, dict) and isinstance(r.get("entity"), dict) and r["entity"].get("id")):
            entity(ns.api("POST", "/api/v1/contenttype", [{
                "clazz": "com.dotcms.contenttype.model.type.ImmutableSimpleContentType",
                "name": name, "variable": variable, "description": description, "host": SITE_ID,
                "icon": icon, "workflow": [scheme], "fields": fields}]), variable)
    print("  types: VodafoneDevice, VodafoneDeviceList")


def personas():
    ids = {}
    existing = {p.get("keyTag"): p for p in search("+contentType:persona +deleted:false +working:true", 200)}
    for p in PERSONAS:
        body = {"contentType": "persona", "languageId": 1, "name": p["name"], "keyTag": p["key"],
                "description": p["description"], "tags": p["tags"], "hostFolder": SITE_ID,
                "photo": ns.upload_image(os.path.join(ASSETS, p["photo"]))}
        if p["key"] in existing:
            body["identifier"] = existing[p["key"]]["identifier"]
        e = entity(ns.fire(body), f"persona {p['name']}")
        ids[p["key"]] = e["identifier"]
        print(f"  persona {p['name']} ({p['key']}) -> {e['identifier']}")
    return ids


def offers_row():
    """Insert the Offers row after the quick links (once), and return the uuid
    dotCMS gives its container."""
    tpls = entity(ns.api("GET", f"/api/v1/templates?host={SITE_ID}&per_page=50"), "templates")
    t = next(x for x in tpls if x["title"] == "Vodafone Home")

    def offers_uuid():
        full = entity(ns.api("GET", f"/api/v1/templates/{t['identifier']}/working"), "template")
        rows = full["layout"]["body"]["rows"]
        row = next((r for r in rows if OFFERS_ROW_CLASS in (r.get("styleClass") or "")), None)
        return full, rows, (row["columns"][0]["containers"][0]["uuid"] if row else None)

    full, rows, uuid = offers_uuid()
    if uuid:
        return uuid
    uuids = [c["uuid"] for r in rows for col in r["columns"] for c in col["containers"]]
    new = str(max(int(u) for u in uuids) + 1)
    rows.insert(2, {"styleClass": f"vf-row {OFFERS_ROW_CLASS}", "columns": [
        {"styleClass": "", "leftOffset": 1, "width": 12,
         "containers": [{"identifier": rows[0]["columns"][0]["containers"][0]["identifier"], "uuid": new}]}]})
    container = rows[0]["columns"][0]["containers"][0]["identifier"]
    body = "\n".join(f'#parseContainer("{container}","{u}")' for u in uuids + [new])
    entity(ns.api("PUT", "/api/v1/templates", {
        **{k: full[k] for k in ("identifier", "inode", "title", "friendlyName", "theme", "drawed", "layout")},
        "siteId": SITE_ID, "body": body, "drawedBody": body}), "template update")
    ns.api("PUT", "/api/v1/templates/_publish", [t["identifier"]])
    uuid = offers_uuid()[2]
    print(f"  Vodafone Home template: Offers row after the quick links (container {uuid})")
    return uuid


def layout_container(page_entity):
    """The container the page's template uses (Vodafone Sections after
    vodafone-container.py; the System Container on a fresh build)."""
    rows = page_entity["layout"]["body"]["rows"]
    return rows[0]["columns"][0]["containers"][0]["identifier"]


def place(page_id, container, slots, persona=""):
    """slots: {uuid: [content ids]} on the page's container."""
    payload = [{"personaTag": persona, "contentletsId": ids, "identifier": container, "uuid": u}
               for u, ids in sorted(slots.items())]
    entity(ns.api("POST", f"/api/v1/page/{page_id}/content", payload), f"placements {persona or 'default'}")


def page_at(folder, title, template_title, sections):
    """Find or create a page at {folder}/index and set its sections (one per row)."""
    home = ns.api("GET", f"/api/v1/page/json{folder}/index?host_id={SITE_ID}&language_id=1&mode=EDIT_MODE")
    page = (home.get("entity") or {}).get("page") if isinstance(home, dict) else None
    if not (page and page.get("host") == SITE_ID):
        ns.create_folders(SITE, [folder])
        tpl = next(x for x in entity(ns.api("GET", f"/api/v1/templates?host={SITE_ID}&per_page=50"), "t")
                   if x["title"] == template_title)
        pid = ns.page(SITE_ID, title, folder, tpl["identifier"])
    else:
        pid = page["identifier"]
    e = entity(ns.api("GET", f"/api/v1/page/json{folder}/index?host_id={SITE_ID}&language_id=1&mode=EDIT_MODE"),
               folder)
    place(pid, layout_container(e), {str(i + 1): [c] for i, c in enumerate(sections)})
    ns.fire({"identifier": pid, "contentType": "htmlpageasset"})
    ns.api("PUT", f"/api/v1/content/_unlock/{pid}")
    return pid


def set_menu_devices():
    """Devices goes in the main menu between Plans and Vodafone Cash."""
    order = [("plans", "Plans"), ("devices", "Devices"), ("vodafone-cash", "Vodafone Cash"),
             ("store-locator", "Store Locator")]
    for i, (folder, title) in enumerate(order, start=1):
        ns.api("PUT", "/api/v1/assets/folders", {"assetPath": f"//{SITE}/{folder}/",
                                                 "data": {"title": title, "showOnMenu": True, "sortOrder": i}})


def place_personas(persona_keys, slides, offers, default_offers, offers_slot):
    """Default placements, then one full set per persona (dotCMS shows a
    persona only what's placed for it, so shared rows are copied too)."""
    home = entity(ns.api("GET", f"/api/v1/page/json/index?host_id={SITE_ID}&language_id=1&mode=EDIT_MODE"),
                  "home page")
    pid = home["page"]["identifier"]
    container = layout_container(home)
    placed = {u.replace("uuid-", ""): [x["identifier"] for x in items]
              for cid, c in home["containers"].items() if cid == container
              for u, items in c["contentlets"].items()}
    # Persona heroes and offers only ever go in their own slots.
    ours = {default_offers, *offers.values(), *slides.values()}
    default = {u: [i for i in ids if i not in ours] for u, ids in placed.items()}
    default[offers_slot] = [default_offers]

    place(pid, container, default)
    for key in persona_keys:
        place(pid, container, {**default, HERO_SLOT: [slides[key]], offers_slot: [offers[key]]}, key)
    publish(pid, "htmlpageasset")
    ns.api("PUT", f"/api/v1/content/_unlock/{pid}")
    print(f"  home page: default + {len(persona_keys)} persona variants (hero + offers)")


def rules(persona_ids):
    base = f"/api/v1/sites/{SITE_ID}/ruleengine"
    have = ns.api("GET", f"{base}/rules") or {}
    for name, priority, key, conditions in RULES:
        for rid, r in have.items() if isinstance(have, dict) else []:
            if isinstance(r, dict) and r.get("name") == name:
                ns.api("DELETE", f"{base}/rules/{rid}")
        rule = entity({"entity": ns.api("POST", f"{base}/rules", {
            "name": name, "enabled": True, "fireOn": "EVERY_PAGE", "priority": priority,
            "shortCircuit": False})}, f"rule {name}")
        rid = rule.get("id")
        group = ns.api("POST", f"{base}/rules/{rid}/conditionGroups", {"operator": "OR", "priority": 1})
        gid = group.get("id")
        for i, (conditionlet, values) in enumerate(conditions, start=1):
            ns.api("POST", f"{base}/conditions", {
                "conditionlet": conditionlet, "owningGroup": gid, "operator": "OR", "priority": i,
                "values": {k: {"key": k, "value": v, "priority": 0} for k, v in values.items()}})
        ns.api("POST", f"{base}/actions", {
            "actionlet": "PersonaActionlet", "owningRule": rid, "priority": 1,
            "parameters": {"personaIdKey": {"key": "personaIdKey", "value": persona_ids[key]}}})
        print(f"  rule {name}")


def main():
    global SITE_ID
    SITE_ID = entity(ns.api("POST", "/api/v1/site/_byname", {"siteName": SITE}), "site")["identifier"]
    scheme = next(s["id"] for s in entity(ns.api("GET", "/api/v1/workflow/schemes"), "schemes")
                  if s["name"] == EDITORIAL)

    extend_plans()
    device_types(scheme)
    persona_ids = personas()

    by_family = {}
    for order, p in enumerate(PLANS, start=1):
        ident = upsert("VodafonePlan", p["title"], family=p["family"], data=p["data"], minutes=p["minutes"],
                       price=p["price"], pricePeriod=p["pricePeriod"], priceNote=p["priceNote"],
                       badge=p.get("badge", ""), benefits="\n".join(p["benefits"]), ctaText=p["ctaText"],
                       ctaLink=p["ctaLink"], displayOrder=str(order))
        # The offers rows list each persona's plans, in this order.
        by_family.setdefault(p["family"], []).append(ident)
    print(f"  {len(PLANS)} persona plans")

    slides = {k: upsert("VodafoneHeroSlide", s["title"], highlight=s["highlight"], text=s["text"],
                        ctaText=s["ctaText"], ctaLink=s["ctaLink"], image=image(s["image"]))
              for k, s in SLIDES.items()}
    offers = {k: upsert("VodafonePlanList", f"Home — offers ({k})", heading=o["heading"],
                        intro=o["intro"], plans=",".join(by_family[o["family"]]))
              for k, o in OFFERS.items()}
    default_offers = upsert("VodafoneFeatureGrid", "Home — offers for you", heading="Offers for you",
                            layout="cards", theme="light", items="\n".join(DEFAULT_OFFERS))
    print("  persona hero slides and offers")

    for d in DEVICES:
        upsert("VodafoneDevice", d["title"], brand=d["brand"], storage=d["storage"], price=d["price"],
               badge=d.get("badge", ""))
    banner = upsert("VodafonePageBanner", "Devices — 0% instalments",
                    subtitle="Get the latest smartphone and spread the cost over 12 months at 0% "
                             "interest when you pair it with a RED plan.",
                    ctaText="See plans that pair", ctaLink="/", bannerStyle="red")
    device_list = upsert("VodafoneDeviceList", "Devices — all phones", heading="Smartphones",
                         intro="Prices include VAT. Instalments are 0% over 12 months with a RED plan.",
                         months="12")
    steps = upsert("VodafoneFeatureGrid", "Devices — how instalments work",
                   heading="How device instalments work", layout="steps", theme="grey",
                   items="\n".join([
                       "Pick your phone | Choose any device here, in store or in Ana Vodafone.",
                       "Pair it with RED | Your RED plan sets your instalment limit — up to EGP 30,000.",
                       "Pay monthly | The instalment is added to your bill for 12 months, at 0% interest."]))
    page_at("/devices", "Devices | Vodafone Egypt", "Vodafone Full Width", [banner, device_list, steps])
    set_menu_devices()
    print(f"  /devices page with {len(DEVICES)} phones; Devices in the menu")

    offers_slot = offers_row()
    place_personas([p["key"] for p in PERSONAS], slides, offers, default_offers, offers_slot)
    rules(persona_ids)
    print("\nDone.")


if __name__ == "__main__":
    main()
