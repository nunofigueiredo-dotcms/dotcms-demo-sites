# Verification report

Run 2026-11-09 10:31 UTC against https://awesomedemo-dev.dotcms.dev, site `publishing-demo`. Re-run with `node setup/verify.mjs`.

**42 of 42 checks passed.**

**Findings** (behaviour to know about, not failures):

- Messaging Owner can publish a draft directly with the generic `fire/PUBLISH` API call (it went live). The workflow history then shows only “Save Draft”; the publish is in the item's version history.

Test items created by this run were removed afterwards. Actions were fired as each demo user with a one-hour token (revoked at the end), so they behave exactly as in the dotCMS UI.

## 1. Each role: what it can see and do

| Role | User | Backend tools | Items readable | Can create | Actions on Draft (sent back) | on SME Review | on Approved | on Published |
|---|---|---|---|---|---|---|---|---|
| Content Marketer | Hannah Clarke | Site, Content, Digital Assets | 11 | yes | Submit for SME Review, Submit for Approval, Save Draft | none | Save Draft | Save Draft |
| Regional Marketer | Lukas Brandt | Site, Content, Digital Assets | 13 | yes | Submit for SME Review, Submit for Approval, Save Draft | none | Save Draft | Save Draft |
| SME Reviewer | Priya Raman | Site, Content, Digital Assets | 15 | no | none | SME Approve, Reject | none | none |
| Messaging Owner | Eleanor Shaw | Site, Content, Digital Assets | 16 | yes | Save Draft | Reject | Publish to Web, Ready for External Channel, Save Draft | Save Draft |
| Hub Reader | Marco Silva | none (Messaging Hub only) | 18 | no | none | none | none | none |

## 2. One Localised Message through the whole workflow

| Who | Action | Result | Step after |
|---|---|---|---|
| Regional Marketer | Save Draft (new item, SME needed, Organic social) | done | Draft |
| Regional Marketer | Submit for Approval (comment: empty) | refused: This item needs SME review first. Use Submit for SME Review. | Draft |
| Regional Marketer | Submit for SME Review (comment: “Ready for SME check”) | done | SME Review |
| SME Reviewer | Reject (comment: empty) | refused: A comment is required to reject. Say what needs to change. | SME Review |
| SME Reviewer | Reject (comment: “Say “agreements”, not “deals”, in line 2.”) | done | Draft |
| Content Marketer | Approve (comment: empty) | refused: The Workflow Action [6af133c8-c496-44a5-be61-45638d575800] is not available in the Workflow Step the content is currentl | Draft |
| Regional Marketer | Submit for SME Review (comment: “Fixed wording”) | done | SME Review |
| SME Reviewer | SME Approve (comment: “Claims check out”) | done | Messaging Owner Approval |
| Messaging Owner | Approve (comment: “Approved”) | done | Approved |
| Messaging Owner | Publish to Web | refused: This item is for LinkedIn or social. Use Ready for External Channel: it is published in Sprinklr. | Approved |
| Messaging Owner | Ready for External Channel (comment: “Scheduled in Sprinklr”) | done | Ready for External Channel |

Audit trail (newest first), from `GET /api/v1/workflow/tasks/history/comments/{id}`:

- Eleanor Shaw: Scheduled in Sprinklr
- Eleanor Shaw: Eleanor Shaw completed action Ready for External Channel
- Eleanor Shaw: Approved for an external channel. Final publishing happens in Sprinklr: dotCMS holds the approved source, the version and the audit trail. Hand-off file: channels/out/sprinklr-handoff.json.
- Eleanor Shaw: Approved
- Eleanor Shaw: Eleanor Shaw completed action Approve
- Priya Raman: Claims check out
- Priya Raman: Priya Raman completed action SME Approve
- Lukas Brandt: Fixed wording
- Lukas Brandt: Lukas Brandt completed action Submit for SME Review
- Priya Raman: Say “agreements”, not “deals”, in line 2.
- Priya Raman: Priya Raman completed action Reject
- Lukas Brandt: Ready for SME check
- Lukas Brandt: Lukas Brandt completed action Submit for SME Review
- Lukas Brandt: Lukas Brandt completed action Save Draft

