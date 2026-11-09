# Publishing demo — build plan

Status: **built** (approved 2026-11-09 with these answers: awesomedemo-dev; Elsevier branding; add de-DE; deploy to Vercel; owner as a select; Email goes through Publish to Web; use the Vodafone admin token). See `VERIFY-REPORT.md` for results and `DEMO-SCRIPT.md` for the run-through.

**Changes from this plan, found while building:**
- **SME routing:** two explicitly named submit actions, each with a guard (Velocity check + JavaScript stop). On 26.11 an action's "condition" doesn't hide actions.
- **Frontend token:** a read-only service account (`hub-service@…`) owns the frontend's token. API tokens don't work for front-end users like Marco; he signs in to the hub with his password.
- **Permissions:** authoring roles need Edit on the content types to create items, and every role needs category read on System Host.
- **SDK:** pinned to 26.11.6-3 to match the instance.
- **Pages:** the template uses SYSTEM_CONTAINER, and the theme is awesomedemo-dev's landing theme.
- **Extra script:** `setup/reset-demo.mjs` for rehearsals.

---


## What I found on the instance (read-only checks, 2026-11-09)

| Check | Result |
|---|---|
| Target | `https://awesomedemo-dev.dotcms.dev` (`DOTCMS_URL` is unset; this is the CLI's `demo` instance) |
| Version | dotCMS **26.11.06-03** (built 2026-11-06) |
| OpenAPI | `/api/openapi.json` → 200, OpenAPI 3.0.1, 608 paths. Every endpoint below was confirmed in it. |
| dotCMS MCP server | Not connected in this session, so I'll use the **REST API** |
| Existing sites | demo.dotcms.com, trainning-service.com, educationdemo.com, telcodemo.com, general.com. No `publishing-demo`. |
| Languages | en-us (1), es-es (2), fr-fr, pt-pt, ar-ae. **German isn't installed.** |
| Name collisions | None. No existing content type, workflow, role or category uses the names below. |
| `./sample-content` | Doesn't exist, so seed copy will be invented, realistic and clearly fictional |
| Auth | The scripts read `DOTCMS_URL` and `DOTCMS_TOKEN` (an admin API token) from the environment. Demo users get their password from `DEMO_USER_PASSWORD`. No secrets are written to disk. |

## Where things go

```
generaldemos/
  publishing-demo/
    PLAN.md · DEMO-SCRIPT.md · VERIFY-REPORT.md
    setup/            idempotent build scripts (Node 24, no deps), --dry-run on every step
      lib/api.mjs     fetch wrapper: base URL, token, upsert-by-key helpers, dry-run logging
      00-preflight.mjs … 08-seed.mjs, run-all.mjs, teardown.mjs
      state/created.json   ledger of every id this build created (teardown reads only this)
    channels/fetch.sh        one message → web JSON, newsletter HTML, Sprinklr handoff JSON
    channels/out/            generated files + article PDF
  frontend-publishing/       new Next.js workspace (port 3010), same stack as frontend-general
```

## Build order and endpoints

Every step looks the item up first by its stable key (variable name, role key, category key, user email, or content `urlTitle`/`sotKey`), then creates it only if it's missing or updates it in place. Each step records the ids it created in `state/created.json`.

| # | Step | Lookup | Create / update |
|---|---|---|---|
| 0 | Preflight: version, token is admin, OpenAPI paths present | `GET /api/v1/appconfiguration`, `GET /api/v1/users/current`, `GET /api/openapi.json` | — |
| 1 | Language **de-de** (only if you approve, see Q3) | `GET /api/v2/languages` | `POST /api/v2/languages/{languageTag}` |
| 2 | Site `publishing-demo` (aliases `publishing-demo.localhost` and the Vercel host) | `GET /api/v1/site?filter=publishing-demo` | `POST /api/v1/site`, `PUT /api/v1/site/{id}/_publish` |
| 3 | Categories: parent `pdTopics` → research-integrity, open-access, ai-in-research, research-funding-impact | `GET /api/v1/categories/{idOrKey}` | `POST /api/v1/categories` |
| 4 | Roles under a parent role **"Publishing Demo"** (key `pdRoot`): Content Marketer, Regional Marketer, SME Reviewer, Messaging Owner, Hub Reader | `GET /api/v1/roles/_search` | `POST /api/v1/roles`, `POST /api/v1/roles/layouts` (Content + Site Browser portlets, none for Hub Reader), `PUT /api/v1/permissions/role/{roleId}/asset/{siteId}` |
| 5 | Users, one per role: `content.marketer@publishing-demo.example`, etc. | `GET /api/v1/users/filter` | `POST /api/v1/users` (roles + password from env) |
| 6 | Workflow **Governed Content** (see below) | `GET /api/v1/workflow/schemes`, `…/{id}/steps`, `…/{id}/actions` | `POST /api/v1/workflow/schemes`, `/steps`, `/actions`, `/actions/{id}/actionlets`, `PUT /api/v1/workflow/actions/{id}` |
| 7 | Content types, all with `host` = the new site and `workflow` = Governed Content | `GET /api/v1/contenttype/id/{var}` | `POST /api/v1/contenttype`, then fields via `PUT /api/v3/contenttype/{var}/fields/...` |
| 8 | Templates, containers, pages, UVE config | `GET /api/v1/templates`, `GET /api/v1/page/json/{uri}` | `POST /api/v1/templates`, `POST /api/v1/workflow/actions/default/fire/PUBLISH` (htmlpageasset), `POST /api/v1/page/{pageId}/content`, `POST /api/v1/apps/dotema-config-v2/{siteId}` |
| 9 | Seed content + workflow states | `POST /api/v1/content/_search` by key field | `PUT /api/v1/workflow/actions/default/fire/NEW`, `PUT /api/v1/workflow/actions/{actionId}/fire` (with `comments`), as the role users so the audit trail shows real names |
| 10 | Placeholder PDF upload for the Asset Pack | — | `POST /api/v1/temp`, then reference it in the contentlet |

Teardown (`setup/teardown.mjs --dry-run`) works in reverse order: content, then pages/templates/containers, content types, workflow scheme (archive, then delete), users (`DELETE /api/v1/users/{id}` with admin as the replacement), roles, categories, the UVE config for this site only, and finally the site (`_unpublish` → `_archive` → `DELETE`). It only deletes ids listed in `state/created.json`, and it removes de-de only if the ledger says this build created it.

## Content types (variable names prefixed `Pd`)

- **PdMessagingSot**: title, `sotKey` (stable key, e.g. `open-access`), topic (Category), keyMessages (Block Editor), proofPoints (Block Editor, "approved proof points"), doNotSay (Textarea, manual reference only, no automated checks), owner (see Q6), version (integer), approvedDate, reviewByDate (Date), status (Select: Current / Superseded), supersedes (Relationship → PdMessagingSot, one-to-one, self).
- **PdLocalisedMessage**: title, parentSot (Relationship → PdMessagingSot, **required**), region (Select: DACH / Iberia / APAC / UK & Ireland / North America / LATAM), language (the native dotCMS language of the contentlet, plus a display field), body (Block Editor), targetChannel (Select: Web / PDF / Email / LinkedIn newsletter / Paid social / Organic social), smeNeeded (Radio: Yes / No).
- **PdArticle** (Thought Leadership Article): title, h1, standfirst, body (Block Editor, only paragraph / H2 / H3 / lists / quote / link), author, topic (Category), relatedSot (Relationship), seoSummary, faq (key/value field: question → answer), lastReviewed (Date), urlTitle. Its URL map is `/articles/{urlTitle}`.
- **PdNewsletterIssue**: title, channel (Email / LinkedIn), issueDate, sections (Relationships → PdArticle and → PdLocalisedMessage, many), approvalStatus (read-only, mirrors the workflow step via a Set Value actionlet).
- **PdAssetPack**: title, pdf (Binary), relatedMessages (Relationship → PdMessagingSot, many), distributionPartner, event.

## Workflow "Governed Content"

Steps: **Draft → SME Review → Messaging Owner Approval → Approved → Published to Web | Ready for External Channel**

| From | Action | To | Who | Notes |
|---|---|---|---|---|
| (new) / Draft | Save Draft | Draft | Content Marketer, Regional Marketer | |
| Draft | Submit for Review | SME Review | Content / Regional Marketer | Only shown when `smeNeeded == Yes` (via `actionCondition`) |
| Draft | Submit for Review | Messaging Owner Approval | Content / Regional Marketer | Only shown when SME isn't needed or the type has no SME field |
| SME Review | SME Approve | Messaging Owner Approval | SME Reviewer | Comment optional |
| Messaging Owner Approval | Approve | Approved | Messaging Owner | |
| SME Review, MO Approval | **Reject** | Draft | SME Reviewer, Messaging Owner | Comment box shown, plus a JavaScript actionlet that **fails the action if the comment is empty**. Assigns back to the creator. |
| Approved | **Publish to Web** | Published to Web | Messaging Owner | Publish actionlet. Shown for Web / PDF / Email and for types without a channel. |
| Approved | **Ready for External Channel** | Ready for External Channel | Messaging Owner | Shown for LinkedIn / Paid / Organic social. Publishes to the content API only (needed for the handoff) and adds a workflow comment: *"Final publishing happens in Sprinklr. dotCMS holds the approved source and the audit trail."* This is a stopping step with no further actions. |
| Published / Ready for Ext. | Revise | Draft | Content / Regional Marketer | Starts a new governed cycle |

Audit trail: every action fires as the named demo user, so the edit screen's **History** tab and `GET /api/v1/workflow/tasks/history/comments/{id}` show who did what, when, and with what comment. I'll verify both.

The SME branch uses a Velocity `actionCondition` on the two Submit actions. If the conditions don't behave in this version, the fallback is two visibly named actions ("Submit for SME Review" / "Submit for Approval"), and I'll report it.

## Seed content

- **Sources of truth**: Research Integrity, Open Access (**v1 Superseded** + **v2 Current**, v2 `supersedes` v1), AI in Research, Research Funding Impact. Owners are the Messaging Owner, with SME contacts named in the copy.
- **Localised messages**: DACH / German (in **SME Review**), Iberia / Spanish (**Approved**), APAC / English (**Rejected** back to Draft, with the comment "Proof point 2 cites a 2023 figure, use the v2 approved number").
- **Articles** (3): one has the H3 **"How your Organisation can prepare"**, which is the live UVE fix to "Organization".
- **Newsletter**: one LinkedIn issue at **Ready for External Channel**.
- **Asset pack**: one, with a generated one-page placeholder PDF.
- All copy uses a fictional publisher, **"Meridian Scientific"** (see Q2), fictional people, and no real journals or statistics.

## Frontend (`frontend-publishing`, port 3010, `npm run dev:publishing`)

Same stack as frontend-general (Next 16, `@dotcms/client` / `react` / `uve` / `types` 26.9.3-1, Tailwind 4). Neutral theme with a simple header and footer.

- `/articles/[slug]`: the Article URL map page. The body renders through the Block Editor renderer with **inline editing enabled**, so the H3 can be edited in place in UVE. H1 and standfirst use `DotCMSEditableText`.
- `/hub`: Messaging Hub. Search box, topic filter, Current sources of truth only, a "Who do I ask?" card per item, and **My items in review**. Sign-in uses dotCMS credentials: a server route calls `POST /api/v1/authentication` and gets a short-lived user token via `POST /api/v1/apitoken`, stored in an httpOnly cookie. The tasks come from `POST /api/v1/workflow/tasks` with `assignedTo` = that user.
- `/hub/sot/[sotKey]`: the version page. A Superseded version shows a badge and links to the Current one.
- `/topics/[topic]`: the source of truth plus every localised message, with its workflow step badge.
- `/print/articles/[slug]`: a print-styled view that channels/fetch.sh turns into the PDF with headless Chrome (`--print-to-pdf`).

## Multi-channel (`channels/fetch.sh`)

One approved localised message (Iberia/Spanish) is pulled with `POST /api/v1/content/_search` using `depth=1` (its parent source of truth comes along) and rendered three ways:

- `out/web.json`
- `out/newsletter.html`: inline-styled email HTML
- `out/sprinklr-handoff.json`: channel, copy, approval chain from the workflow history, approver, approved date, `sourceOfTruth` id/version, and a do-not-send-after date (= the source's review-by date)

It also generates `out/<article>.pdf`. The script uses a **read-only Hub Reader token**, which also shows that field teams can't change anything.

## Verification (written to VERIFY-REPORT.md)

- For each role, I'll get a token via `POST /api/v1/apitoken` for that user and check: can it list or read the content, which workflow actions does `GET /api/v1/workflow/contentlet/{inode}/actions` offer, and does a forbidden write fail with 403.
- Walk-through: one new Localised Message goes Draft → SME Review → MO Approval → reject with an empty comment (must fail) → reject with a comment → resubmit → approve → Ready for External Channel. Then I'll check the history endpoint.
- UVE: confirm `GET /api/v1/page/json/articles/...?mode=EDIT_MODE` returns the block editor payload, and that saving a change to the H3 through the content API persists. **I can't click through UVE myself in this session**, so the visual check is a 30-second step for you, listed in the report.
- `npm run build` and `npm run lint` for frontend-publishing, plus `--dry-run` and a second run of every setup script to show 0 creates.

Out of scope: policy packs and automated do-not-say checks (roadmap). Nothing touches the 5 existing sites.

## Questions before I build

1. **Instance**: Is awesomedemo-dev right? `DOTCMS_URL` isn't set.
2. **"Real logos"**: You didn't name the prospect. Do you want **their** logo on the header (send me the name or file), or a fictional brand ("Meridian Scientific") with a neutral wordmark? I'd use the fictional brand, plus a small "Demo for <prospect>" line if you want one.
3. **German language**: Adding de-de is instance-wide (it shows up for every site). Is that OK? The alternative is DACH in English with a "German" label.
4. **Frontend**: Is a Next.js headless frontend on port 3010 OK, and should I deploy it to Vercel for Wednesday like general.com? UVE on awesomedemo-dev needs a URL it can reach, so localhost only works on your machine.
5. **Token**: The scripts need an admin `DOTCMS_TOKEN`. I read the instance today with the Vodafone frontend's token, which turns out to be a full admin token. That's worth rotating. Should I mint a dedicated, expiring token for this build via `POST /api/v1/apitoken`?
6. **Owner field**: dotCMS has no "user" field type. I'd use a select of the demo users (value = email), and the hub resolves the name from the select label. Is that OK?
7. **Email channel**: It currently goes through **Publish to Web**, because dotCMS serves it to the email tool via the API. Should it go through **Ready for External Channel** instead?
