#!/usr/bin/env python3
"""Make the System Workflow's Publish action publish page sections too.

In dotCMS, publishing a page publishes the page only; each section placed on
it (banner, slides, tiles, …) is separate content with its own workflow.
This adds one Velocity step to System Workflow → Publish (source:
workflow/publish-page-sections/publish-page-sections.vtl): when a page is
published by an administrator or a Vodafone Reviewer, the Vodafone page
sections on that page's site that have unpublished changes are published
too, through the Vodafone Editorial workflow, as the same user.

The System Workflow is shared by every site on the instance; the step only
acts on Vodafone content, so other sites' pages publish as before.

Only Velocity is used: on this dotCMS version a JavaScript step makes any
page publish fail (HTTP 500), even an empty script.

    export DOTCMS_HOST=https://awesomedemo-dev.dotcms.dev
    export DOTCMS_AUTH_TOKEN=...          # admin
    python3 install-publish-page-sections.py            # install / update
    python3 install-publish-page-sections.py --remove   # uninstall
"""
import os
import sys

os.environ.setdefault("DOTCMS_HOST", "https://awesomedemo-dev.dotcms.dev")
import dotcms_site as ns  # noqa: E402

SYSTEM_WORKFLOW = "d61a59e1-a49c-46f2-a929-db2b4bfa88b2"
EDITORIAL = "Vodafone Editorial"
SOURCE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                      "workflow", "publish-page-sections", "publish-page-sections.vtl")
VTL = "com.dotmarketing.portlets.workflows.actionlet.VelocityScriptActionlet"
# The System Workflow's Publish action ships with these two steps only.
STANDARD = ["SaveContentActionlet", "PublishContentActionlet"]


def action_ids(scheme, name):
    """Every action with this name: the System Workflow has more than one
    "Publish" (one per step), and pages use either."""
    actions = ns.api("GET", f"/api/v1/workflow/schemes/{scheme}/actions")["entity"]
    return [a["id"] for a in actions if a["name"] == name]


def steps(action):
    return ns.api("GET", f"/api/v1/workflow/actions/{action}/actionlets")["entity"]


def clazz(step):
    return step.get("actionlet", {}).get("actionClass", "").rsplit(".", 1)[-1]


def main():
    for publish in action_ids(SYSTEM_WORKFLOW, "Publish"):
        install(publish)


def install(publish):
    # The step list doesn't return step settings, so ours are recognised as
    # any script step on this action (it has none as shipped).
    for step in steps(publish):
        if clazz(step) not in STANDARD:
            ns.api("DELETE", f"/api/v1/workflow/actionlets/{step['id']}")
    if "--remove" not in sys.argv:
        editorial = next(s["id"] for s in ns.api("GET", "/api/v1/workflow/schemes")["entity"]
                         if s["name"] == EDITORIAL)
        script = open(SOURCE, encoding="utf-8").read().replace(
            "__EDITORIAL_PUBLISH__", action_ids(editorial, "Publish")[0])
        r = ns.api("POST", f"/api/v1/workflow/actions/{publish}/actionlets",
                   {"actionletClass": VTL, "order": len(steps(publish)),
                    "parameters": {"script": script, "resultKey": "publishPageSections"}})
        if isinstance(r, dict) and r.get("message"):
            sys.exit(f"  ! {r['message'][:200]}")
    got = [clazz(s) for s in steps(publish)]
    expected = STANDARD + ([] if "--remove" in sys.argv else ["VelocityScriptActionlet"])
    print(f"  System Workflow → Publish ({publish[:8]}): {got}")
    if got != expected:
        sys.exit(f"  ! expected {expected} — check the action in Content Model → Workflows")


if __name__ == "__main__":
    main()
