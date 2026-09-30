#!/usr/bin/env python3
"""Editorial workflow for the Vodafone Egypt demo (telcodemo.com).

Creates two roles, their backend tools and permissions on the site, the
"Vodafone Editorial" review-and-publish workflow on every Vodafone content
type, and two demo users (an editor and a reviewer):

    Draft ──Submit for review──▶ In Review ──Approve & publish──▶ Published
      ▲                            │
      └────────Send back───────────┘            (Save on Published → Draft)

Editors can save and submit but not publish; reviewers approve, send back
with a comment, or publish directly. Pages keep the System Workflow (the page
type is shared by every site on the instance), but editors have no publish
permission on the site, so "Publish Page" can't push their unapproved
content live either.

    export DOTCMS_HOST=https://awesomedemo-dev.dotcms.dev
    export DOTCMS_AUTH_TOKEN=...          # admin
    python3 vodafone-editorial.py

Safe to re-run: roles, the scheme, steps, actions and users are reused by
name. Demo passwords are written to vodafone-users.local.csv (gitignored)
the first time each user is created.
"""
import csv
import os
import secrets
import string
import sys

os.environ.setdefault("DOTCMS_HOST", "https://awesomedemo-dev.dotcms.dev")
import dotcms_site as ns  # noqa: E402

SITE = os.environ.get("VODAFONE_SITE", "telcodemo.com")
SCHEME = "Vodafone Editorial"
STEPS = ["Draft", "In Review", "Published"]
A = "com.dotmarketing.portlets.workflows.actionlet."
SHOW_ALL = ["NEW", "EDITING", "LOCKED", "UNLOCKED", "PUBLISHED", "UNPUBLISHED", "LISTING"]
USERS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vodafone-users.local.csv")

# Backend tools (layouts) both roles see: Site (pages, site browser),
# Content and Digital Assets. Looked up by name; ids differ per instance.
LAYOUTS = ["Site", "Content", "Digital Assets"]

ROLES = {
    "editor": {"roleName": "Vodafone Editor", "roleKey": "vodafone_editor",
               "description": "Creates and edits Vodafone Egypt content and submits it for review."},
    "reviewer": {"roleName": "Vodafone Reviewer", "roleKey": "vodafone_reviewer",
                 "description": "Reviews Vodafone Egypt content: approves and publishes, or sends it back."},
}

# Permissions on the site, inherited by everything in it. Editors can edit
# but not publish; reviewers can publish too.
EDIT = ["READ", "WRITE"]
PERMISSIONS = {
    "editor": {"INDIVIDUAL": ["READ"], "FOLDER": ["READ", "CAN_ADD_CHILDREN"],
               "CONTENT": EDIT, "PAGE": EDIT, "TEMPLATE": ["READ"], "CONTAINER": ["READ"],
               "STRUCTURE": ["READ"]},
    "reviewer": {"INDIVIDUAL": ["READ"], "FOLDER": ["READ", "WRITE", "PUBLISH", "CAN_ADD_CHILDREN"],
                 "CONTENT": EDIT + ["PUBLISH"], "PAGE": EDIT + ["PUBLISH"],
                 "TEMPLATE": ["READ"], "CONTAINER": ["READ"], "STRUCTURE": ["READ"]},
}

USERS = [
    {"role": "editor", "email": "editor@telcodemo.com", "firstName": "Mona", "lastName": "Hassan"},
    {"role": "reviewer", "email": "reviewer@telcodemo.com", "firstName": "Karim", "lastName": "Adel"},
]


def entity(resp, what):
    e = resp.get("entity") if isinstance(resp, dict) else None
    if e is None or (isinstance(resp, dict) and resp.get("errors")):
        sys.exit(f"  ! {what}: {str(resp)[:300]}")
    return e


def site_id():
    return entity(ns.api("POST", "/api/v1/site/_byname", {"siteName": SITE}), "site")["identifier"]


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


def grant_permissions(role_ids, site):
    for key, role_id in role_ids.items():
        entity(ns.api("PUT", f"/api/v1/permissions/role/{role_id}/asset/{site}?cascade=true",
                      {"permissions": PERMISSIONS[key]}), f"permissions {key}")
    print(f"  permissions on {SITE}: editor edit, reviewer edit + publish")


