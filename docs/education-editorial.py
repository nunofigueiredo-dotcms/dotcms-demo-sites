#!/usr/bin/env python3
"""Staff roles, permissions and the page approval workflow for the Texas
School for the Deaf demo (educationdemo.com).

Creates three roles, their backend tools and permissions, the "TSD Page
Approval" workflow on every TSD content type, and three demo users:

    Draft ──Submit for review──▶ In Review ──Approve & publish──▶ Published
      ▲                            │
      └────────Send back───────────┘            (Save on Published → Draft)

- TSD Contributor (Dana Reyes): edits any page and content on the site and
  submits it for review; cannot publish.
- TSD Outreach Editor (Sam Ortiz): the same, but only for the Statewide
  Outreach Center — the /outreach folder (its page, the sections on it and
  Outreach events). Everything else on the site is read-only for them.
- TSD Web Publisher (Morgan Lee): approves and publishes, sends back with a
  comment, or publishes directly. Publishing a page also publishes the TSD
  sections waiting on the site (docs/install-publish-page-sections.py).

Pages keep the System Workflow (the page type is shared by every site on the
instance), but contributors have no publish permission, so "Publish Page"
can't push their unapproved changes live either.

Permissions follow where content lives, so the Outreach page's sections and
the Outreach events are moved into /outreach (same site, same pages).

    export DOTCMS_HOST=https://awesomedemo-dev.dotcms.dev
    export DOTCMS_AUTH_TOKEN=...          # admin
    python3 education-editorial.py

Safe to re-run: roles, the scheme, steps, actions and users are reused by
name. Demo passwords are written to education-users.local.csv (gitignored)
the first time each user is created.
"""
import csv
import os
import secrets
import string
import sys

os.environ.setdefault("DOTCMS_HOST", "https://awesomedemo-dev.dotcms.dev")
import dotcms_site as ns  # noqa: E402

SITE = os.environ.get("EDUCATION_SITE", "educationdemo.com")
SCHEME = "TSD Page Approval"
STEPS = ["Draft", "In Review", "Published"]
A = "com.dotmarketing.portlets.workflows.actionlet."
SHOW_ALL = ["NEW", "EDITING", "LOCKED", "UNLOCKED", "PUBLISHED", "UNPUBLISHED", "LISTING"]
SYSTEM_WORKFLOW = "d61a59e1-a49c-46f2-a929-db2b4bfa88b2"
USERS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "education-users.local.csv")
DEPARTMENT_FOLDER = "/outreach"

# Backend tools (layouts) every role sees: Site (pages, site browser),
# Content and Digital Assets. Looked up by name; ids differ per instance.
LAYOUTS = ["Site", "Content", "Digital Assets"]

ROLES = {
    "contributor": {"roleName": "TSD Contributor", "roleKey": "tsd_contributor",
                    "description": "Edits Texas School for the Deaf pages and content and submits "
                                   "them for review. Cannot publish."},
    "outreach": {"roleName": "TSD Outreach Editor", "roleKey": "tsd_outreach_editor",
                 "description": "Edits the Statewide Outreach Center section (/outreach) only, "
                                "and submits changes for review. Cannot publish."},
    "publisher": {"roleName": "TSD Web Publisher", "roleKey": "tsd_web_publisher",
                  "description": "Reviews Texas School for the Deaf changes: approves and publishes "
                                 "them, or sends them back."},
}

# Permissions, inherited by everything below the asset they're set on.
# Templates are drawn ("template layouts"), which dotCMS permissions as their
# own type. Add Children lets a role create pages and content there.
# CONTENT_TYPE READ + WRITE lets a role create content of the site's types
# (WRITE is needed to create, not only to edit the type; changing a type's
# fields still needs the Content Types tool, which these roles don't have).
EDIT = ["READ", "WRITE"]
READ_ONLY = {"INDIVIDUAL": ["READ"], "FOLDER": ["READ"], "CONTENT": ["READ"], "PAGE": ["READ"],
             "TEMPLATE": ["READ"], "TEMPLATE_LAYOUT": ["READ"], "CONTAINER": ["READ"],
             "CONTENT_TYPE": EDIT}
CONTRIBUTE = {"INDIVIDUAL": ["READ", "CAN_ADD_CHILDREN"], "FOLDER": ["READ", "CAN_ADD_CHILDREN"],
              "CONTENT": EDIT, "PAGE": EDIT, "TEMPLATE": ["READ"], "TEMPLATE_LAYOUT": ["READ"],
              "CONTAINER": ["READ"], "CONTENT_TYPE": EDIT}
PUBLISH = {**CONTRIBUTE, "FOLDER": ["READ", "WRITE", "PUBLISH", "CAN_ADD_CHILDREN"],
           "CONTENT": EDIT + ["PUBLISH"], "PAGE": EDIT + ["PUBLISH"]}
