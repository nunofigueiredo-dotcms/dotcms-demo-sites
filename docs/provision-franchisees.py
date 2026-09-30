#!/usr/bin/env python3
"""Provision Sandler franchisees in dotCMS from a CSV file.

For every franchisee in the CSV this creates or updates:

  1. its folder, /locations/<slug>/ — its training center page and any pages
     of its own — with a starter center page if it has none yet
  2. its roles: Franchisee – <slug> – Editor / Viewer (and Master – <slug>)
  3. the folder's permissions, set on the folder itself (not inherited)
  4. its users and their role memberships

and, once for the whole site:

  5. the HQ roles (HQ – Admin, HQ – Reviewer) and the tier roles
  6. the Franchisee Publishing workflow (Draft → In Review → Published)
     and who may use each of its actions
  7. the reduced back-office menu (tool group) for franchisee users

Every step looks up what already exists and only adds or corrects what is
missing, so the script is safe to run again after editing the CSV. It
finishes with an audit that fails loudly if a franchisee role can publish or
can see another franchisee's folder.

    export DOTCMS_HOST=https://awesomedemo-dev.dotcms.dev
    export DOTCMS_AUTH_TOKEN=...          # an admin API token
    python3 docs/provision-franchisees.py [--csv docs/franchisees.csv] [--audit-only]

New users get a random password, written to docs/franchisee-users.local.csv
(gitignored, readable by you only). Passwords are never printed.

Use test data only until the customer has approved real names and emails.
"""
import argparse
import csv
import json
import os
import secrets
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
HOST = os.environ.get("DOTCMS_HOST", "http://localhost:8082").rstrip("/")
TOKEN = os.environ.get("DOTCMS_AUTH_TOKEN", "")
SITE_NAME = os.environ.get("SANDLER_SITE", "trainning-service.com")
CREDENTIALS_FILE = os.path.join(HERE, "franchisee-users.local.csv")

# --------------------------------------------------------------------------
# Configuration — the parts a customer is most likely to change.
# --------------------------------------------------------------------------

# Tiers switched off: every franchisee editor may use every component and
# approved template, and nobody edits page layouts. Set to True to gate them
# by the franchisee's tier (the CSV's tier column) as configured below.
USE_TIERS = False

TIERS = ["basic", "standard", "advanced"]

# Page components each tier may add. Tiers are cumulative: Standard gets
# Basic's components too, Advanced gets everything. Each tier's content types
# live in /_components/<tier>/ and take their permissions from that folder.
TIER_COMPONENTS = {
    "basic": ["FranchiseePage", "SandlerHero", "SandlerFeatureGrid", "SandlerRichText",
              "SandlerCenterHero", "SandlerCenterIntro"],
    "standard": ["SandlerLocalCenter", "SandlerEventList", "SandlerTestimonialList"],
    "advanced": ["SandlerArticleList", "SandlerReviewForm", "HubSpotForm"],
}

# Templates each tier may use (by title). Also cumulative.
TIER_TEMPLATES = {
    "basic": ["Sandler Full Width"],
    "standard": [],
    "advanced": ["Sandler Detail"],
}

# Tiers allowed to change a page's layout (rows and columns) in the editor.
LAYOUT_EDITING_TIERS = ["advanced"]

# The shared image library franchisees can pick images from.
IMAGE_LIBRARY = "/images"

# The franchisee's folder: its training center page (/locations/<slug>) and
# any pages of its own beneath it (/locations/<slug>/<page>).
FRANCHISEE_FOLDER = "/locations/{slug}"

# The template for a new franchisee's center page is a real page in dotCMS,
# /_franchisee-skeleton/index (HQ only). A franchisee without a center page
# gets a copy of it: the same sections in the same places, with
# "{{franchisee}}" in any text replaced by the franchisee's name. HQ changes
# what new franchisees start with by editing that page — no code change.
# SKELETON_PAGES below only seeds the template when it doesn't exist yet.
SKELETON_FOLDER = "/_franchisee-skeleton"
SKELETON_TEMPLATE = "Sandler Full Width"
STARTER_BODY = json.dumps({"type": "doc", "content": [
    {"type": "heading", "attrs": {"level": 2}, "content": [
        {"type": "text", "text": "Sales training built around your business"}]},
    {"type": "paragraph", "content": [{"type": "text", "text":
        "{{franchisee}} works with sales teams, managers and business owners to "
        "build a repeatable way of selling — through workshops, online programs "
        "and one-to-one coaching."}]},
]})
SKELETON_PAGES = [
    {"url": "index", "title": "{{franchisee}} | Sandler", "sections": [
        {"contentType": "SandlerCenterHero", "title": "{{franchisee}} — hero",
         "headline": "Sales Training from {{franchisee}}",
         "subtitle": "Locally owned, globally proven. We help your team sell with a "
                     "repeatable process."},
        {"contentType": "SandlerCenterIntro", "title": "{{franchisee}} — intro",
         "eyebrow": "About {{franchisee}}",
         "heading": "Grow your people. Strengthen your organization.",
         "intro": "Every engagement starts by understanding how your team sells "
                  "today, before recommending any training."},
        {"contentType": "SandlerRichText", "title": "{{franchisee}} — about",
         "body": STARTER_BODY},
        {"contentType": "SandlerFeatureGrid", "title": "{{franchisee}} — why choose us",
         "eyebrow": "Why Sandler", "heading": "Why Choose {{franchisee}}?",
         "layout": "cards", "theme": "dark",
         "items": "A proven system | The Sandler Selling System, used by sales teams worldwide\n"
                  "Local coaches | People who know your market\n"
                  "Reinforcement | Ongoing coaching so new habits stick"},
        {"contentType": "SandlerTestimonialList", "title": "{{franchisee}} — testimonials",
         "heading": "What clients say", "limit": "3",
         "emptyText": "Client stories are coming soon."},
        {"contentType": "SandlerEventList", "title": "{{franchisee}} — events",
         "heading": "Upcoming events", "emptyText": "No upcoming events right now."},
    ]},
]

