# publishing-demo

Build, verify and tear down the **publishing-demo** site on awesomedemo-dev
(Elsevier Academic & Government messaging-governance demo; fictional content).
The frontend is `../frontend-publishing` (port 3010).

| File | Purpose |
|---|---|
| `PLAN.md` | What was built and why, with the endpoints used |
| `DEMO-SCRIPT.md` | 45-minute click-by-click run-through, plus the pre-demo checklist |
| `VERIFY-REPORT.md` | Output of `setup/verify.mjs`, plus known issues |
| `setup/run-all.mjs` | Idempotent build (steps 01–09); `--dry-run` supported |
| `setup/verify.mjs` | Checks every role, walks the workflow, checks the UVE save path |
| `setup/reset-demo.mjs` | Puts the demo back to its starting state after a rehearsal |
| `setup/teardown.mjs` | Removes only what the build created (`--dry-run`, then `--yes`) |
| `channels/fetch.sh` | One approved message → web JSON, newsletter HTML, Sprinklr hand-off, article PDF |

Secrets live in `.env.local` (gitignored): `DEMO_USER_PASSWORD` and the
frontend's read-only `DOTCMS_READ_TOKEN`. The admin token comes from
`DOTCMS_TOKEN`, or else `frontend-vodafone/.env.local`. Never print either.

`setup/state/created.json` is the ledger of ids this build created. Teardown
reads only that, so keep it.