# (role, where, permissions): the site, or a folder path on it.
# A folder given its own permissions stops inheriting the site's, so the
# department folder repeats the contributor and publisher grants.
GRANTS = [("contributor", "/", CONTRIBUTE), ("publisher", "/", PUBLISH),
          ("outreach", "/", READ_ONLY), ("outreach", DEPARTMENT_FOLDER, CONTRIBUTE),
          ("contributor", DEPARTMENT_FOLDER, CONTRIBUTE), ("publisher", DEPARTMENT_FOLDER, PUBLISH)]

USERS = [
    {"role": "contributor", "email": "contributor@educationdemo.com", "firstName": "Dana", "lastName": "Reyes"},
    {"role": "outreach", "email": "outreach@educationdemo.com", "firstName": "Sam", "lastName": "Ortiz"},
    {"role": "publisher", "email": "publisher@educationdemo.com", "firstName": "Morgan", "lastName": "Lee"},
]


def entity(resp, what):
    e = resp.get("entity") if isinstance(resp, dict) else None
    if e is None or (isinstance(resp, dict) and resp.get("errors")):
        sys.exit(f"  ! {what}: {str(resp)[:300]}")
    return e


def site_id():
    return entity(ns.api("POST", "/api/v1/site/_byname", {"siteName": SITE}), "site")["identifier"]


def folder_id(site, path):
    return entity(ns.api("GET", f"/api/v1/folder/siteId/{site}/path/{path.strip('/')}"), path)["identifier"]


def all_roles():
    """Every role, flattened. (Role search skips top-level roles like ours.)"""
    def walk(x):
        if isinstance(x, list):
            for i in x:
                yield from walk(i)
        elif isinstance(x, dict):
            if "roleKey" in x:
                yield x
            for v in x.values():
                yield from walk(v)
    return list(walk(ns.api("GET", "/api/v1/roles").get("entity")))


def ensure_roles():
    ids = {}
    existing = all_roles()
    for key, form in ROLES.items():
        match = [r for r in existing if r.get("roleKey") == form["roleKey"]]
        # These flags say whether the role's users, permissions and tools can
        # be changed (by an admin), not what its members may do.
        body = {**form, "canEditUsers": True, "canEditPermissions": True, "canEditLayouts": True}
        if match:
            ids[key] = match[0]["id"]
            ns.api("PUT", f"/api/v1/roles/{ids[key]}", body)
        else:
            ids[key] = entity(ns.api("POST", "/api/v1/roles", body), f"role {form['roleName']}")["id"]
        print(f"  role {form['roleName']} -> {ids[key]}")
    return ids


def grant_layouts(role_ids):
    menu = entity(ns.api("GET", "/api/v1/menu"), "menu")
    layout_ids = [l["id"] for l in menu if (l.get("tabName") or l.get("name")) in LAYOUTS]
    for role_id in role_ids.values():
        entity(ns.api("POST", "/api/v1/roles/layouts", {"roleId": role_id, "layoutIds": layout_ids}),
               "layouts")
    print(f"  tools: {', '.join(LAYOUTS)}")


def move_department_content(site):
    """Put the Outreach page's sections and the Outreach events in /outreach,
    where the Outreach Editor's permissions apply. They stay on the site, so
    pages and lists find them as before."""
    folder = folder_id(site, DEPARTMENT_FOLDER)
    page = entity(ns.api("GET", f"/api/v1/page/json{DEPARTMENT_FOLDER}/index"
                                f"?host_id={site}&language_id=1&mode=EDIT_MODE"), "outreach page")
    sections = [x for c in page["containers"].values() for xs in c["contentlets"].values() for x in xs]
    events = ns.api("POST", "/api/content/_search", {
        "query": f"+contentType:TsdEvent +conHost:{site} +working:true +deleted:false "
                 f"+categories:tsdoutreach", "limit": 100})["entity"]["jsonObjectView"]["contentlets"]
    moved = 0
    for item in sections + events:
        if item.get("folder") == folder:
            continue
        # A partial update: dotCMS keeps the fields that aren't sent.
        ns.fire({"identifier": item["identifier"], "contentType": item["contentType"],
                 "languageId": 1, "site": folder})
        moved += 1
    print(f"  {DEPARTMENT_FOLDER}: {len(sections)} sections and {len(events)} events ({moved} moved)")


