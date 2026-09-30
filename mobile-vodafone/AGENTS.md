# Vodafone Egypt demo app (dotCMS, React Native)

**Read `DEMO-CONTEXT.md` first** — the demo plan, where every piece lives
(dotCMS site, website, scripts), what was built, gotchas and talking notes.

An Expo / React Native iPhone app that reads the Vodafone Egypt demo content
(site **telcodemo.com** on https://awesomedemo-dev.dotcms.dev) over dotCMS
GraphQL. The website for the same content is
`~/headless/generaldemos/frontend-vodafone` (port 3007); both render the same
content types, so a change in dotCMS shows up in both.

## Running

```bash
cd ~/headless/generaldemos/mobile-vodafone
cp .env.example .env.local        # then paste a token into EXPO_PUBLIC_DOTCMS_AUTH_TOKEN
npm install                       # here, not at the workspace root (see below)
npm run ios                       # Metro + Expo Go on the booted iOS simulator
# or, from ~/headless/generaldemos: npm run ios:vodafone
```

- Lives in the `generaldemos` repo but is **not** an npm workspace: Expo pins
  its own React Native versions, so it keeps its own `node_modules`.

- Runs in **Expo Go** — no `ios/` folder, CocoaPods or Xcode build needed.
- `expo start --ios` opens the *first* booted simulator. To target the iPhone
  17 Pro Max, boot only that one, or run `npx expo start` and
  `xcrun simctl openurl <udid> exp://127.0.0.1:8081`.
- Leave `EXPO_PUBLIC_DOTCMS_AUTH_TOKEN` out of `.env.local` rather than empty:
  an empty line there overrides a token set in the shell.
- EXPO_PUBLIC_* values are compiled into the app bundle. Fine on the
  simulator; use a read-only token for anything shared.

## How it reads dotCMS

- `src/lib/dotcms.ts` — `graphql()` POSTs to `/api/v1/graphql`; `imageUrl()`
  turns `/dA/…` paths into resized image URLs (images need no token).
- `src/lib/queries.ts` — every query. `fetchPage(url)` asks for a page's
  layout and containers and flattens them into sections in layout order;
  collections (plans, stores) are filtered with
  `+conHost:<site> +live:true +deleted:false`.
- A `VodafoneHeroSlide` on a page is one banner; a `VodafoneHeroCarousel`
  lists its slides by identifier, and `fetchSlides(ids)` loads them for the
  swipeable carousel (`page-sections.tsx`).
- `src/components/sections/page-sections.tsx` — maps content type variables
  (`VodafoneTile`, `VodafoneFaq`, …) to native components, like the website's
  `pageComponents`. Unknown types are skipped.
- Tabs: Home `/`, Plans `/plans`, Cash `/vodafone-cash` are dotCMS pages;
  Stores queries `VodafoneStoreCollection` and shows a map.
- Pull down on any tab to reload from dotCMS.

## Checks

`npx tsc --noEmit` and `npx expo lint`. No test suite — verify on the
simulator.

---

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
