# Demo script: governed messaging for Elsevier Academic & Government

45 minutes. Audience: the A&G marketing team of a large scientific publisher whose website runs on another headless CMS.

**The story:** dotCMS sits *next to* their CMS as the governed source of truth for messaging. It doesn't replace the website platform. Approved content flows to every channel: the web, PDFs, email and LinkedIn newsletters, and Sprinklr for social. Don't pitch a website replatform. The article pages here stand in for "any channel that consumes approved content".

| | |
|---|---|
| dotCMS | https://awesomedemo-dev.dotcms.dev/dotAdmin → site switcher (top left): **publishing-demo** |
| Frontend | `<VERCEL_URL>` (until it's deployed: http://localhost:3010 after `npm run dev:publishing`) |
| Password (all users) | `DEMO_USER_PASSWORD` in `publishing-demo/.env.local` |

| User | Email | Role |
|---|---|---|
| Hannah Clarke | hannah.clarke@publishing-demo.example | Content Marketer (author) |
| Lukas Brandt | lukas.brandt@publishing-demo.example | Regional Marketer (DACH & Iberia) |
| Priya Raman | priya.raman@publishing-demo.example | SME Reviewer |
| Eleanor Shaw | eleanor.shaw@publishing-demo.example | Messaging Owner (final approver) |
| Marco Silva | marco.silva@publishing-demo.example | Hub Reader (field sales, hub only) |

**Browser set-up (saves the log-in/log-out shuffle):** one browser profile per person, signed in beforehand.

- **Chrome profile 1:** Hannah, then Lukas
- **Chrome profile 2:** Eleanor
- **Safari:** Priya
- **Firefox:** the frontend, for the Messaging Hub
- **A terminal** in `~/headless/generaldemos/publishing-demo`

---

## Before the demo (Tuesday)

1. **Deploy the frontend to Vercel** (once).
   - Push the `frontend-publishing/` and `publishing-demo/` changes to GitHub.
   - Vercel → *Add New Project* → import `nunofigueiredo-dotcms/dotcms-demo-sites` → **Root Directory `frontend-publishing`**, framework Next.js.
   - Environment variables (Production), with values from `frontend-publishing/.env.local`:
     - `DOTCMS_URL`
     - `DOTCMS_READ_TOKEN` (mark it **Sensitive**)
     - `DOTCMS_SITE_ID`
     - `NEXT_PUBLIC_DOTCMS_HOST`
     - `NEXT_PUBLIC_SITE_URL` (the Vercel URL)
   - Deployment Protection: leave the production domain public. UVE loads it in an iframe and can't pass a Vercel login. The site sends `noindex` everywhere, and robots.txt blocks all crawlers.
2. **Point dotCMS at it:**
   `PUBLISHING_FRONTEND=https://<app>.vercel.app node setup/02-site.mjs && PUBLISHING_FRONTEND=https://<app>.vercel.app node setup/09-frontend-env.mjs`
   This updates the UVE configuration and the site alias.
3. **Check everything:** `node setup/verify.mjs` should end with "all passed". Then open the frontend once as Hannah in UVE (Act 1, steps 1–3) to warm it up.
4. **After each rehearsal:** `node setup/reset-demo.mjs`. This puts the H3 back to "Organisation", DACH back in SME Review, APAC back to "sent back", and Iberia back to Approved. Users and tokens are untouched.
5. **Re-make the PDF from the approved article:**
   `PUBLISHING_FRONTEND=https://<app>.vercel.app ./channels/fetch.sh --upload`

---

## 0. Opening (0:00–3:00), no login

1. Frontend → **Insights** home. Say: *"Think of this as any channel that consumes your approved content: your current site, a PDF, a newsletter. The CMS behind your website stays. What we're adding is the governed layer underneath."*
2. Recap their three pains on one line each: editing is buried in nested components; there's no single source of truth for messaging; governance has to cover channels dotCMS doesn't publish to.

## Act 1: Edit in context, not in nested components (3:00–11:00), as **Hannah**

1. dotCMS (Hannah) → **Site → Pages** → open **Insights for research leaders**. The Universal Visual Editor (UVE) shows the real page.
2. In the editor, click the card **"Open access agreements: what libraries actually need"**. UVE follows the link to the article.
3. Scroll to the H3 **"How your Organisation can prepare"**. Point out the house style is US spelling. A dashed orange outline appears on hover.
4. Click the body → the block editor opens **in place**. Change *Organisation* → **Organization**. Click outside the editor; it saves.
5. Also show the H1: click it, and it's editable in place too. Don't change it.
6. Say: *"No hunting through nested components. And the live page hasn't changed yet."* Open the frontend in Firefox and refresh the article: it still says *Organisation*. The edit is a new draft; the live version stays approved.
7. Back in UVE, click **Open full editor and workflow** (the button above the body) → **Submit for Approval** → comment "US spelling fix in H3" → submit.

## Act 2: Governed workflow (11:00–24:00)

**Approval (Eleanor)**

1. Chrome profile 2 (**Eleanor**) → **Content → Search**, filter *Workflow step: Messaging Owner Approval*. Open the article. Show:
   - the comment from Hannah,
   - the item's **History**: who did what and when, with the earlier approvals too.
2. **Approve** → comment "Approved". Then **Publish to Web**.
3. Firefox: refresh the article. It now says *Organization*. *"One governed change, live."*

**Localisation with an SME step (Lukas → Priya → Eleanor)**

4. Chrome profile 1 → log in as **Lukas**. Content → Search → type *Localised Message*. Three items, in three different states:
   - **DACH** (German, Email): in **SME Review**.
   - **Iberia** (Spanish, Web): **Approved**.
   - **APAC** (English, Paid social): **Draft**, sent back.
5. Open **APAC**. Its history shows Eleanor's rejection: *"Two do-not-say phrases: 'proven ROI' and 'rank your researchers'…"*. Open the related **Source of truth** (Research funding impact) to show the **Do-not-say list**: *"A manual reference today. Automated checks against a guidelines list are on our roadmap."* (policy packs: roadmap only, don't show anything).
6. In the APAC body, replace the two phrases ("Proven ROI…" → "Show evidence of outcomes for every research dollar."; "Rank your researchers…" → "Understand your portfolio against the region's best.") → **Save Draft**.
7. Show the guard: click **Submit for SME Review**. It's refused: *"SME review is not needed for this item. Use Submit for Approval."* Then **Submit for Approval**.
8. Safari (**Priya**) → Content → Search → *SME Review* → open **DACH**.
   - Click **Reject** with an empty comment. It's refused: *"A comment is required to reject…"*. *"Every rejection carries a reason, so the localiser knows what to fix."*
   - Then **SME Approve** with the comment "DFG/FWF wording checked".