def grant_permissions(role_ids, site):
    for key, path, permissions in GRANTS:
        asset = site if path == "/" else folder_id(site, path)
        entity(ns.api("PUT", f"/api/v1/permissions/role/{role_ids[key]}/asset/{asset}?cascade=true",
                      {"permissions": permissions}), f"permissions {key} on {path}")
    # Categories (the news and event category trees) inherit from the System
    # Host; without READ there, staff can't put content in a category. Not
    # cascaded: it only adds category read access.
    for role_id in role_ids.values():
        entity(ns.api("PUT", f"/api/v1/permissions/role/{role_id}/asset/SYSTEM_HOST?cascade=false",
                      {"permissions": {"CATEGORY": ["READ"]}}), "categories")
    # Users keep cached permissions until this is flushed.
    ns.api("DELETE", "/api/v1/caches/region/Permission")
    print(f"  permissions on {SITE}: contributor edit, publisher edit + publish, "
          f"outreach editor read (edit in {DEPARTMENT_FOLDER})")


def ensure_workflow(role_ids):
    schemes = entity(ns.api("GET", "/api/v1/workflow/schemes"), "schemes")
    existing = next((s for s in schemes if s["name"] == SCHEME), None)
    scheme = existing["id"] if existing else entity(ns.api("POST", "/api/v1/workflow/schemes", {
        "schemeName": SCHEME,
        "schemeDescription": "Texas School for the Deaf: staff submit changes for review; "
                             "web publishers approve and publish them, or send them back.",
        "schemeArchived": False}), "scheme")["id"]

    steps = {s["name"]: s["id"] for s in
             ns.api("GET", f"/api/v1/workflow/schemes/{scheme}/steps").get("entity") or []}
    for name in STEPS:
        if name not in steps:
            steps[name] = entity(ns.api("POST", "/api/v1/workflow/steps", {
                "schemeId": scheme, "stepName": name, "stepResolved": name == "Published",
                "enableEscalation": False, "escalationAction": "", "escalationTime": "0"}),
                f"step {name}")["id"]
    have = {a["name"]: a["id"] for a in
            ns.api("GET", f"/api/v1/workflow/schemes/{scheme}/actions").get("entity") or []}

    staff = [role_ids["contributor"], role_ids["outreach"]]
    publisher = role_ids["publisher"]
    # Actions must name an assignee role; "Submit for review" assigns the
    # task to publishers, everything else to nobody (CMS Anonymous), as the
    # System Workflow does.
    system = ns.api("GET", f"/api/v1/workflow/schemes/{SYSTEM_WORKFLOW}/actions")
    nobody = next(a["nextAssign"] for a in system["entity"] if a.get("nextAssign"))

    def attach(action_id, on_steps):
        for step in on_steps:
            on_step = {a["id"] for a in
                       ns.api("GET", f"/api/v1/workflow/steps/{steps[step]}/actions").get("entity") or []}
            if action_id not in on_step:
                ns.api("POST", f"/api/v1/workflow/steps/{steps[step]}/actions", {"actionId": action_id})

    def set_actionlets(action_id, name, actionlets):
        """Replace the action's steps, one at a time, and check the order:
        dotCMS doesn't always keep the order it's given, and a Publish that
        runs Save after Publish leaves a draft copy of everything it publishes."""
        for _ in range(3):
            for sub in ns.api("GET", f"/api/v1/workflow/actions/{action_id}/actionlets").get("entity") or []:
                ns.api("DELETE", f"/api/v1/workflow/actionlets/{sub['id']}")
            for order, clazz in enumerate(actionlets):
                ns.api("POST", f"/api/v1/workflow/actions/{action_id}/actionlets",
                       {"actionletClass": A + clazz, "order": order, "parameters": {}})
            got = [sub.get("actionlet", {}).get("actionClass", "").rsplit(".", 1)[-1] for sub in
                   ns.api("GET", f"/api/v1/workflow/actions/{action_id}/actionlets").get("entity") or []]
            if got == actionlets:
                return
        sys.exit(f"  ! {name}: steps out of order {got}")

    def action(name, on_steps, next_step, actionlets, who, icon, comment=False, assign=None):
        if name in have:
            attach(have[name], on_steps)
            set_actionlets(have[name], name, actionlets)
            return have[name]
        a = entity(ns.api("POST", "/api/v1/workflow/actions", {
            "schemeId": scheme, "stepId": steps[on_steps[0]], "actionName": name,
            "whoCanUse": who, "actionIcon": icon, "actionAssignable": False,
            "actionCommentable": comment, "actionRoleHierarchyForAssign": False,
            "showOn": SHOW_ALL, "actionNextStep": steps.get(next_step, next_step),
            "actionNextAssign": assign or nobody, "actionCondition": ""}), f"action {name}")
        attach(a["id"], on_steps[1:])
        # (This also clears the "Notify Assignee" step dotCMS adds to new actions.)
        set_actionlets(a["id"], name, actionlets)
        print(f"  action {name}")
        return a["id"]

    ids = {
        "Save": action("Save", ["Draft", "Published"], "Draft",
                       ["SaveContentActionlet", "CheckinContentActionlet"], staff + [publisher], "saveIcon"),
        "Submit for review": action("Submit for review", ["Draft"], "In Review",
                                    ["SaveContentActionlet", "CheckinContentActionlet"],
                                    staff + [publisher], "shareIcon", comment=True, assign=publisher),
        "Approve & publish": action("Approve & publish", ["In Review"], "Published",
                                    ["PublishContentActionlet", "CheckinContentActionlet"],
                                    [publisher], "publishIcon"),
        "Send back": action("Send back", ["In Review"], "Draft",
                            ["CheckinContentActionlet"], [publisher], "cancelIcon",
                            comment=True, assign=role_ids["contributor"]),
        "Publish": action("Publish", ["Draft", "Published"], "Published",
                          ["SaveContentActionlet", "PublishContentActionlet", "CheckinContentActionlet"],
                          [publisher], "publishIcon"),
        "Unpublish": action("Unpublish", ["Published"], "Draft",
                            ["UnpublishContentActionlet", "CheckinContentActionlet"],
                            [publisher], "unpublishIcon"),
        "Archive": action("Archive", ["Draft", "Published"], "Draft",
                          ["UnpublishContentActionlet", "ArchiveContentActionlet"],
                          [publisher], "archiveIcon"),
    }
    print(f"  workflow {SCHEME} -> {scheme}")
    return scheme, ids