WORKFLOW_NAME = "Franchisee Publishing"

# "Publish & Translate" (HQ only): publishes, then dotAI translates the text
# fields into these languages. Fields that must not change — links, slugs,
# HubSpot IDs and field names, layout settings — are left alone.
# "*" = every language on the instance. A list like "es,fr" is silently
# ignored by dotAI (nothing gets translated), so use "*" or lang-country codes.
TRANSLATE_TO = "*"
TRANSLATE_IGNORE = ("urlTitle,primaryCtaLink,secondaryCtaLink,ctaLink,portalId,formId,"
                    "region,formFields,centerProperty,layout,theme,size,limit")
DRAFT, IN_REVIEW, PUBLISHED = "Draft", "In Review", "Published"

# Tool groups (back-office menus). dotCMS has no API to create a tool group,
# so FRANCHISEE_LAYOUT must be created once by hand (Settings → Roles & Tools
# → Tools → Create Tool Group); the script then fills and assigns it.
FRANCHISEE_LAYOUT = "Franchisee Workspace"
FRANCHISEE_PORTLETS = ["site-browser", "pages", "content", "content-drive", "workflow"]
REVIEWER_LAYOUTS = ["Site", "Content", "Digital Assets", "Dashboard"]
# Given to franchisee users until FRANCHISEE_LAYOUT exists, so they can sign
# in and work meanwhile: Pages + Browser (Site), the workflow inbox
# (Dashboard) and the Content Drive (Content).
FALLBACK_LAYOUTS = ["Site", "Dashboard", "Content"]

# --------------------------------------------------------------------------
# Role keys. Role names follow the naming in the role model; keys are what
# the script uses to find a role again on the next run.
# --------------------------------------------------------------------------

HQ_ROOT, HQ_ADMIN, HQ_REVIEWER = "hq", "hq-admin", "hq-reviewer"
FRANCHISEES_ROOT = "franchisees"
# Held by every franchisee user: read access to the global pages.
ALL_FRANCHISEES = "franchisees-all"
# Held by every franchisee editor: the workflow's Save / Submit for Review.
ALL_EDITORS = "franchisees-editors"
TIERS_ROOT = "tiers"
BACK_END_USER = "DOTCMS_BACK_END_USER"
ANONYMOUS = "CMS Anonymous"


def tier_key(tier):
    return f"tier-{tier}"


def editor_key(slug):
    return f"franchisee-{slug}-editor"


def viewer_key(slug):
    return f"franchisee-{slug}-viewer"


def master_key(slug):
    return f"master-{slug}"


# Permission levels.
VIEW = ["READ"]
EDIT = ["READ", "WRITE", "CAN_ADD_CHILDREN"]
PUBLISH = ["READ", "WRITE", "PUBLISH", "CAN_ADD_CHILDREN"]
ALL = PUBLISH + ["EDIT_PERMISSIONS"]


def on_folder(levels):
    """The same levels on a folder and on everything inside it."""
    content = [p for p in levels if p != "CAN_ADD_CHILDREN"]
    return {"INDIVIDUAL": levels, "FOLDER": levels, "PAGE": content,
            "CONTENT": content, "LINK": content}


# --------------------------------------------------------------------------
# dotCMS API
# --------------------------------------------------------------------------

def _tls_context():
    """python.org builds of Python on macOS ship without CA certificates;
    use certifi's if installed, else the system bundle."""
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        pass
    if os.path.exists("/etc/ssl/cert.pem"):
        return ssl.create_default_context(cafile="/etc/ssl/cert.pem")
    return ssl.create_default_context()


TLS = _tls_context()


