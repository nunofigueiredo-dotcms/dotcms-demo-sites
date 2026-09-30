#!/usr/bin/env python3
"""Vodafone Plan List: pick the plans, instead of naming a plan family.

A Plan List used to show every published plan in its Plan family. This
gives it a Plans relationship (many-to-many to Vodafone Plan, so one plan can
appear in several lists): editors pick the plans and drag them into order.

For each existing list, the plans of its family are filled in, in their
Order, and the list is republished — so the pages look the same. Then the
list's Plan family field is removed. (Plans keep their own family: the
RED plans API filters on it.)

    export DOTCMS_HOST=https://awesomedemo-dev.dotcms.dev
    export DOTCMS_AUTH_TOKEN=...          # admin
    python3 vodafone-plan-lists.py

Safe to re-run: lists that already have plans are left alone.
"""
import os
import sys

os.environ.setdefault("DOTCMS_HOST", "https://awesomedemo-dev.dotcms.dev")
import dotcms_site as ns  # noqa: E402

SITE = os.environ.get("VODAFONE_SITE", "telcodemo.com")
F = "com.dotcms.contenttype.model.field."


def entity(resp, what):
    e = resp.get("entity") if isinstance(resp, dict) else None
    if e is None or (isinstance(resp, dict) and resp.get("errors")):
        sys.exit(f"  ! {what}: {str(resp)[:300]}")
    return e


def search(query):
    r = ns.api("POST", "/api/content/_search", {"query": query, "limit": 200})
    return r["entity"]["jsonObjectView"]["contentlets"]


def order(plan):
    try:
        return int(plan.get("displayOrder") or 999)
    except ValueError:
        return 999


def main():
    site_id = entity(ns.api("POST", "/api/v1/site/_byname", {"siteName": SITE}), "site")["identifier"]
    t = entity(ns.api("GET", "/api/v1/contenttype/id/VodafonePlanList"), "VodafonePlanList")
    fields = {f["variable"]: f for f in t["fields"]}

    # 1. The Plans relationship.
    if "plans" not in fields:
        entity(ns.api("POST", f"/api/v1/contenttype/{t['id']}/fields", {
            "clazz": F + "ImmutableRelationshipField", "name": "Plans", "variable": "plans",
            "hint": "The plans to show, in order", "relationType": "VodafonePlan",
            "values": "1", "indexed": True, "contentTypeId": t["id"]}), "VodafonePlanList.plans")
        print("  added Plans relationship")

    # 2. Fill each list from its family.
    if "family" in fields:
        plans = search(f"+contentType:VodafonePlan +conHost:{site_id} +live:true +deleted:false")
        base = f"+contentType:VodafonePlanList +conHost:{site_id} +working:true +deleted:false"
        for pl in search(base):
            picked = sorted((p for p in plans if p.get("family") == pl.get("family")), key=order)
            if pl.get("plans") or not picked:
                print(f"  {pl['title']}: left as is ({len(picked)} {pl.get('family')} plans)")
                continue
            body = {"identifier": pl["identifier"], "contentType": "VodafonePlanList", "languageId": 1,
                    # An ordered list of identifiers keeps the plans in this order.
                    "plans": ",".join(p["identifier"] for p in picked)}
            for action in ("EDIT", "PUBLISH"):
                entity(ns.api("PUT", f"/api/v1/workflow/actions/default/fire/{action}"
                                     f"?identifier={pl['identifier']}&indexPolicy=WAIT_FOR",
                              {"contentlet": body}), f"{pl['title']} {action}")
            ns.api("PUT", f"/api/v1/content/_unlock/{pl['identifier']}")
            print(f"  {pl['title']}: {', '.join(p['title'] for p in picked)}")

        # 3. Drop the list's Plan family field.
        ns.api("DELETE", f"/api/v1/contenttype/{t['id']}/fields/id/{fields['family']['id']}")
        print("  removed Plan family from Vodafone Plan List")



if __name__ == "__main__":
    main()
