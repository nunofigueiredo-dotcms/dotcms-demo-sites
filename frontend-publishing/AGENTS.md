# frontend-publishing

The Next.js frontend for the **publishing-demo** site on awesomedemo-dev (an
Elsevier Academic & Government messaging-governance demo; fictional content).
Port **3010**: `npm run dev:publishing` from the workspace root.

The dotCMS side (site, roles, users, workflow, content types, seed content) is
built by the scripts in `../publishing-demo/setup/`; see
`../publishing-demo/PLAN.md` and `../publishing-demo/DEMO-SCRIPT.md`.

## How it works

- `src/app/[[...slug]]/page.tsx` renders every dotCMS page and picks a view:
  `/` → `HomeView` (its banner is a `PdHomeBanner` placed in the page's container,
  rendered by `DotCMSLayoutBody` and editable in place), `/hub` → `HubView`, URL-mapped `PdArticle` → `ArticleView`
  (client component, editable in the Universal Visual Editor), URL-mapped
  `PdMessagingSot` → `TopicView`.
- `src/lib/dotcms.ts` is the only code that talks to dotCMS. It runs **on the
  server only**, with `DOTCMS_READ_TOKEN`: a read-only token for the
  `hub-service@publishing-demo.example` account (Hub Reader role). Never give it
  a `NEXT_PUBLIC_` name.
- Hub sign-in (`/api/hub/login`) uses the person's own dotCMS session, kept in an
  httpOnly cookie, for "My items in review". Passwords aren't stored.
- `/print/articles/[slug]` is the print layout that `channels/fetch.sh` turns into
  the article PDF.

## Things that bit us (dotCMS 26.11)

- SDK must match the instance: pinned to `26.11.6-3` here (the other frontends
  use 26.9.3-1, which this instance reports as unsupported).
- Categories arrive as `[{ key: "Name" }]` from REST but as
  `{ categories: [{ key, name }] }` through the SDK's page call; `topicName()`
  handles both.
- Messages in German or Spanish point to English sources of truth. Search with
  `depth` and GraphQL don't follow that; `GET /api/v1/content/{id}?depth=1` does.
- Don't use `sort` in `_search` (an unsortable field silently returns nothing);
  sort in code.
- Tailwind v4: custom CSS lives in `@layer base` / `@layer components`, or it
  overrides utilities like `py-*`.

Verify changes with `npm run build` and `npm run lint`, then
`node ../publishing-demo/setup/verify.mjs`.
