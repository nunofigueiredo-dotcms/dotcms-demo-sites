# Franchisee provisioning

`provision-franchisees.py` sets up Sandler franchisees in dotCMS from
`franchisees.csv`. It is idempotent: each run creates what's missing and
corrects what drifted, so edit the CSV and run it again.

```bash
export DOTCMS_HOST=https://awesomedemo-dev.dotcms.dev
export DOTCMS_AUTH_TOKEN=...            # admin API token — never commit it
python3 docs/provision-franchisees.py   # or --csv other.csv, or --audit-only
```

**Test data only** until the customer approves real names and emails. New
users get a random password, saved to `docs/franchisee-users.local.csv`
(gitignored, mode 600). Passwords are never printed.

## The CSV

```csv
franchisee,slug,tier,master_franchise,user_email,user_first,user_last,access_level
Cora Growth Partners,cora,standard,,heathe@dotcms.com,Heather,Test,editor
```

One row per user per franchisee. `tier` is `basic`, `standard` or `advanced`.
`access_level` is `editor` or `viewer`. `master_franchise` is the slug of the
master franchisee, if any. Its editors get the `Master – <slug>` role, with
editor rights on the sub-franchisee's folder.

## What it creates

| Step | Result |
|---|---|
| Roles | `HQ > HQ – Admin, HQ – Reviewer` · `Franchisees > <slug> > Franchisee – <slug> – Editor / Viewer (/ Master – <slug>)` · `Franchisees > All franchisees, All franchisee editors` · `Tiers > Tier – Basic / Standard / Advanced` |
| Folders | `/locations/<slug>/`, the franchisee's training center page and any pages of its own. Permissions are set on the folder itself (inheritance broken; any other role is removed). A starter center page is created only when the folder has none, so franchisee edits (or the site's page) are never overwritten |
| Site | HQ Admin: everything. HQ Reviewer: view/edit/publish. All franchisees: view the global pages. `/images`: franchisees view, HQ reviewers manage |
| Tiers | **Off for now** (`USE_TIERS = False`): every editor gets every component and approved template. When on, components live in `/_components/<tier>/` and take that folder's permissions, templates get per-tier "use" permission, and Advanced may edit page layouts |
| Workflow | **Franchisee Publishing**: Draft → In Review → Published. Save and Submit for Review → franchisee editors. Publish, Reject, Unpublish, Archive → HQ. It is the only workflow on the component types and the new **Franchisee Page** type |
| Users | Created if missing; given their roles plus back-end access. Managed roles the CSV no longer gives are removed |
| Audit | Fails if any franchisee role can publish, edit permissions, or reach another franchisee's folder |

Tiers, components, templates, the skeleton pages and the tool-group name are
constants at the top of the script.

## One folder per franchisee

Everything a franchisee owns lives in `/locations/<slug>/`:

- `/locations/cora` — its center page (`index`), built from sections.
- `/locations/cora/<page>` — pages it adds itself, e.g. a local campaign page.
  A page here also *replaces* the shared subpage of the same name (its own
  `contact-us` instead of the shared one).
- Anything else under `/locations/cora/…` falls back to the shared subpages
  in `/center-pages/` (About Us, Solutions, Events, Contact Us).

go.sandler.com-style URLs (`/cora`, `/cora/about-us`) redirect there, keeping
the language prefix.

## The template for new franchisee pages

`/_franchisee-skeleton/index` (page title `{{franchisee}} | Sandler`) is the
template. When a franchisee in the CSV has no center page yet, the script
copies it into `/locations/<slug>/`: the same sections in the same places, the
same page template, and `{{franchisee}}` replaced with the franchisee's name
in every text field (rich text included). Images are re-uploaded, so each
copy has its own.

- **To change what new franchisees start with**, edit that page in dotCMS
  (add, remove, reorder or rewrite sections). No code change; existing
  franchisee pages aren't touched.
- It's HQ-only in the back office, and hidden on the public site
  (`/_…` paths return 404 unless the Universal Visual Editor loads them).
- In the editor its center hero shows sample details, since the template has
  no center of its own.
- `SKELETON_PAGES` in the script only creates the template if it's missing.

## Design notes

- **Users are never assigned to parent roles** (`HQ`, `Franchisees`, `<slug>`,
  `Tiers`). In dotCMS a user holding a parent role holds every child role.
  The shared "All franchisees" and "All franchisee editors" roles exist for
  that reason. The workflow's Save / Submit actions name "All franchisee
  editors", and folder permissions decide *which* content each editor can save.
- **Role "edit permissions" flag.** `canEditPermissions` must be true on every
  role, or dotCMS refuses to grant it any permission. It means "this role's
  permissions are editable", not "its users can edit permissions".
- **Tiers are per user, not per franchisee.** A contractor who is an editor
  for an Advanced franchisee has Advanced components everywhere they can edit.
- **Public pages.** Franchisee folders keep CMS Anonymous read access, so
  their live pages stay public. Other franchisees can read those live pages
  like any visitor can, but not drafts, edit mode or the back office (tested).
- **Tool group.** dotCMS has no API to create a tool group. Create
  **Franchisee Workspace** once (Settings → Roles & Tools → Tools → Create
  Tool Group) and re-run. The script then adds Browser, Pages, Content and
  Workflow to it and assigns it to all franchisee users.

## Verified on awesomedemo-dev (trainning-service.com)

Signed in as the test users through the API:

(Tested with the folders at `/cora/` before they moved to `/locations/cora/`;
the permissions are the same.)

- Heather (Cora editor): can view and edit Cora's folder, gets
  Save → Submit for Review, and then has no actions while the change is in
  review. A direct publish is refused with 403. Ruby Group content in edit
  mode is refused with 403.
- Pat (Cora viewer, Ruby Group editor): can't lock or
  edit Cora content.
- HQ sees Publish and Reject on content that is in review.
