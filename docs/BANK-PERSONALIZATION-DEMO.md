# bank.com Personalization Demo — Navattic Capture Guide

Marketer-facing demo: one page, three personas, container-level content swaps driven by
the dotCMS Universal Visual Editor persona dropdown.

- **dotCMS admin:** http://localhost:8082 (`admin@dotcms.com` / `admin`)
- **Frontend:** http://localhost:3000 (`npm run dev:bank` from `~/headless/generaldemos`)
- **Site:** bank.com — `4afebb3f5a60baed95fa8e55e1038087`
- **Page:** Bank Home Page `/index` — `486b12c34279876eeb27cde08c03f70a`

---

## 1. The personas

### Mortgage Seeker — `MortgageSeeker`
`0011c4e777742403b4c74f1ebf36599c`

First-time or move-up buyer actively shopping for a home loan.

| | |
|---|---|
| **Who** | 28–40, household income $85K–$160K, pre-shopping or mid-search |
| **Goal** | A monthly payment number they trust, and a pre-approval letter strong enough to make offers with |
| **Anxiety** | Rates moving before they close; being told "it depends" |
| **Objection** | "Every bank quotes a teaser rate and the real number shows up at closing" |
| **What they should see** | A rate, a timeline, and a concrete next step — not a general "we do mortgages" page |

### Business Owner — `BusinessOwner`
`c03b0053a91ea923e81587cfe9aa8381`

Owner-operator of a small business, 2–40 staff.

| | |
|---|---|
| **Who** | 35–55, running payroll, taking card payments, managing lumpy cash flow |
| **Goal** | A line of credit in place *before* it's needed, and faster access to receipts |
| **Anxiety** | A slow month catching them without credit; deposits landing too late for payroll |
| **Objection** | "Big banks don't answer the phone, and my branch manager changes every year" |
| **What they should see** | Operational specifics — funding speed, transaction limits, who they actually talk to |

### Savings Shopper — `SavingsShopper`
`a67976af3737b32008defbdd3d17ee23`

Rate-driven saver comparing APYs across banks.

| | |
|---|---|
| **Who** | 45–65, meaningful cash balance, financially literate, reads the fine print |
| **Goal** | Highest yield without fees, minimums, or a rate that quietly drops |
| **Anxiety** | Being defaulted into a 0.01% legacy savings account |
| **Objection** | "The headline APY expires in 90 days or only applies to the first $10,000" |
| **What they should see** | The number, the conditions, and an explicit promise about what *doesn't* change |

> Reused the pre-existing `SavingsAccountsInterest` persona (renamed) rather than leaving an
> orphan duplicate in the dropdown.

---

## 2. The content matrix

Same page, same containers, four variants. The page follows a conventional retail-banking
structure (modelled on cgd.pt): one hero, then products, solutions, simulators, and standard
information. **Four of the five sections are personalized**; the last is shared.

| # | Section | Container | Content type | Personalized |
|---|---|---|---|---|
| 1 | Hero | banner `uuid-1` | `Banner` | ✅ |
| 2 | Product cards ×3 (+ heading) | default `uuid-1..4` | `SectionHeading` + `BankCard` | ✅ |
| 3 | Financial solutions ×3 (+ heading) | default `uuid-5..8` | `SectionHeading` + `BankCard` | ✅ |
| 4 | Credit simulators ×3 (+ heading) | default `uuid-9..12` | `SectionHeading` + `BankCard` | ✅ |
| 5 | Banking with us ×3 (+ heading) | default `uuid-13..16` | `SectionHeading` + `BankCard` | shared |

17 placements per persona, 68 in total. Section 5 is deliberately identical for everyone —
security, app and support information does not change by audience, and having one constant
section makes the personalized ones read as a deliberate choice rather than a gimmick.

### Default (anonymous)
> **Banking that works the way you do**
> Checking, savings, lending and business accounts — all in one place, with no monthly
> maintenance fees. — *Explore accounts*

**Accounts built around how you actually bank** — Straightforward products, clearly priced. Pick the one that fits.

`Everyday Checking` · `High-Yield Savings` · `Home Lending`

### Mortgage Seeker
> **Lock your rate. Then go find the house.**
> Get a verified pre-approval in about 15 minutes and shop with the confidence of a cash
> buyer. No application fee, no obligation. — *Get pre-approved*

