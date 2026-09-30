# Vodafone Egypt demo website (dotCMS, Next.js)

**Read `DEMO-CONTEXT.md` first** — the demo plan, where every piece lives
(dotCMS site, this website, the iPhone app, build scripts), what was built,
gotchas and talking notes.

The web front end for site **telcodemo.com** on
https://awesomedemo-dev.dotcms.dev, styled after web.vodafone.com.eg with
Vodafone's real assets. Part of the `~/headless/generaldemos` npm workspace —
install from the workspace root, never here.

## Running

```bash
cd ~/headless/generaldemos
npm run dev:vodafone          # http://localhost:3007
```

`.env.local` (gitignored, copy from `.env.local.example`) holds the dotCMS
host, token and site id. No test suite: check with `npx tsc --noEmit`,
`npm run lint`, `npm run build`, and by loading the pages.

## How it fits together

- `src/app/[[...slug]]/page.tsx` — every URL is a dotCMS page. The
  Universal Visual Editor loads pages with `?mode=EDIT_MODE|PREVIEW_MODE`;
  that mode is passed to dotCMS (draft content, Style editor schemas).
- `src/views/Page.tsx` — `useEditableDotCMSPage` + `DotCMSLayoutBody`.
- Hero: `VodafoneHeroSlide` is one banner; `VodafoneHeroCarousel` rotates its
  related slides (shared design in `components/site/HeroSlideView.tsx`).
- `src/components/content-types/` — one component per `Vodafone*` content
  type; `index.tsx` maps type variables to components.
- `src/utils/queries.ts` — extra GraphQL loaded with each page: menu, hero
  slides (carousels list theirs by identifier), plans (with the
  `subscriptions` relationship), stores. `+live:true` on the site,
  `+working:true` in the editor.
- `src/utils/images.ts` / `imageLoader.ts` — image fields reference the
  media library; images are served resized from `/dA/{id}/{w}w/80q`.
- `dotcms/style-schemas/` — Style editor options, pushed with
  `npm run style-schemas`.
- `dotcms/apivtl/` — scripted JSON endpoints (`/api/vtl/...`), uploaded by
  `../docs/vodafone-apis.py`.
- `src/app/globals.css` — Vodafone tokens (`#e60000`, `#333`, `#f4f4f4`)
  and all component styles.

dotCMS side: `../docs/build-vodafone.py`, `../docs/vodafone-editorial.py`,
`../docs/vodafone-apis.py`; run sheet `../docs/VODAFONE-DEMO.md`.
