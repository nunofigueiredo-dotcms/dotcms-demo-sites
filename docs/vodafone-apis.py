#!/usr/bin/env python3
"""Upload the Vodafone demo's scripted API endpoints.

Each folder in frontend-vodafone/dotcms/apivtl/<name>/ (get.vtl, post.vtl…)
becomes /application/apivtl/<name>/ on ENDPOINT_SITE, served by dotCMS at
/api/vtl/<name>. Re-running replaces the files.

dotCMS picks the endpoint's site from the request's domain. On
awesomedemo-dev that domain belongs to the default site (demo.dotcms.com),
so the endpoints are uploaded there under "vodafone-" names and read
telcodemo.com's content by site id. With its own domain, telcodemo.com
would hold them itself.

    export DOTCMS_HOST=https://awesomedemo-dev.dotcms.dev
    export DOTCMS_AUTH_TOKEN=...          # admin
    python3 vodafone-apis.py
"""
import os
import sys

os.environ.setdefault("DOTCMS_HOST", "https://awesomedemo-dev.dotcms.dev")
import dotcms_site as ns  # noqa: E402

ENDPOINT_SITE = os.environ.get("VODAFONE_ENDPOINT_SITE", "demo.dotcms.com")
SOURCE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend-vodafone", "dotcms", "apivtl")


def main():
    site = ns.api("POST", "/api/v1/site/_byname", {"siteName": ENDPOINT_SITE})["entity"]["identifier"]
    for name in sorted(os.listdir(SOURCE)):
        folder = f"/application/apivtl/{name}"
        ns.create_folders(ENDPOINT_SITE, [folder])
        for file in sorted(os.listdir(os.path.join(SOURCE, name))):
            path = f"{folder}/{file}"
            found = ns.api("POST", "/api/content/_search", {
                "query": f"+basetype:4 +conHost:{site} +path:\"{path}\" +deleted:false", "limit": 1})
            existing = (found.get("entity") or {}).get("jsonObjectView", {}).get("contentlets") or []
            fields = {"contentType": "FileAsset", "hostFolder": f"{site}:{folder}", "title": file,
                      "fileName": file, "languageId": 1,
                      "fileAsset": ns.upload_image(os.path.join(SOURCE, name, file))}
            if existing:
                fields["identifier"] = existing[0]["identifier"]
            e = ns._entity(ns.fire(fields), path)
            if not e:
                sys.exit(1)
            print(f"  {path} -> /api/vtl/{name}")


if __name__ == "__main__":
    main()
