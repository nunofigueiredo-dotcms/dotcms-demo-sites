// A read-only API token for the frontend, issued for the hub service account (Hub
// Reader role), and the
// frontend's .env.local. The frontend reads dotCMS on the server only, so this token
// never reaches the browser. It is valid for 120 days and revoked by teardown.
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  api, must, record, step, log, siteId, allUsers, localEnv, saveLocalEnv, DRY, REPO_DIR, URL_BASE,
} from "./lib/api.mjs";
import { SERVICE_USER } from "./04-roles-users.mjs";
import { FRONTEND } from "./02-site.mjs";

const READER = SERVICE_USER.email;
const FRONTEND_ENV = join(REPO_DIR, "frontend-publishing", ".env.local");

async function tokenStillValid(jwt) {
  if (!jwt) return false;
  const r = await api("GET", "/api/v1/users/current", undefined, { token: jwt });
  return r?.email === READER || r?.emailAddress === READER;
}

export async function run() {
  const site = await siteId();
  let token = localEnv("DOTCMS_READ_TOKEN");
  await step("Hub Reader API token", async () => {
    if (await tokenStillValid(token)) return log("  existing token is valid");
    const old = localEnv("DOTCMS_READ_TOKEN_ID");
    if (old) await api("PUT", `/api/v1/apitoken/${old}/revoke`);
    const userId = (await allUsers()).find((u) => u.emailAddress === READER)?.userId;
    const e = must(
      await api("POST", "/api/v1/apitoken", {
        userId, expirationSeconds: 120 * 24 * 3600, network: "0.0.0.0/0", claims: { label: "publishing-demo frontend (read-only)" },
      }),
      "reader token",
    );
    token = e.jwt;
    record("apitoken", "hub-reader", e.token?.id);
    saveLocalEnv("DOTCMS_READ_TOKEN", token);
    saveLocalEnv("DOTCMS_READ_TOKEN_ID", e.token?.id || "");
    log("  issued for the hub service account (120 days), saved to publishing-demo/.env.local");
  });

  await step("frontend-publishing/.env.local", async () => {
    const values = {
      DOTCMS_URL: URL_BASE,
      DOTCMS_READ_TOKEN: token,
      DOTCMS_SITE_ID: site,
      NEXT_PUBLIC_DOTCMS_HOST: URL_BASE,
      NEXT_PUBLIC_SITE_URL: FRONTEND,
    };
    const body = Object.entries(values).map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
    if (existsSync(FRONTEND_ENV) && readFileSync(FRONTEND_ENV, "utf8") === body) return log("  up to date");
    if (DRY) return log("  [dry-run] would write it");
    if (existsSync(join(REPO_DIR, "frontend-publishing"))) {
      writeFileSync(FRONTEND_ENV, body);
      log("  written (gitignored)");
    } else log("  frontend-publishing/ not created yet; skipped");
  });
  return token;
}

if (import.meta.url === `file://${process.argv[1]}`) await run();