## 3. Universal Visual Editor: the H3 fix

| Check | Result |
|---|---|
| the live article has the H3 “How your Organisation can prepare” | ✅  |
| the frontend's read-only token loads the page in EDIT_MODE | ✅  |
| UVE is configured for the site | ✅ http://localhost:3010 |
| Content Marketer's inline save on a published article works | ✅ now Draft |
| the fix is in the new draft | ✅  |
| the live page keeps the approved text until the draft is approved | ✅  |

Not checked automatically: clicking the H3 inside the editor itself (that needs a person in the browser). See “Still to do by hand”.

## Still to do by hand

1. **The H3 edit in the editor itself.** The save path is verified above, but clicking the heading inside the Universal Visual Editor needs a person in a browser. Log in as Hannah, open *Site → Pages → Insights for research leaders*, click the "Open access agreements" card, click the body, change "Organisation" to "Organization", click outside. The article should show the change and move to Draft. UVE must be able to reach the frontend: today it points at `http://localhost:3010` (works only on this Mac, with `npm run dev:publishing` running). After the Vercel deploy, re-point it (see DEMO-SCRIPT.md, "Before the demo").
2. **Vercel deploy.** Not done: this machine has no Vercel login. Steps are in DEMO-SCRIPT.md, "Before the demo".

## Known issues and decisions

| What | Impact | Detail and options |
|---|---|---|
| The Messaging Owner can publish directly through the API | Low for the demo. Authors, SMEs and readers can't. | The generic `PUT /api/v1/workflow/actions/default/fire/PUBLISH` saves the item and then publishes it for any user with **Publish** permission. Only the Messaging Owner has it, because the *Publish to Web* step publishes as the person who fires it. The UI offers no such button. If asked: the workflow history then shows only "Save Draft", and the publish is in the item's version history. Closing it fully means a dedicated publishing service user, which dotCMS workflows don't support out of the box on this version. |
| Teardown can't delete the site on this instance | Clean-up only | The first teardown left a hidden "disposable" copy of a content type (dotCMS's background delete stalled, partly because I asked for the delete twice). It still references the site, so `DELETE /api/v1/site` fails with a foreign-key error. Everything else is removed. The site is left archived, and `run-all` restores and reuses it. Teardown now removes content first and deletes types one at a time to avoid this; the old leftover needs a dotCMS-side clean-up (support ticket or a DB delete of that `structure` row). |
| Action conditions don't hide actions | None (worked around) | On 26.11 an action's "condition" is display-only. Routing is enforced by guard steps instead: a Velocity check plus a JavaScript step that stops the action with a message (wrong SME route, empty reject comment, social item to web). The demo users see both "Submit for SME Review" and "Submit for Approval"; the wrong one explains itself. |
| JavaScript workflow steps must return a value | None (handled) | A JavaScript actionlet that ends without a value fails the action with HTTP 500. The gate returns `"ok"`. |
| GraphQL can't follow a required relationship into another language | None (handled) | The German and Spanish messages point to English sources of truth. GraphQL errors on them, and Lucene `_search` with `depth` hides them; `GET /api/v1/content/{id}?depth=1` returns them. The frontend and the channel script use the latter. |
| API tokens only work for back-end users | None (handled) | Marco (Hub Reader) is a front-end user, as a field user would be, so he signs in to the hub with his password. The frontend reads with a separate read-only service account, `hub-service@publishing-demo.example` (Hub Reader role, no tools). |
| Workflow Tasks portlet isn't in any backend tool on this instance | Minor | No REST endpoint creates layouts. Reviewers find their items with the Content search's workflow-step filter, or in the hub under "My items in review". |
| Authors need edit permission on the content types | None | On this version, creating an item needs **Edit** on its type. Content Marketer, Regional Marketer and Messaging Owner have it; none of them has the Content Model tool, so they can't change the types. |
| SDK version | None (handled) | The repo's other frontends use SDK 26.9.3-1, which this instance (26.11.06-03) reports as unsupported. `frontend-publishing` pins the matching 26.11.6-3. |
| `+contentType:(A B)` returns nothing | None (handled) | Grouped type lists in Lucene return no results on this version; use `+(contentType:A contentType:B)`. |
