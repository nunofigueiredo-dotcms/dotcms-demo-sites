#!/usr/bin/env python3
"""Install the TSD accessibility check plugin (../osgi/tsd-accessibility-check).

It's a Java OSGi plugin: a workflow step, "Check accessibility", that stops
Texas School for the Deaf content from being submitted or published while it
has accessibility errors (images without a description, vague or empty link
text, headings out of order), plus GET /api/v1/tsd/accessibility/... reports.

This uploads the plugin jar and puts the step first on the TSD Page Approval
actions that submit or publish, so nothing is saved when the check fails.
Build the jar first (JDK 25 — dotCMS 26's classes are Java 25 — and Maven):

    cd ../osgi/tsd-accessibility-check && mvn package

    export DOTCMS_HOST=https://awesomedemo-dev.dotcms.dev
    export DOTCMS_AUTH_TOKEN=...          # admin
    python3 install-accessibility-check.py            # upload + add the step
    python3 install-accessibility-check.py --remove   # take the step off the actions

education-editorial.py rebuilds these actions' steps: run this again after it
(build-education.py does).
"""
import glob
import json
import os
import subprocess
import sys
import time

os.environ.setdefault("DOTCMS_HOST", "https://awesomedemo-dev.dotcms.dev")
import dotcms_site as ns  # noqa: E402

EDITORIAL = "TSD Page Approval"
ACTIONS = ["Submit for review", "Approve & publish", "Publish"]
STEP = "com.dotcms.demo.tsd.accessibility.CheckAccessibilityActionlet"
BUNDLE = "com.dotcms.demo.tsd.accessibility"
PLUGIN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "osgi", "tsd-accessibility-check")


def upload():
    jars = sorted(glob.glob(os.path.join(PLUGIN, "target", "tsd-accessibility-check-*.jar")))
    if not jars:
        sys.exit(f"  ! no jar in {PLUGIN}/target — run `mvn package` there first")
    out = subprocess.run(["curl", "-s", "-X", "POST", f"{ns.HOST}/api/v1/osgi",
                          "-H", f"Authorization: Bearer {ns.TOKEN}", "-F", f"file=@{jars[-1]}"],
                         capture_output=True, text=True).stdout
    if "errors\":[]" not in out:
        sys.exit(f"  ! upload: {out[:300]}")
    # dotCMS picks the jar up from its load folder within a few seconds.
    for _ in range(20):
        time.sleep(3)
        bundles = ns.api("GET", "/api/v1/osgi").get("entity") or []
        b = next((b for b in bundles if b["symbolicName"] == BUNDLE), None)
        if b and b["state"] == 32:  # ACTIVE
            print(f"  plugin {b['jarFile']}: active")
            return
    sys.exit("  ! the plugin didn't start — check the dotCMS log and Dev Tools → Plugins")


def steps(action_id):
    subs = ns.api("GET", f"/api/v1/workflow/actions/{action_id}/actionlets").get("entity") or []
    return [s["actionlet"]["actionClass"] for s in subs], subs


def set_steps(action_id, name, classes):
    """Replace the action's steps and check the order (dotCMS doesn't always keep it)."""
    for _ in range(3):
        for sub in steps(action_id)[1]:
            ns.api("DELETE", f"/api/v1/workflow/actionlets/{sub['id']}")
        for order, clazz in enumerate(classes):
            params = {"contentTypePrefix": "Tsd"} if clazz == STEP else {}
            ns.api("POST", f"/api/v1/workflow/actions/{action_id}/actionlets",
                   {"actionletClass": clazz, "order": order, "parameters": params})
        if steps(action_id)[0] == classes:
            print(f"  {name}: {[c.rsplit('.', 1)[-1] for c in classes]}")
            return
    sys.exit(f"  ! {name}: steps out of order {steps(action_id)[0]}")


def main():
    remove = "--remove" in sys.argv
    if not remove:
        upload()
    scheme = next(s["id"] for s in ns.api("GET", "/api/v1/workflow/schemes")["entity"]
                  if s["name"] == EDITORIAL)
    for a in ns.api("GET", f"/api/v1/workflow/schemes/{scheme}/actions")["entity"]:
        if a["name"] in ACTIONS:
            others = [c for c in steps(a["id"])[0] if c != STEP]
            set_steps(a["id"], a["name"], others if remove else [STEP] + others)
    print(json.dumps({"removed" if remove else "installed": ACTIONS}))


if __name__ == "__main__":
    main()