**Financing options for your move** — Compare the three paths most buyers choose, and see which payment works.

| Card | Copy |
|---|---|
| 30-Year Fixed | 6.12% APR. Predictable principal and interest for the life of the loan — the safe default for buyers who plan to stay put. |
| 5/1 Adjustable Rate | 5.48% APR for the first five years. Lower early payments for buyers who expect to move or refinance before year six. |
| First-Time Buyer Program | As little as 3% down, reduced PMI, and a $1,500 closing-cost credit for qualified first-time buyers. |

### Business Owner
> **Your business doesn't keep banker's hours. Neither do we.**
> Business checking with no transaction limits, next-day merchant deposits, and a credit
> line you can draw on before you need it. — *Open a business account*

**Banking that keeps your business moving** — Built for owner-operators who need answers, funding and support without the runaround.

| Card | Copy |
|---|---|
| Business Checking | No transaction limits, no monthly fee above a $2,500 balance, and same-day ACH origination. |
| Merchant Services | Accept cards in person or online with next-business-day funding and flat 2.6% + 10¢ pricing. |
| SBA & Working Capital | SBA 7(a) loans and revolving lines from $25K to $5M, with decisions in as few as three business days. |

### Savings Shopper
> **4.35% APY. No minimum. No monthly fee.**
> Our High-Yield Savings pays over 9x the national average. No teaser rate that quietly
> drops after 90 days — just a rate that stays competitive. — *Start saving*

**Put every dollar to work** — Three ways to earn more on the cash you already have. No fees, no minimums, no surprises.

| Card | Copy |
|---|---|
| High-Yield Savings | 4.35% APY on every dollar, no tiers and no minimum. Rate applies to the full balance, not just the first $10,000. |
| 12-Month CD | 4.60% APY guaranteed for a full year. $500 minimum, with an early-withdrawal penalty of just 90 days' interest. |
| Money Market | 4.15% APY with check-writing and debit access — liquidity when you need it, yield while you don't. |

### Section 3 — Financial solutions

| Variant | Heading | Cards |
|---|---|---|
| Default | Financial solutions | Home Insurance · Retirement Savings · Investment Funds |
| Mortgage | Solutions for homeowners | Home Insurance · Mortgage Life Cover · Home Improvement Loan |
| Business | Solutions for your business | Business Insurance · Commercial Property · Payroll & Benefits |
| Savings | Ways to grow it further | Retirement Savings · Investment Funds · Wealth Review |

### Section 4 — Credit simulators

| Variant | Heading | Cards |
|---|---|---|
| Default | Credit simulators | Mortgage · Personal Loan · Car Loan |
| Mortgage | Run the numbers first | Mortgage · Affordability Check · Refinance |
| Business | Business credit simulators | Working Capital · Equipment Finance · SBA Loan |
| Savings | Savings simulators | Savings Growth · CD Ladder · Goal Planner |

The simulators are presentational cards, not working calculators. If a prospect asks, that is
the honest answer — the demo is about how the *page* adapts, not about the calculator itself.

### Section 5 — Banking with us (shared)

Digital Banking · Security & Protection · Help & Support. Identical for every persona.

### Unplaced content

Four mid-page CTA banners ("See your real number in 15 minutes", etc.) and the persona blog
posts exist on bank.com but are no longer placed on the homepage — the earlier two-hero layout
was replaced. They remain available in the UVE content picker, which is useful if you want to
show a marketer dragging new content in. The blog posts are still live at `/blog`.

> Rates are illustrative. Swap for current figures before showing a live prospect.

---

### Persona tags

Each persona carries a **Key Tag** (its identifier, used to tag content and weighted heavily by
`$dotcontent.pullPersonalized`) and **Other Tags** (interests, added to a visitor's accrued tag
cloud on assignment and kept there even after the persona changes).

| Persona | Key Tag | Other Tags |
|---|---|---|
| Mortgage Seeker | `MortgageSeeker` | mortgage · home buying · first-time buyer · down payment · rates · lending |
| Business Owner | `BusinessOwner` | business · cash flow · payroll · payments · lending · strategy |
| Savings Shopper | `SavingsShopper` | savings · apy · rates · cd · savings account · account types |