def ensure_workflow(role_ids):
    schemes = entity(ns.api("GET", "/api/v1/workflow/schemes"), "schemes")
    existing = next((s for s in schemes if s["name"] == SCHEME), None)
    scheme = existing["id"] if existing else entity(ns.api("POST", "/api/v1/workflow/schemes", {
        "schemeName": SCHEME,
        "schemeDescription": "Vodafone Egypt: editors submit content for review; "
                             "reviewers approve and publish it, or send it back.",
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

    editor, reviewer = role_ids["editor"], role_ids["reviewer"]
    # Actions must name an assignee role; "Submit for review" assigns the
    # task to reviewers, everything else to nobody (CMS Anonymous), as the
    # System Workflow does.
    system = ns.api("GET", f"/api/v1/workflow/schemes/{ns_system_workflow()}/actions")
    nobody = next(a["nextAssign"] for a in system["entity"] if a.get("nextAssign"))

    def attach(action_id, on_steps):
        for step in on_steps:
            on_step = {a["id"] for a in
                       ns.api("GET", f"/api/v1/workflow/steps/{steps[step]}/actions").get("entity") or []}
            if action_id not in on_step:
                ns.api("POST", f"/api/v1/workflow/steps/{steps[step]}/actions", {"actionId": action_id})

    def action(name, on_steps, next_step, actionlets, who, icon, comment=False, assign=None):
        if name in have:
            attach(have[name], on_steps)
            return have[name]
        a = entity(ns.api("POST", "/api/v1/workflow/actions", {
            "schemeId": scheme, "stepId": steps[on_steps[0]], "actionName": name,
            "whoCanUse": who, "actionIcon": icon, "actionAssignable": False,
            "actionCommentable": comment, "actionRoleHierarchyForAssign": False,
            "showOn": SHOW_ALL, "actionNextStep": steps.get(next_step, next_step),
            "actionNextAssign": assign or nobody, "actionCondition": ""}), f"action {name}")
        attach(a["id"], on_steps[1:])
        for order, clazz in enumerate(actionlets):
            ns.api("POST", f"/api/v1/workflow/actions/{a['id']}/actionlets",
                   {"actionletClass": A + clazz, "order": order, "parameters": {}})
        # dotCMS adds "Notify Assignee" to new actions; nothing here emails.
        for sub in ns.api("GET", f"/api/v1/workflow/actions/{a['id']}/actionlets").get("entity") or []:
            if sub.get("name") == "Notify Assignee":
                ns.api("DELETE", f"/api/v1/workflow/actionlets/{sub['id']}")
        print(f"  action {name}")
        return a["id"]

    ids = {
        "Save": action("Save", ["Draft", "Published"], "Draft",
                       ["SaveContentActionlet", "CheckinContentActionlet"], [editor, reviewer], "saveIcon"),
        "Submit for review": action("Submit for review", ["Draft"], "In Review",
                                    ["SaveContentActionlet", "CheckinContentActionlet"],
                                    [editor, reviewer], "shareIcon", comment=True, assign=reviewer),
        "Approve & publish": action("Approve & publish", ["In Review"], "Published",
                                    ["PublishContentActionlet", "CheckinContentActionlet"],
                                    [reviewer], "publishIcon"),
        "Send back": action("Send back", ["In Review"], "Draft",
                            ["CheckinContentActionlet"], [reviewer], "cancelIcon",
                            comment=True, assign=editor),
        "Publish": action("Publish", ["Draft", "Published"], "Published",
                          ["SaveContentActionlet", "PublishContentActionlet", "CheckinContentActionlet"],
                          [reviewer], "publishIcon"),
        "Unpublish": action("Unpublish", ["Published"], "Draft",
                            ["UnpublishContentActionlet", "CheckinContentActionlet"],
                            [reviewer], "unpublishIcon"),
        "Archive": action("Archive", ["Draft", "Published"], "Draft",
                          ["UnpublishContentActionlet", "ArchiveContentActionlet"],
                          [reviewer], "archiveIcon"),
    }
    print(f"  workflow {SCHEME} -> {scheme}")
    return scheme, ids


def ns_system_workflow():
    return "d61a59e1-a49c-46f2-a929-db2b4bfa88b2"


def assign_workflow(scheme, action_ids):
    """Make Vodafone Editorial the only workflow on every Vodafone type, and
    map dotCMS's default actions to it so API calls (fire/PUBLISH, the
    editor's inline save) use its steps."""
    types = entity(ns.api("GET", "/api/v1/contenttype?filter=Vodafone&per_page=100"), "types")
    for t in [t for t in types if t["variable"].startswith("Vodafone")]:
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
    for u in USERS:
        role = role_ids[u["role"]]
        # /users/filter returns every user (its filter is a name search), so
        # match on the e-mail address here.
        users = ns.api("GET", "/api/v1/users/filter?per_page=500").get("entity") or []
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
    grant_permissions(roles, site)
    scheme, actions = ensure_workflow(roles)
    assign_workflow(scheme, actions)
    ensure_users(roles)


if __name__ == "__main__":
    main()