def assign_workflow(scheme, action_ids):
    """Make TSD Page Approval the only workflow on every TSD content type, and
    map dotCMS's default actions to it so API calls (fire/PUBLISH, the
    editor's inline save) use its steps."""
    types = entity(ns.api("GET", "/api/v1/contenttype?filter=Tsd&per_page=100"), "types")
    for t in [t for t in types if t["variable"].startswith("Tsd")]:
        full = entity(ns.api("GET", f"/api/v1/contenttype/id/{t['id']}"), t["variable"])
        if [w["id"] for w in full.get("workflows") or []] != [scheme]:
            full["workflow"] = [scheme]
            full.pop("workflows", None)
            entity(ns.api("PUT", f"/api/v1/contenttype/id/{t['id']}", full), t["variable"])
        print(f"  {t['variable']}: {SCHEME}")
    for system_action, name in [("NEW", "Save"), ("EDIT", "Save"), ("PUBLISH", "Publish"),
                                ("UNPUBLISH", "Unpublish"), ("ARCHIVE", "Archive")]:
        ns.api("PUT", "/api/v1/workflow/system/actions",
               {"actionId": action_ids[name], "schemeId": scheme, "systemAction": system_action})


def backend_role():
    return next(r["id"] for r in all_roles() if r.get("roleKey") == "DOTCMS_BACK_END_USER")


def ensure_users(role_ids):
    known = {}
    if os.path.exists(USERS_FILE):
        known = {r["email"]: r for r in csv.DictReader(open(USERS_FILE, encoding="utf-8"))}
    rows = []
    # /users/filter returns every user (its filter is a name search), so
    # match on the e-mail address here.
    users = ns.api("GET", "/api/v1/users/filter?per_page=500").get("entity") or []
    for u in USERS:
        role = role_ids[u["role"]]
        match = [x for x in users if x.get("emailAddress") == u["email"]]
        if match:
            user_id = match[0]["userId"]
            password = known.get(u["email"], {}).get("password", "(unchanged — set before)")
        else:
            password = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(14)) + "!9"
            user_id = entity(ns.api("POST", "/api/v1/users", {
                "firstName": u["firstName"], "lastName": u["lastName"], "email": u["email"],
                "password": list(password), "active": True, "languageId": "en_US",
                "roles": [role]}), f"user {u['email']}")["userID"]
        ns.api("POST", f"/api/v1/roles/{role}/users/{user_id}")
        # Without the built-in back-end role a user can't log in to dotCMS.
        ns.api("POST", f"/api/v1/roles/{backend_role()}/users/{user_id}")
        rows.append({"email": u["email"], "name": f"{u['firstName']} {u['lastName']}",
                     "role": ROLES[u["role"]]["roleName"], "password": password})
        print(f"  user {u['email']} ({ROLES[u['role']]['roleName']})")
    with open(USERS_FILE, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["email", "name", "role", "password"])
        w.writeheader()
        w.writerows(rows)
    print(f"  passwords in {USERS_FILE}")


def main():
    site = site_id()
    roles = ensure_roles()
    grant_layouts(roles)
    move_department_content(site)
    grant_permissions(roles, site)
    scheme, actions = ensure_workflow(roles)
    assign_workflow(scheme, actions)
    ensure_users(roles)


if __name__ == "__main__":
    main()