All are drawn from tags that already existed on bank.com. The overlaps are deliberate —
`lending` on two personas, `rates` on two — because a visitor who accrues `rates` from one
persona and later matches another ends up with a genuinely richer profile, which is the point
of the accrual behaviour.

Set on 2026-09-14. **Nothing in this demo currently depends on them**: personalization here
runs through `multi_tree` container placement keyed by persona, which works with no tags at
all. They matter for the follow-up question — "how would dotCMS pick a persona on its own, or
build a profile over a session?" — where the visitor tag cloud is the answer.

## 3. Persona assignment rules

Three site rules on bank.com assign a persona automatically, so the demo can show
personalization happening to a *visitor* rather than only being previewed by an editor.
All three fire on `EVERY_PAGE` and use the `PersonaActionlet`.

| Rule | Priority | Assigns |
|---|---|---|
| Persona: Mortgage Seeker — campaign & intent | 10 | Mortgage Seeker |
| Persona: Business Owner — campaign & intent | 20 | Business Owner |
| Persona: Savings Shopper — campaign & intent | 30 | Savings Shopper |

Each rule has one OR group with 5 conditions: four campaign matches and one explicit override.

### Campaign triggers — these work today

| Persona | `utm_campaign` contains |
|---|---|
| Mortgage Seeker | `mortgage`, `home-loan`, `preapproval`, `refinance` |
| Business Owner | `business-banking`, `merchant`, `sba`, `payroll` |
| Savings Shopper | `savings-account`, `apy`, `high-yield`, `cd-rates` |

```
http://localhost:3000/?utm_campaign=mortgage         -> Mortgage Seeker
http://localhost:3000/?utm_campaign=sba              -> Business Owner
http://localhost:3000/?utm_campaign=high-yield       -> Savings Shopper
http://localhost:3000/?utm_campaign=newsletter       -> no persona (default content)
```

**Keywords must not overlap.** The rules originally matched a bare `business` and a bare
`savings`, so `?utm_campaign=business-savings-account` matched both the Business Owner and
Savings Shopper rules. Every rule fires on every page and each one calls `Set Persona`, so the
*last* rule to run won regardless of priority — the visitor got Savings Shopper even though
Business Owner is the higher-priority rule. `shortCircuit` does not help here: it stops
condition evaluation *within* a rule, not the rules that follow. The fix is keyword hygiene —
no keyword may be a substring of another, across all three rules. Verified 2026-09-14.

Keep these in sync with `CAMPAIGN_KEYWORDS` in `src/utils/personaTargeting.ts`; the frontend
resolves campaigns itself (see section 3.1) and the two lists must agree.

There is also an explicit override for QA and for driving the demo deliberately:
`?persona=MortgageSeeker` / `?persona=BusinessOwner` / `?persona=SavingsShopper`.

**The assignment sticks to the session.** dotCMS sets a `dmid` visitor cookie on the first
request; every later page in that session keeps the persona without the parameter. That is
what makes the "arrive from an ad, then browse normally" story work on camera.

**Rules fire on the page request, not on the JSON API.** Calling
`/api/v1/page/json/...&fireRules=true` directly does not assign a persona. Hit a page dotCMS
serves itself (`http://localhost:8082/?utm_campaign=mortgage`), which runs the rules and sets
the `dmid` cookie; the API then reflects it in `viewAs.persona`.

### How targeting works on the headless frontend

The dotCMS rules alone do **not** personalize the Next.js site on :3000. The app calls the
page API server-side with an API token and no visitor cookie, so dotCMS sees a fresh anonymous
request every time and the rules never attach a persona to anyone.

The frontend therefore mirrors the same campaign logic locally:

- `src/utils/personaTargeting.ts` — campaign keywords → persona id, in one place. **Keep these
  keywords in sync with the dotCMS rules**; they are deliberately duplicated so the site works
  headlessly and the rules remain the documented source of truth.
- `src/middleware.ts` — writes the resolved persona to a `bank_persona` cookie so the
  assignment survives the rest of the session (a Server Component cannot set cookies).
- `src/app/[[...slug]]/page.tsx` — resolves persona per request and passes it to the page API.

Precedence: `com.dotmarketing.persona.id` (UVE) → `?persona=` override → `?utm_campaign=` →
`bank_persona` cookie.