9. Chrome profile 2 (**Eleanor**) → open **APAC** (now in Messaging Owner Approval) → **Approve**.
   - Then click **Publish to Web**. It's refused: *"This item is for LinkedIn or social. Use Ready for External Channel: it is published in Sprinklr."*
   - Click **Ready for External Channel** → comment "Scheduled in Sprinklr".
   - Show the history entry: *"Approved for an external channel. Final publishing happens in Sprinklr: dotCMS holds the approved source, the version and the audit trail."*
10. Say: *"Governance doesn't stop where dotCMS's publishing stops. Social is published in Sprinklr, but it's approved, versioned and audited here."*

## Act 3: The Messaging Hub (24:00–33:00), Firefox

1. Frontend → **Messaging Hub**. Only current, approved sources of truth are listed, each with its owner under **"Who do I ask?"**.
2. Search **transformative** → no current match, but **"Also found in superseded versions"**: *Open access v1* with a **Superseded** badge and **Use the current version (v2) →**. *"Field teams can't accidentally reuse last year's messaging."*
3. Click a topic chip: **Open access** → open the card → the **topic page** shows:
   - key messages, approved proof points, the do-not-say list;
   - **Versions** (v2 current, v1 superseded) and **Who do I ask?**;
   - **Localised messages**: DACH, now past SME review and waiting for the Messaging Owner, with each item's latest comment.
4. Click **Version 1** → red **Superseded** banner with a link to v2.
5. **Sign in as Marco** (hub panel, right). The panel says *"Read-only access"*. Field teams read and share; they can't change anything.
6. Sign out, **sign in as Lukas** → **My items in review** lists his items and their states. *"Every regional marketer knows the latest approved version, and who's reviewing theirs."*

## Act 4: One content, many channels (33:00–41:00), terminal + Firefox

1. Terminal: `./channels/fetch.sh` → one approved message (Open access v2), three outputs:
   - `channels/out/web.json`: what a site or app consumes. Show the `governance` block (approved by, version, review-by date).
   - `channels/out/newsletter.html`: open it in Firefox; it's an email-safe newsletter section.
   - `channels/out/sprinklr-handoff.json`: the hand-off file for social (just a file; Sprinklr does the publishing). Show `doNotSay` and `doNotPublishAfter` (the source of truth's review-by date).
2. Governance on the way out: `./channels/fetch.sh --localised DACH`. If you approved DACH in Act 2 it goes through; if not, `./channels/fetch.sh --localised APAC` before Act 2 shows **REFUSED** with the reviewer's comment. *"Only approved content leaves dotCMS."*
3. PDF: `./channels/fetch.sh --upload` → open the article → **Download PDF**. The PDF shows **Organization** from Act 1. *"Same change, every channel, no copy-paste."*
4. Optional for technical people: the article's FAQ pairs render as FAQ structured data (view source: `application/ld+json`) for search and answer engines.

## Close (41:00–45:00)

1. Map back to the pains:
   - **Editing:** in context, one click on the heading.
   - **Single source of truth:** current versions, superseded flagged, owner named, localisations tied to their source.
   - **Governance across channels:** the same workflow and audit trail for web, PDF, email, LinkedIn and Sprinklr.
2. Roadmap, presented as roadmap only: **policy packs** (automatic checks against a guidelines list such as the do-not-say list).
3. Next step: a working session with their content team on one topic, using their real messaging.

---

### If something goes wrong

- **UVE shows a blank page or an error:** the UVE configuration doesn't point at a reachable frontend. Re-run step 2 of "Before the demo".
- **A workflow button is missing:** check you're logged in as the right person (see the table above), and that the item is in the step you expect (Content → Search → Workflow step filter).
- **The hub sign-in fails inside UVE:** expected, because browsers block its cookie in an iframe. Use the hub in a normal tab.
