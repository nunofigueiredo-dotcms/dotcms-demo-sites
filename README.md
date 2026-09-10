# generaldemos

Docker stack plus the Next.js frontends for the dotCMS demo sites.

## Layout

```
generaldemos/
├── docker-compose.yml         # dotCMS + Postgres + OpenSearch (project name: generaldemos)
├── package.json               # npm workspace root — ONE shared node_modules
├── node_modules/              # ~485 MB, hoisted; workspaces have none of their own
├── frontend/                  # bank.com                → :3000
├── frontend-spiritvoice/      # spiritvoice.com         → :3002
├── frontend-govconnect/       # govconnectcentral.com   → :3003
├── frontend-forgehub/         # forgehub.com            → :3004
└── docs/
    ├── CREATING-NEW-SITES.md  # how to build another site
    ├── new-site.py            # CLI helper
    └── dotcms_site.py         # same module, importable name
```

`brightwater.com` (:3001) lives in `~/demos/dotcms-healthcare-demo` and is **not**
part of this workspace — it has its own `node_modules`.

## Running

```bash
cd ~/headless/generaldemos
docker compose up -d          # dotCMS on :8082

npm install                   # once — installs for ALL frontends

npm run dev:bank              # :3000
npm run dev:spiritvoice       # :3002
npm run dev:govconnect        # :3003
npm run dev:forgehub          # :3004
npm run dev:all               # all four at once
```

## Why a workspace

Each frontend is the same codebase with a different `NEXT_PUBLIC_DOTCMS_SITE_ID`.
Before consolidating, four identical `node_modules` used 1.8 GB; hoisting them to
the root brought that to 485 MB.

**Adding a frontend:** create the folder, give its `package.json` a unique `name`
and a pinned `-p <port>`, add the folder to `workspaces` in the root
`package.json`, then run `npm install` from the root.

## Gotchas

- **Do not symlink `node_modules`** into a workspace — Turbopack rejects symlinks
  that point outside the filesystem root. Workspaces solve this properly.
- **Pin the port** in every workspace's `dev` script. Without it two sites race
  for 3000 and the second silently takes 3001, colliding with healthcare.
- Each frontend needs its own `.env.local` (gitignored — it holds a real token).
- `npm install` warns that `sharp` and `unrs-resolver` postinstall scripts were
  not run. Both still work; Next.js image optimisation is fine.