Verified end to end on :3000:

```
/?utm_campaign=mortgage    -> "Lock your rate. Then go find the house."   cookie=MortgageSeeker
/  (no parameter, same session) -> still the mortgage hero
/  (fresh visitor)         -> "Banking that works the way you do"
```

### Removed: the visited-URL conditions

Each rule used to carry two `VisitedUrlConditionlet` conditions (Mortgage Seeker, for example,
matched a visit to `/blog/post/rate-locks-explained` or `/blog/post/down-payment-how-much`).
**All six were deleted on 2026-09-14.** They could never fire here, for two independent
reasons:

1. `ENABLE_CLICKSTREAM_TRACKING=false` in `dotmarketing-config.properties`, so dotCMS records
   no page visits at all (`SELECT count(*) FROM clickstream` returns 0).
2. The blog pages are served by Next.js on :3000. Even with clickstream on, dotCMS never sees
   those requests, so it cannot know the visitor read them.

They were previously left in place to document the intended behavioural targeting, but they
are visible in the Rules UI — a prospect shown that screen reads them as working behaviour,
and the rules screen is worth showing. Behavioural targeting needs clickstream enabled AND the
frontend reporting reads back to dotCMS; rebuild these conditions then, rather than leaving
non-functional ones on display.

### 3.1 Behavioural assignment — reading an article

A visitor who arrives with no campaign parameter is assigned a persona by what they
**read**. Every tagged article accrues its tags onto a weighted profile in the
`bank_tags` cookie, and once that profile leans decisively towards one persona the
`bank_persona` cookie is set and the homepage personalizes on the next visit.

```
/                                    default hero, no cookies
/blog/post/rate-locks-explained      tags: mortgage:1, rates:1, home buying:1
                                     -> bank_persona=MortgageSeeker
/                                    mortgage hero
```

| Article | Tags accrued | Assigns on one read? |
|---|---|---|
| rate-locks-explained | mortgage, rates, home buying | Mortgage Seeker |
| down-payment-how-much | mortgage, down payment, first-time buyer | Mortgage Seeker |
| cash-flow-gaps | business, cash flow, lending | Business Owner |
| same-day-ach-payroll | business, payments, payroll | Business Owner |
| apy-vs-interest-rate | savings, apy, rates | Savings Shopper |
| cd-ladder-basics | savings, cd, strategy | no — needs a second article |
| chequing-vs-savings-key-differences | account types, banking, savings account | no |
| 5-ways-to-save-more-each-month | savings, strategy, savings account | no |
| what-is-digital-banking | banking, account types | no |

Scoring is in `src/utils/tagAccrual.ts`: each persona scores the sum of its own tag
counts in the visitor's profile, and the leader is assigned once it reaches **3** and
is not tied. The six strongly-themed articles clear that on a single read; the weaker
ones accrue and assign on the second. A tie assigns nothing — an ambiguous profile
should see the default page rather than a guess.

**Campaign assignment wins and is not overwritten.** A visitor who arrives on
`?utm_campaign=sba` stays a Business Owner even if they then read a mortgage article;
tags keep accruing, but the existing assignment stands.