def api(method, path, payload=None):
    if not TOKEN:
        sys.exit("error: set DOTCMS_AUTH_TOKEN to an admin API token")
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(f"{HOST}{path}", data=data, method=method, headers={
        "Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120, context=TLS) as res:
            body = res.read().decode()
    except urllib.error.HTTPError as e:
        body = e.read().decode()
    try:
        parsed = json.loads(body) if body else {}
    except ValueError:
        parsed = None
    # Some errors come back as a bare value (e.g. a missing type is "404").
    return parsed if isinstance(parsed, (dict, list)) else {"_raw": body[:300]}


def entity(resp, what):
    if isinstance(resp, dict) and resp.get("entity") is not None:
        return resp["entity"]
    sys.exit(f"  ! {what} failed: {json.dumps(resp)[:400]}")


def search(query, limit=500):
    resp = api("POST", "/api/content/_search", {"query": query, "limit": limit})
    return entity(resp, "search")["jsonObjectView"]["contentlets"]


def fire(contentlet, action="PUBLISH"):
    resp = api("PUT", f"/api/v1/workflow/actions/default/fire/{action}",
               {"contentlet": contentlet})
    e = resp.get("entity")
    if not (isinstance(e, dict) and e.get("identifier")):
        sys.exit(f"  ! saving {contentlet.get('contentType')} failed: {json.dumps(resp)[:400]}")
    return e


# --------------------------------------------------------------------------
# Roles
# --------------------------------------------------------------------------

class Roles:
    """Every role on the instance, indexed by key and by name."""

    def __init__(self):
        self.by_key, self.by_name = {}, {}
        for root in entity(api("GET", "/api/v1/roles"), "list roles"):
            self._index(root)
        for r in entity(api("GET", "/api/v1/roles/_search?searchName=&count=1000"
                                   "&includeWorkflowRoles=true"), "search roles"):
            self.by_name.setdefault(r["name"], r)
            if r.get("roleKey"):
                self.by_key.setdefault(r["roleKey"], r)

    def _index(self, role):
        if role.get("roleKey"):
            self.by_key[role["roleKey"]] = role
        self.by_name.setdefault(role["name"], role)
        # Nested levels come back with a child count but no children.
        children = role.get("roleChildren")
        if role.get("childCount") and len(children or []) < role["childCount"]:
            children = entity(api("GET", f"/api/v1/roles/{role['id']}"), "role").get("roleChildren")
        for child in children or []:
            self._index(child)

    def id(self, key):
        role = self.by_key.get(key) or self.by_name.get(key)
        if not role:
            sys.exit(f"  ! role {key} not found")
        return role["id"]

    def ensure(self, key, name, parent=None, description=""):
        """Create the role, or put its name and place in the tree right."""
        form = {"roleName": name, "roleKey": key, "description": description,
                # "Edit permissions" here means the role's own permissions
                # can be edited; without it no permission can be granted to it.
                "canEditUsers": True, "canEditPermissions": True, "canEditLayouts": True,
                "parentRoleId": self.id(parent) if parent else None}
        role = self.by_key.get(key)
        if role:
            parent_ok = (role.get("parent") == form["parentRoleId"]
                         or (not parent and role.get("parent") == role["id"]))
            if role["name"] != name or not parent_ok:
                entity(api("PUT", f"/api/v1/roles/{role['id']}", form), f"update role {name}")
                print(f"  role {name}: updated")
            return role["id"]
        role = entity(api("POST", "/api/v1/roles", form), f"create role {name}")
        self.by_key[key] = role
        self.by_name[name] = role
        print(f"  role {name}: created")
        return role["id"]


def ensure_roles(roles, franchisees):
    print("Roles")
    roles.ensure(HQ_ROOT, "HQ", description="Sandler headquarters")
    roles.ensure(HQ_ADMIN, "HQ – Admin", HQ_ROOT, "Full control of everything")
    roles.ensure(HQ_REVIEWER, "HQ – Reviewer", HQ_ROOT,
                 "Can publish; approves franchisee changes")
    roles.ensure(FRANCHISEES_ROOT, "Franchisees",
                 description="Folder for franchisee roles. Never assign users to it: "
                             "a user holding a parent role holds all of its children.")
    roles.ensure(ALL_FRANCHISEES, "All franchisees", FRANCHISEES_ROOT,
                 "Every franchisee user: view the global pages and HQ articles")
    roles.ensure(ALL_EDITORS, "All franchisee editors", FRANCHISEES_ROOT,
                 "Every franchisee editor: may use Save and Submit for Review")
    if USE_TIERS:
        roles.ensure(TIERS_ROOT, "Tiers", description="What a user can use: components, "
                     "templates, layout editing. Never assign users to this parent role.")
        for tier in TIERS:
            roles.ensure(tier_key(tier), f"Tier – {tier.title()}", TIERS_ROOT)
    for slug, f in franchisees.items():
        roles.ensure(f"franchisee-{slug}", slug, FRANCHISEES_ROOT, f["name"])
        roles.ensure(editor_key(slug), f"Franchisee – {slug} – Editor", f"franchisee-{slug}",
                     f"Edit and submit for review in /{slug}/")
        roles.ensure(viewer_key(slug), f"Franchisee – {slug} – Viewer", f"franchisee-{slug}",
                     f"View only in /{slug}/")
        if f["subs"]:
            roles.ensure(master_key(slug), f"Master – {slug}", f"franchisee-{slug}",
                         "Rights over the folders of: " + ", ".join(sorted(f["subs"])))


# --------------------------------------------------------------------------
# Permissions
# --------------------------------------------------------------------------

EMPTY_SCOPES = {s: [] for s in ["INDIVIDUAL", "FOLDER", "PAGE", "CONTENT", "LINK",
                                "CONTENT_TYPE", "TEMPLATE", "TEMPLATE_LAYOUT", "CONTAINER"]}


def grant(role_id, asset_id, scopes, label):
    """Set one role's permissions on a site or folder. Scopes left out are
    kept; an empty list removes that scope. Breaks inheritance if needed."""
    resp = api("PUT", f"/api/v1/permissions/role/{role_id}/asset/{asset_id}",
               {"permissions": scopes})
    entity(resp, f"permissions on {label}")


def set_exact(asset_id, wanted, label, keep=()):
    """Give the folder exactly `wanted` ({role id: scopes}); remove every
    other role except those in `keep`."""
    current = entity(api("GET", f"/api/v1/permissions/{asset_id}"), f"read {label}")
    for role_id, scopes in wanted.items():
        grant(role_id, asset_id, scopes, label)
    for p in current["permissions"]:
        if p["roleId"] not in wanted and p["roleId"] not in keep:
            grant(p["roleId"], asset_id, EMPTY_SCOPES, label)
            print(f"    removed {p['roleName']} from {label}")


def folder(path, site_id):
    """Create the folder if needed and return its identifier."""
    api("POST", f"/api/v1/folder/createfolders/{SITE_NAME}", [path])
    for f in entity(api("POST", "/api/v1/folder/byPath", {"path": f"//{SITE_NAME}{path}/"}),
                    f"folder {path}"):
        if f["path"].rstrip("/") == path:
            return f["id"]
    sys.exit(f"  ! folder {path} not found after creating it")


def site_permissions(roles, site_id):
    print("Site-wide permissions")
    grant(roles.id(HQ_ADMIN), site_id, {
        **on_folder(ALL), "TEMPLATE": ALL, "TEMPLATE_LAYOUT": ALL, "CONTAINER": ALL,
        "CONTENT_TYPE": ALL, "CATEGORY": ALL, "RULE": ALL}, SITE_NAME)
    grant(roles.id(HQ_REVIEWER), site_id, {
        **on_folder(PUBLISH), "TEMPLATE": VIEW, "CONTAINER": VIEW,
        "CONTENT_TYPE": VIEW, "CATEGORY": VIEW}, SITE_NAME)
    # Global pages and HQ articles: view only. Franchisee folders don't
    # inherit this — their permissions are set on the folder.
    grant(roles.id(ALL_FRANCHISEES), site_id, {**on_folder(VIEW), "CONTAINER": VIEW},
          SITE_NAME)
    for tier in TIERS:
        if tier_key(tier) in roles.by_key:
            layout = VIEW + ["WRITE"] if USE_TIERS and tier in LAYOUT_EDITING_TIERS else []
            grant(roles.id(tier_key(tier)), site_id, {"TEMPLATE_LAYOUT": layout}, SITE_NAME)
    print(f"  {SITE_NAME}: HQ, all franchisees" + (", tiers" if USE_TIERS else ""))

    images = folder(IMAGE_LIBRARY, site_id)
    set_exact(images, {
        roles.id(ANONYMOUS): on_folder(VIEW),
        roles.id(HQ_ADMIN): on_folder(ALL),
        roles.id(HQ_REVIEWER): on_folder(PUBLISH),
        roles.id(ALL_FRANCHISEES): on_folder(VIEW),
    }, IMAGE_LIBRARY)
    print(f"  {IMAGE_LIBRARY}: franchisees view, HQ reviewers manage")


# --------------------------------------------------------------------------
# Components (content types) and templates by tier
# --------------------------------------------------------------------------

def tiers_from(tier):
    """The tier and every tier above it."""
    return TIERS[TIERS.index(tier):]


def component_users(roles, tier):
    """Roles that may use this tier's components and templates."""
    if not USE_TIERS:
        return [roles.id(ALL_EDITORS)]
    return [roles.id(tier_key(t)) for t in tiers_from(tier)]


def ensure_page_type(site_id, scheme_id):
    """A page type of our own, so franchisee pages can use the Franchisee
    Publishing workflow without changing the instance-wide Page type."""
    existing = api("GET", "/api/v1/contenttype/id/FranchiseePage").get("entity")
    if isinstance(existing, dict) and existing.get("id"):
        return existing
    base = entity(api("GET", "/api/v1/contenttype/id/htmlpageasset"), "Page type")
    fields = [{k: v for k, v in f.items() if k not in ("id", "contentTypeId", "iDate", "modDate")}
              for f in base["fields"]]
    body = {"clazz": base["clazz"], "name": "Franchisee Page", "variable": "FranchiseePage",
            "description": "A page in a franchisee's folder", "host": site_id,
            "icon": "storefront", "workflow": [scheme_id], "fields": fields}
    created = entity(api("POST", "/api/v1/contenttype", [body]), "create Franchisee Page type")
    print("  type FranchiseePage: created")
    return created[0]


def components(roles, site_id, scheme_id):
    print("Components and templates" + (" by tier" if USE_TIERS else " (tiers off: all editors)"))
    ensure_page_type(site_id, scheme_id)
    for tier in TIERS:
        path = f"/_components/{tier}"
        folder_id = folder(path, site_id)
        # Content types in this folder inherit these permissions: the tier and
        # the tiers above it may use them; HQ as usual. Franchisees don't get
        # to browse the folder itself.
        wanted = {roles.id(HQ_ADMIN): {**on_folder(ALL), "CONTENT_TYPE": ALL},
                  roles.id(HQ_REVIEWER): {**on_folder(VIEW), "CONTENT_TYPE": VIEW}}
        for role_id in component_users(roles, tier):
            wanted[role_id] = {"CONTENT_TYPE": VIEW}
        set_exact(folder_id, wanted, path)
        for variable in TIER_COMPONENTS[tier]:
            ct = entity(api("GET", f"/api/v1/contenttype/id/{variable}"), f"type {variable}")
            if ct.get("folder") != folder_id:
                ct["folder"] = folder_id
                ct.pop("workflows", None)
                ct["workflow"] = [w["id"] for w in ct.get("workflows") or []] or [scheme_id]
                moved = entity(api("PUT", f"/api/v1/contenttype/id/{ct['id']}", ct),
                               f"move {variable}")
                print(f"  {variable} → {path}" + ("" if moved.get("folder") == folder_id
                                                  else "  ! folder not saved"))

    templates = entity(api("GET", f"/api/v1/templates?per_page=100&host={site_id}"), "templates")
    for t in templates:
        allowed = [tier for tier in TIERS
                   if any(t["title"] in TIER_TEMPLATES[x] for x in TIERS[:TIERS.index(tier) + 1])]
        # Start from inherited each run, so a tier removed from the config
        # loses the template.
        api("PUT", f"/api/v1/permissions/{t['identifier']}/_reset")
        if not allowed:
            continue
        perms = [{"roleId": roles.id(HQ_ADMIN), "individual": ALL},
                 {"roleId": roles.id(HQ_REVIEWER), "individual": VIEW}]
        users_of = {r for tier in allowed for r in component_users(roles, tier)}
        perms += [{"roleId": r, "individual": VIEW} for r in sorted(users_of)]
        entity(api("PUT", f"/api/v1/permissions/{t['identifier']}", {"permissions": perms}),
               f"template {t['title']}")
        print(f"  template {t['title']}: " + (", ".join(allowed) if USE_TIERS else "all editors"))


# --------------------------------------------------------------------------
# Workflow: Draft → In Review → Published
# --------------------------------------------------------------------------

ACTIONLET = "com.dotmarketing.portlets.workflows.actionlet."
SHOW_ON = ["NEW", "EDITING", "LOCKED", "UNLOCKED", "PUBLISHED", "UNPUBLISHED", "LISTING"]


def workflow(roles):
    print(f"Workflow {WORKFLOW_NAME}")
    schemes = entity(api("GET", "/api/v1/workflow/schemes"), "schemes")
    scheme = next((s["id"] for s in schemes if s["name"] == WORKFLOW_NAME), None)
    if not scheme:
        scheme = entity(api("POST", "/api/v1/workflow/schemes", {
            "schemeName": WORKFLOW_NAME, "schemeArchived": False,
            "schemeDescription": "Franchisees edit and submit; HQ reviewers publish."}),
            "create scheme")["id"]
        print("  scheme created")
    steps = {s["name"]: s["id"] for s in entity(
        api("GET", f"/api/v1/workflow/schemes/{scheme}/steps"), "steps")}
    for name in [DRAFT, IN_REVIEW, PUBLISHED]:
        if name not in steps:
            steps[name] = entity(api("POST", "/api/v1/workflow/steps", {
                "schemeId": scheme, "stepName": name, "stepResolved": name == PUBLISHED,
                "enableEscalation": False, "escalationAction": "", "escalationTime": "0"}),
                f"step {name}")["id"]
            print(f"  step {name}")

    editors, admin, reviewer = roles.id(ALL_EDITORS), roles.id(HQ_ADMIN), roles.id(HQ_REVIEWER)
    # Actions must name an assignee even when nothing is assigned; the
    # System Workflow's own actions use CMS Anonymous.
    nobody = roles.id(ANONYMOUS)
    actions = [
        # name, on steps, next step, actionlets, who can use, assign to, icon
        ("Save", [DRAFT, PUBLISHED], DRAFT, ["SaveContentActionlet"],
         [editors, reviewer, admin], nobody, "saveIcon"),
        ("Submit for Review", [DRAFT], IN_REVIEW,
         ["SaveContentActionlet", "CheckinContentActionlet"],
         [editors, admin], reviewer, "shareIcon"),
        ("Publish", [DRAFT, IN_REVIEW, PUBLISHED], PUBLISHED,
         ["SaveContentActionlet", "PublishContentActionlet", "CheckinContentActionlet"],
         [reviewer, admin], nobody, "publishIcon"),
        ("Reject", [IN_REVIEW], DRAFT, ["CheckinContentActionlet"],
         [reviewer, admin], nobody, "cancelIcon"),
        ("Unpublish", [PUBLISHED], DRAFT, ["UnpublishContentActionlet"],
         [reviewer, admin], nobody, "unpublishIcon"),
        ("Archive", [DRAFT], DRAFT, ["ArchiveContentActionlet"],
         [reviewer, admin], nobody, "archiveIcon"),
        ("Publish & Translate", [DRAFT, IN_REVIEW, PUBLISHED], PUBLISHED,
         ["SaveContentActionlet", "PublishContentActionlet",
          ("com.dotcms.ai.workflow.OpenAITranslationActionlet", {
              "translateTo": TRANSLATE_TO, "fieldTypes": "text,wysiwyg,textarea,storyblock",
              "translateFields": "", "ignoreFields": TRANSLATE_IGNORE,
              "translationkeyPrefix": ""}),
          "CheckinContentActionlet"],
         [reviewer, admin], nobody, "publishIcon"),
    ]
    have = {a["name"]: a["id"] for a in entity(
        api("GET", f"/api/v1/workflow/schemes/{scheme}/actions"), "actions")}
    for name, on_steps, next_step, actionlets, who, assign, icon in actions:
        form = {"schemeId": scheme, "stepId": steps[on_steps[0]], "actionName": name,
                "whoCanUse": who, "actionIcon": icon, "actionAssignable": False,
                "actionCommentable": name in ("Submit for Review", "Reject"),
                "actionRoleHierarchyForAssign": False, "showOn": SHOW_ON,
                "actionNextStep": steps[next_step], "actionNextAssign": assign,
                "actionCondition": ""}
        if name in have:
            # Re-applied every run so who-can-use always matches this script.
            entity(api("PUT", f"/api/v1/workflow/actions/{have[name]}", form), f"update {name}")
        else:
            have[name] = entity(api("POST", "/api/v1/workflow/actions", form), f"create {name}")["id"]
            for order, actionlet in enumerate(actionlets):
                # A bare name is one of dotCMS's own actionlets; a (class,
                # parameters) pair is anything else, e.g. dotAI's.
                clazz, params = actionlet if isinstance(actionlet, tuple) else (ACTIONLET + actionlet, {})
                api("POST", f"/api/v1/workflow/actions/{have[name]}/actionlets",
                    {"actionletClass": clazz, "order": order, "parameters": params})
            print(f"  action {name}")
        for step in on_steps:
            on_step = {a["id"] for a in entity(
                api("GET", f"/api/v1/workflow/steps/{steps[step]}/actions"), "step actions")}
            if have[name] not in on_step:
                api("POST", f"/api/v1/workflow/steps/{steps[step]}/actions", {"actionId": have[name]})
    # API calls such as fire/PUBLISH use these defaults.
    for system_action, name in [("NEW", "Save"), ("EDIT", "Save"), ("PUBLISH", "Publish"),
                                ("UNPUBLISH", "Unpublish"), ("ARCHIVE", "Archive")]:
        api("PUT", "/api/v1/workflow/system/actions",
            {"actionId": have[name], "schemeId": scheme, "systemAction": system_action})
    print("  actions: Save / Submit for Review → franchisee editors; "
          "Publish / Publish & Translate / Reject / Unpublish / Archive → HQ")
    return scheme


def use_workflow(scheme_id):
    """Make Franchisee Publishing the only workflow of every component type.
    It has to be the only one: content sitting in a System Workflow step
    only offers that step's actions, whose Publish franchisees must not get."""
    for variable in [v for tier in TIERS for v in TIER_COMPONENTS[tier]]:
        ct = entity(api("GET", f"/api/v1/contenttype/id/{variable}"), f"type {variable}")
        if [w["id"] for w in ct.get("workflows") or []] != [scheme_id]:
            ct.pop("workflows", None)
            ct["workflow"] = [scheme_id]
            entity(api("PUT", f"/api/v1/contenttype/id/{ct['id']}", ct), f"workflow of {variable}")
            print(f"  {variable}: uses {WORKFLOW_NAME}")


# --------------------------------------------------------------------------
# Back-office menus
# --------------------------------------------------------------------------

def menus(roles):
    print("Back-office menus")
    layouts = {l["name"]: l for l in entity(api("GET", "/api/v1/roles/layouts"), "layouts")}

    def assign(role_key, names):
        ids = [layouts[n]["id"] for n in names if n in layouts]
        if ids:
            entity(api("POST", "/api/v1/roles/layouts",
                       {"roleId": roles.id(role_key), "layoutIds": ids}), f"layouts for {role_key}")

    assign(HQ_ADMIN, list(layouts))
    assign(HQ_REVIEWER, REVIEWER_LAYOUTS)
    workspace = layouts.get(FRANCHISEE_LAYOUT)
    if not workspace:
        assign(ALL_FRANCHISEES, FALLBACK_LAYOUTS)
        print(f"  ! tool group “{FRANCHISEE_LAYOUT}” doesn't exist yet, so franchisee users get "
              f"{' + '.join(FALLBACK_LAYOUTS)} for now. dotCMS can't create tool groups through "
              "the API: create it once in Settings → Roles & Tools → Tools → Create Tool Group, "
              "then run this script again.")
        return
    fallback = [layouts[n]["id"] for n in FALLBACK_LAYOUTS if n in layouts]
    if fallback:
        api("DELETE", "/api/v1/roles/layouts",
            {"roleId": roles.id(ALL_FRANCHISEES), "layoutIds": fallback})
    for portlet in FRANCHISEE_PORTLETS:
        if portlet not in workspace["portletIds"]:
            api("PUT", f"/api/v1/portlet/custom/{portlet}/_addtolayout/{workspace['id']}")
    extra = set(workspace["portletIds"]) - set(FRANCHISEE_PORTLETS)
    if extra:
        print(f"  ! {FRANCHISEE_LAYOUT} also has {', '.join(sorted(extra))} — remove them in the UI")
    assign(ALL_FRANCHISEES, [FRANCHISEE_LAYOUT])
    print(f"  {FRANCHISEE_LAYOUT}: {', '.join(FRANCHISEE_PORTLETS)} → all franchisees")


# --------------------------------------------------------------------------
# Franchisee folders and starter pages
# --------------------------------------------------------------------------

def fill(value, name):
    return value.replace("{{franchisee}}", name) if isinstance(value, str) else value


def template_id(site_id):
    for t in entity(api("GET", f"/api/v1/templates?per_page=100&host={site_id}"), "templates"):
        if t["title"] == SKELETON_TEMPLATE:
            return t["identifier"]
    sys.exit(f"  ! template {SKELETON_TEMPLATE} not found")


def create_page(site_id, path, spec, name, template):
    """One page with its sections, published. Text fields get the
    franchisee's name filled in."""
    ids = []
    for section in spec["sections"]:
        fields = {k: fill(v, name) for k, v in section.items()}
        ids.append(fire({**fields, "site": f"{site_id}:{path}", "languageId": 1})["identifier"])
    title = fill(spec["title"], name)
    page = fire({"contentType": "FranchiseePage", "title": title, "friendlyName": title,
                 "url": spec["url"], "hostFolder": f"{site_id}:{path}", "template": template,
                 "cachettl": "0", "languageId": 1, "sortOrder": 0})
    api("POST", f"/api/v1/page/{page['identifier']}/content", [
        {"identifier": "SYSTEM_CONTAINER", "uuid": "1", "contentletsId": ids, "personaTag": ""}])
    # Saving page content through the API leaves the page locked by
    # "system", which hides Draft mode in the editor. Release it.
    api("PUT", f"/api/v1/content/_unlock/{page['inode']}")
    return page


# Field kinds that hold no value of their own.
LAYOUT_FIELDS = ("RowField", "ColumnField", "TabDividerField", "LineDividerField")


def upload_by_url(path):
    """A binary field's file (e.g. /dA/…/image/x.png), re-uploaded so the copy
    gets a file of its own. Returns a temp file id for the new contentlet."""
    url = path if path.startswith("http") else HOST + path.split("?")[0]
    resp = api("POST", "/api/v1/temp/byUrl", {"remoteUrl": url})
    files = resp.get("tempFiles") or (resp.get("entity") or {}).get("tempFiles") or []
    return files[0]["id"] if files else None


def copy_contentlet(identifier, site_id, path, name):
    """A new contentlet with the same fields, in `path`, with the
    franchisee's name filled in. Returns its identifier."""
    src = search(f"+identifier:{identifier} +languageId:1 +live:true", 1)
    if not src:
        return None
    src = src[0]
    ctype = entity(api("GET", f"/api/v1/contenttype/id/{src['contentType']}"), "type")
    fields = {"contentType": src["contentType"], "languageId": 1}
    for f in ctype["fields"]:
        kind, var, value = f["clazz"].rsplit(".", 1)[-1], f["variable"], src.get(f["variable"])
        if kind.endswith("HostFolderField"):
            fields[var] = f"{site_id}:{path}"  # the copy lives in the franchisee's folder
        elif kind.endswith(LAYOUT_FIELDS) or value in (None, ""):
            continue
        elif kind.endswith(("BinaryField", "ImageField", "FileField")):
            temp = upload_by_url(value if isinstance(value, str) else value.get("idPath", ""))
            if temp:
                fields[var] = temp
        elif isinstance(value, (dict, list)) and kind.endswith("StoryBlockField"):
            fields[var] = fill(json.dumps(value), name)
        elif isinstance(value, list):
            fields[var] = ",".join(str(v) for v in value)
        else:
            fields[var] = fill(value, name)
    return fire(fields)["identifier"]


def copy_template_page(site_id, path, name):
    """Copy the template page (sections, their places, template, title) into
    `path` as its index page, for franchisee `name`."""
    tpl = entity(api("GET", f"/api/v1/page/json{SKELETON_FOLDER}/index?host_id={site_id}&language_id=1"),
                 "template page")
    page_src = tpl["page"]
    slots = []
    for container_id, container in (tpl.get("containers") or {}).items():
        for uuid, items in container["contentlets"].items():
            ids = [i for i in (copy_contentlet(c["identifier"], site_id, path, name) for c in items) if i]
            if ids:
                slots.append({"identifier": container_id.split(":")[0] if ":" in container_id else container_id,
                              "uuid": uuid.replace("uuid-", ""), "contentletsId": ids, "personaTag": ""})
    title = fill(page_src.get("title", "{{franchisee}} | Sandler"), name)
    page = fire({"contentType": "FranchiseePage", "title": title, "friendlyName": title,
                 "url": "index", "hostFolder": f"{site_id}:{path}", "template": page_src["template"],
                 "cachettl": "0", "languageId": 1, "sortOrder": 0})
    api("POST", f"/api/v1/page/{page['identifier']}/content", slots)
    # Saving page content through the API leaves the page locked by
    # "system", which hides Draft mode in the editor. Release it.
    api("PUT", f"/api/v1/content/_unlock/{page['inode']}")
    return page


def existing_pages(site_id, path):
    """Page names in a folder, of any page type (the site builder's center
    pages are ordinary Pages). The search returns the full path
    ("/locations/cora/index"); keep the name."""
    return {p["url"].rsplit("/", 1)[-1] for p in search(
        f"+basetype:5 +conHost:{site_id} +parentPath:{path}/ +deleted:false")}


def skeleton(roles, site_id):
    """The template page for new franchisees, in a folder only HQ can see.
    Created from SKELETON_PAGES the first time; after that it's edited in
    dotCMS and left alone here."""
    print("Skeleton folder")
    folder_id = folder(SKELETON_FOLDER, site_id)
    set_exact(folder_id, {roles.id(HQ_ADMIN): on_folder(ALL),
                          roles.id(HQ_REVIEWER): on_folder(PUBLISH)}, SKELETON_FOLDER)
    have = existing_pages(site_id, SKELETON_FOLDER)
    template = template_id(site_id)
    for spec in SKELETON_PAGES:
        if spec["url"] not in have:
            create_page(site_id, SKELETON_FOLDER, spec, "{{franchisee}}", template)
            print(f"  {SKELETON_FOLDER}/{spec['url']}: created")


def franchisee_folder(roles, site_id, slug, f, masters):
    path = FRANCHISEE_FOLDER.format(slug=slug)
    if not search(f"+contentType:TrainingCenter +conHost:{site_id} "
                  f"+TrainingCenter.urlTitle:{slug} +languageId:1", 1):
        print(f"  ! {slug}: no Training Center with this URL slug — its page at {path} "
              "won't show center details until one is created")
    folder_id = folder(path, site_id)
    wanted = {
        # The folder holds the franchisee's public pages.
        roles.id(ANONYMOUS): on_folder(VIEW),
        roles.id(HQ_ADMIN): on_folder(ALL),
        roles.id(HQ_REVIEWER): on_folder(PUBLISH),
        roles.id(editor_key(slug)): on_folder(EDIT),
        roles.id(viewer_key(slug)): on_folder(VIEW),
    }
    if masters.get(slug):
        wanted[roles.id(master_key(masters[slug]))] = on_folder(EDIT)
    set_exact(folder_id, wanted, path)

    # The starter center page, only if the folder has no page of that name
    # yet — so a franchisee's own edits (or the site's page) are never replaced.
    have = existing_pages(site_id, path)
    missing = "index" not in have
    if missing:
        copy_template_page(site_id, path, f["name"])
    print(f"  {path}: permissions set" + (", center page created from the template" if missing else ""))


# --------------------------------------------------------------------------
# Users
# --------------------------------------------------------------------------

MANAGED_PREFIXES = ("franchisee-", "master-", "tier-")
MANAGED_KEYS = {ALL_FRANCHISEES, ALL_EDITORS}


def all_users():
    resp = api("GET", "/api/v1/users/filter?" + urllib.parse.urlencode({"per_page": 1000}))
    found = resp.get("entity") or {}
    return (found.get("data") if isinstance(found, dict) else found) or []


def find_user(email):
    for u in all_users():
        if (u.get("emailAddress") or u.get("email") or "").lower() == email.lower():
            return u
    return None


def same_name(first, last):
    """An existing user with this name — e.g. one whose email was changed in
    dotCMS after it was provisioned."""
    name = f"{first} {last}".strip().lower()
    return next((u for u in all_users() if (u.get("fullName") or "").lower() == name), None)


def save_password(email, password):
    new = not os.path.exists(CREDENTIALS_FILE)
    fd = os.open(CREDENTIALS_FILE, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
    with os.fdopen(fd, "a", newline="") as out:
        w = csv.writer(out)
        if new:
            w.writerow(["email", "password", "dotcms"])
        w.writerow([email, password, HOST])


def users(roles, rows, franchisees, masters):
    print("Users")
    wanted = {}
    for row in rows:
        u = wanted.setdefault(row["user_email"].lower(), {
            "first": row["user_first"], "last": row["user_last"], "roles": set()})
        slug, level = row["slug"], row["access_level"]
        u["roles"] |= {ALL_FRANCHISEES}
        if level == "editor":
            u["roles"] |= {editor_key(slug), ALL_EDITORS}
            if USE_TIERS:
                u["roles"].add(tier_key(franchisees[slug]["tier"]))
            if franchisees[slug]["subs"]:
                u["roles"].add(master_key(slug))
        elif level == "viewer":
            u["roles"].add(viewer_key(slug))
        else:
            sys.exit(f"  ! {row['user_email']}: access_level must be editor or viewer")

    for email, u in wanted.items():
        user = find_user(email)
        twin = None if user else same_name(u["first"], u["last"])
        if twin:
            print(f"  ! {email}: not created — {twin.get('fullName')} already exists as "
                  f"{twin.get('emailAddress')}. If that's the same person, put that email in the CSV.")
            continue
        if not user:
            password = secrets.token_urlsafe(12) + "!9a"
            created = entity(api("POST", "/api/v1/users", {
                "firstName": u["first"], "lastName": u["last"], "email": email,
                "password": list(password), "active": True}), f"create user {email}")
            save_password(email, password)
            user = find_user(email) or created
            print(f"  {email}: created (password in {os.path.basename(CREDENTIALS_FILE)})")
        user_id = user.get("userId") or user.get("id")
        target = u["roles"] | {BACK_END_USER}
        for key in sorted(target):
            api("POST", f"/api/v1/roles/{roles.id(key)}/users/{user_id}")
        # Take away managed roles the CSV no longer gives this user.
        held = entity(api("GET", f"/api/v1/roles/users/{urllib.parse.quote(user_id)}"),
                      f"roles of {email}")
        held = held if isinstance(held, list) else held.get("roles", [])
        for r in held:
            key = r.get("roleKey") or ""
            if (key.startswith(MANAGED_PREFIXES) or key in MANAGED_KEYS) and key not in target:
                api("DELETE", f"/api/v1/roles/{r['id']}/users", {"userIds": [user_id]})
                print(f"  {email}: removed {r['name']}")
        print(f"  {email}: " + ", ".join(sorted(k for k in u["roles"])))


# --------------------------------------------------------------------------
# Audit
# --------------------------------------------------------------------------

def audit(roles, site_id, franchisees, masters, scheme_id):
    """Check the rules that matter most, from what dotCMS reports."""
    print("Audit")
    problems = []
    franchisee_role_ids = {roles.id(ALL_FRANCHISEES): ALL_FRANCHISEES,
                           roles.id(ALL_EDITORS): ALL_EDITORS}
    for slug in franchisees:
        for key in (editor_key(slug), viewer_key(slug)) + ((master_key(slug),)
                                                            if franchisees[slug]["subs"] else ()):
            franchisee_role_ids[roles.id(key)] = key
    for tier in TIERS:
        if tier_key(tier) in roles.by_key:
            franchisee_role_ids[roles.id(tier_key(tier))] = tier_key(tier)

    # 1. No franchisee role can publish or edit permissions anywhere, and
    #    none has rights on another franchisee's folder.
    folder_owner = {FRANCHISEE_FOLDER.format(slug=s): s for s in franchisees}
    for role_id, key in franchisee_role_ids.items():
        view = entity(api("GET", f"/api/v1/permissions/role/{role_id}"), f"permissions of {key}")
        for asset in view.get("assets", []):
            levels = {p for scope in asset.get("permissions", {}).values() for p in scope}
            if levels & {"PUBLISH", "EDIT_PERMISSIONS"}:
                problems.append(f"{key} has {sorted(levels & {'PUBLISH', 'EDIT_PERMISSIONS'})} "
                                f"on {asset['path']}")
            owner = folder_owner.get("/" + asset["path"].split("/", 2)[-1].strip("/"))
            if owner:
                allowed = {editor_key(owner), viewer_key(owner)}
                if masters.get(owner):
                    allowed.add(master_key(masters[owner]))
                if key not in allowed and asset.get("permissions"):
                    problems.append(f"{key} has access to {asset['path']}")

    # 2. No action that publishes is usable by a franchisee role, in any
    #    workflow of any type franchisees work with.
    loose = {r: k for r, k in franchisee_role_ids.items()}
    for key in ("cms_workflow_any_who_can_view", "cms_workflow_any_who_can_edit"):
        if key in roles.by_key:
            loose[roles.by_key[key]["id"]] = key
    for variable in [v for tier in TIERS for v in TIER_COMPONENTS[tier]]:
        ct = entity(api("GET", f"/api/v1/contenttype/id/{variable}"), variable)
        for w in ct.get("workflows") or []:
            for a in entity(api("GET", f"/api/v1/workflow/schemes/{w['id']}/actions"), "actions"):
                classes = [x.get("actionlet", {}).get("clazz") or x.get("clazz") or ""
                           for x in (api("GET", f"/api/v1/workflow/actions/{a['id']}/actionlets")
                                     .get("entity") or [])]
                if not any(c.endswith("PublishContentActionlet") for c in classes):
                    continue
                who = [r["id"] if isinstance(r, dict) else r for r in a.get("whoCanUse") or []]
                for r in who:
                    if r in loose:
                        problems.append(f"{variable}: {w['name']} → {a['name']} usable by {loose[r]}")

    if problems:
        for p in sorted(set(problems)):
            print(f"  FAIL {p}")
        sys.exit(1)
    print("  PASS franchisee roles can't publish, can't edit permissions, "
          "and only reach their own folder")


# --------------------------------------------------------------------------

def read_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        rows = [{k: (v or "").strip() for k, v in r.items()} for r in csv.DictReader(f)]
    franchisees, masters = {}, {}
    for r in rows:
        f = franchisees.setdefault(r["slug"], {"name": r["franchisee"], "tier": r["tier"].lower(),
                                               "subs": set()})
        if USE_TIERS and f["tier"] not in TIERS:
            sys.exit(f"  ! {r['slug']}: tier must be one of {', '.join(TIERS)}")
        if r["master_franchise"]:
            masters[r["slug"]] = r["master_franchise"]
    for sub, master in masters.items():
        if master not in franchisees:
            sys.exit(f"  ! {sub}: master franchise {master} is not in the CSV")
        franchisees[master]["subs"].add(sub)
    return rows, franchisees, masters


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--csv", default=os.path.join(HERE, "franchisees.csv"))
    parser.add_argument("--audit-only", action="store_true")
    args = parser.parse_args()

    rows, franchisees, masters = read_csv(args.csv)
    site = entity(api("POST", "/api/v1/site/_byname", {"siteName": SITE_NAME}), f"site {SITE_NAME}")
    site_id = site["identifier"]
    print(f"{SITE_NAME} on {HOST}: {len(franchisees)} franchisees, "
          f"{len({r['user_email'].lower() for r in rows})} users")

    roles = Roles()
    if not args.audit_only:
        ensure_roles(roles, franchisees)
        scheme = workflow(roles)
        components(roles, site_id, scheme)
        use_workflow(scheme)
        site_permissions(roles, site_id)
        menus(roles)
        skeleton(roles, site_id)
        print("Franchisee folders")
        for slug, f in franchisees.items():
            franchisee_folder(roles, site_id, slug, f, masters)
        users(roles, rows, franchisees, masters)
    else:
        schemes = entity(api("GET", "/api/v1/workflow/schemes"), "schemes")
        scheme = next((s["id"] for s in schemes if s["name"] == WORKFLOW_NAME), None)
    audit(roles, site_id, franchisees, masters, scheme)


if __name__ == "__main__":
    main()