**Why this lives in the frontend.** dotCMS does this natively — it accrues tags from
every page it serves onto the Visitor object — but only for pages *it* serves. bank.com
is rendered by Next.js and the page API is called server-side with a token, so dotCMS
sees an anonymous machine request and accrues nothing against the real visitor. Its tag
cloud is keyed on the `JSESSIONID` it sets when serving a page, which a visitor to :3000
never receives. And there is no conditionlet that reads accrued tags, so even with the
visits visible no rule could act on them — dotCMS rules fire on request and behaviour
signals (see the [condition types](https://dev.dotcms.com/docs/author/personalization/rule-conditions/condition-types),
21 of them, none tag-based). If a prospect asks whether dotCMS is doing this: the model
is dotCMS's, the implementation is the frontend's, because a headless frontend has to
participate in the visitor session for the native path to work.

Verified 2026-09-15 against all four journeys: one strong article, two weak articles,
the business path, and campaign-not-overridden.

## 4. Navattic capture script

Record at **1440×900**, browser zoom 100%, chrome hidden. Let each page fully settle before
capturing — the persona swap re-renders the iframe.

| # | Screen | Action to capture | Tooltip copy |
|---|---|---|---|
| 1 | dotCMS admin, Pages list | Land on the Pages view, bank.com selected | "Everything starts in one place — the pages your team already manages." |
| 2 | Bank Home Page in UVE | Open the page in the Universal Visual Editor | "This is the live homepage, editable exactly as visitors see it." |
| 3 | UVE toolbar, persona dropdown closed | Highlight the persona selector | "One page. The audience switcher lives right here — no developer, no separate site." |
| 4 | Dropdown open, 3 personas visible | Capture the open list with all avatars | "Personas are defined once and reused everywhere." |
| 5 | Mortgage Seeker selected | Page re-renders with mortgage hero + 3 mortgage cards | "Select Mortgage Seeker and the page rewrites itself — hero, offers and calls to action." |
| 6 | Hero zoomed | Focus the headline + CTA | "Rate certainty and a 15-minute pre-approval — what this visitor actually came for." |
| 7 | Card row zoomed | Focus the 3 mortgage products | "The product row swaps too: fixed, ARM, and a first-time buyer program." |
| 8 | Business Owner selected | Page re-renders with business content | "Same page, same URL. A business owner sees an entirely different bank." |
| 9 | Card row zoomed | Focus merchant services / SBA | "Funding speed and transaction limits — the things an owner-operator actually asks about." |
| 10 | Savings Shopper selected | Page re-renders with APY hero | "And a rate shopper gets the number, up front." |
| 10b | Scroll to Financial solutions | The solutions row in the persona view | "Below the products, the solutions change too — a homeowner sees mortgage life cover, a business owner sees commercial property." |
| 10c | Scroll to Credit simulators | The simulator row | "Even the calculators offered are the ones this visitor would actually use." |
| 10d | Scroll to Banking with us | The final shared row | "And some things stay constant for everyone — security, the app, how to reach us." |
| 11 | Drag a card in UVE | Mid-drag, reordering within the persona view | "Editing a persona's page is the same drag-and-drop as any other page." |
| 12 | Back to default view | Persona cleared | "Unknown visitors still get a strong default — personalization never leaves a blank page." |
| 13 | Live site :3000 | The published homepage | "Everything you just saw is live on the real site, server-rendered." |

**Closing frame:** "Three audiences. One page. Zero developer tickets."

### Optional chapter 2 — the visitor side

The rules make a second, shorter story recordable: personalization happening *to* a visitor,
with no editor involved. Use a fresh incognito window per persona so the `dmid` cookie resets.

| # | Screen | Action | Tooltip copy |
|---|---|---|---|
| 1 | Ad or email mockup | A banner ad for mortgage rates | "A visitor clicks a mortgage ad." |
| 2 | `:3000/?utm_campaign=mortgage` | Homepage loads, mortgage hero | "They land on the homepage — and it already speaks to why they came." |
| 3 | Scroll the page | CTA band + mortgage articles | "Offers, calls to action and articles, all matched to that one signal." |
| 4 | Click through to another page, then Home | Persona persists with no parameter | "No parameter in the URL now. The site remembers for the rest of the session." |
| 5 | New incognito, `?utm_campaign=sba` | Business hero | "A different ad, a different visitor, the same homepage." |

**Closing frame:** "One campaign parameter. The whole page follows."

### Recording notes
- **Persona avatars matter.** Step 4 is the money shot; all three have photos loaded.
- **Don't record `/example` or `/404`** — leftover scaffolding pages.
- All five sections are personalized, so the whole page is safe to scroll on camera.
- If a swap doesn't render, see the troubleshooting note below before re-recording.

---

## 5. How it's wired (for questions after the demo)

Personalization lives in the `multi_tree` table: each container/contentlet relationship is
tagged with a personalization key.

```sql
SELECT personalization, relation_type, child
FROM multi_tree WHERE parent1='486b12c34279876eeb27cde08c03f70a';
--  dot:default                | 9 rows
--  dot:persona:MortgageSeeker | 9 rows
--  dot:persona:BusinessOwner  | 9 rows
--  dot:persona:SavingsShopper | 9 rows
```

Content placement:

```
POST /api/v1/page/{pageId}/content
[{"personaTag":"MortgageSeeker","contentletsId":["..."],"identifier":"{containerId}","uuid":"2"}]
```

Verification (note the parameter name — this is the one that bites):

```
GET /api/v1/page/json/index?host_id={siteId}&com.dotmarketing.persona.id={personaId}
```

### Troubleshooting: every persona shows the same content

Two causes, both silent:

1. **Wrong query parameter.** It is `com.dotmarketing.persona.id`. `persona_id` and
   `personaId` return HTTP 200 with default content. Check `entity.viewAs.persona.name`
   is non-null.
2. **Content is placed but renders as an empty box.** Block Editor `body` must be sent to the
   API as a JSON *string* (`json.dumps(doc)`), not a nested object. An object is stored as
   Java's toString form and `DotCMSBlockEditorRenderer` silently renders nothing. Confirm
   `body` comes back as a dict, not a str, in the page API response.
3. **A container went empty after an edit.** `POST /api/v1/page/{pageId}/content` replaces the
   entire placement set for that personalization — it is not a per-uuid upsert. Adding one row
   deletes the rest. Always post the complete set of rows for a variant in a single call.
4. **The frontend drops the persona.** UVE proxies edit mode to `localhost:3000` and appends
   the persona as a query param. `src/app/[[...slug]]/page.tsx` must read `searchParams` and
   pass `personaId` into `getDotCMSPage` — this was fixed on 2026-09-14. Without it the
   dropdown changes nothing and dotCMS looks broken when it isn't.

### Template note

The five-section layout is nine rows on the page's template
(`8e87ba3b47bf785e0357755d444da567`, an anonymous drawed layout). A drawed template must be
updated with BOTH `layout` and a matching `body` of `#parseContainer('<containerId>','<uuid>')`
lines — one per container in the layout, in order — or the PUT fails with
`body required when drawed`. New uuids become available to the page immediately after the
template update; no page republish is needed.

**dotCMS renumbers container uuids sequentially when you rewrite a layout.** Explicit uuids in
the payload are not honoured — the second `default` container in row order becomes `2`, the
third `3`, and so on regardless of what you sent. Always re-read the layout after a template
PUT and build the multi-tree placement against the uuids dotCMS actually assigned, not the ones
you asked for.

### Visual design

The cards were originally Block Editor rich text, which gave the design nothing to hook onto —
a flat, text-heavy column. Two purpose-built content types replaced that, modelled on how
cgd.pt presents products:

- **`BankCard`** — `image`, `icon` (12-option select), `figure` + `figureLabel`, `description`,
  `ctaText`/`ctaLink`, `accent`. The **figure is the point**: a bank leads with the rate, so
  `4.35% APY` or `6.12% APR` renders larger than the card title, the way CGD shows TAEG/TANB.
- **`SectionHeading`** — `eyebrow`, `title`, `subtitle`, so each row announces itself
  ("OUR ACCOUNTS", "SOLUTIONS", "SIMULATORS").

Rendered by `src/components/content-types/BankCard.tsx` and `SectionHeading.tsx`, with styles
in `globals.css` using the existing sky-blue design tokens. Icons are inline SVG (no icon
library added). Product and solution cards carry photography; **simulator cards are
deliberately icon-only** — a lighter treatment that keeps the tool row from competing with the
product rows above it, and stops the page becoming an undifferentiated wall of images.

Visual rhythm comes from alternating full-bleed tinted bands (`#dot-section-3/4` and `7/8`)
against white, so the five sections read as distinct rather than as one long scroll.

**Adding a new content type to a file-based container needs a `.vtl` file, not an API call.**
`//bank.com/application/containers/default/` derives its allowed types from the `.vtl` files in
that folder, so `BankCard` and `SectionHeading` required `bankcard.vtl` and `sectionheading.vtl`
to be published there. Until they existed, placement failed with
`Content type 'X' is not allowed in this container`. The site is headless — React renders the
cards — so those VTL files only need to be valid enough for Velocity fallback and UVE handles.

### Content type note

`Banner` had no `HostFolderField`, so new banners landed on System Host instead of bank.com.
A `bannerHost` field was added to the type on 2026-09-14 (additive; the 12 pre-existing
banners across the other demo sites were unaffected). Product cards are `webPageContent`
rather than `Product`, because `Product` still lacks a host field and requires an image
reference.
