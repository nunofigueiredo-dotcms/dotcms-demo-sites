// Shared helpers for the publishing-demo setup scripts.
//
// Environment:
//   DOTCMS_URL          default https://awesomedemo-dev.dotcms.dev
//   DOTCMS_TOKEN        admin API token. If unset, the token in
//                       frontend-vodafone/.env.local is used (same instance).
//   DEMO_USER_PASSWORD  password for the five demo users. If unset, it is read
//                       from publishing-demo/.env.local, or generated there once.
//
// Every script accepts --dry-run: reads still happen, writes are only logged.
// Nothing here prints a token or a password.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEMO_DIR = join(HERE, "..", "..");
export const REPO_DIR = join(DEMO_DIR, "..");
const STATE_FILE = join(DEMO_DIR, "setup", "state", "created.json");
const DEMO_ENV = join(DEMO_DIR, ".env.local");

export const DRY = process.argv.includes("--dry-run");
export const URL_BASE = (process.env.DOTCMS_URL || "https://awesomedemo-dev.dotcms.dev").replace(/\/$/, "");
export const SITE_NAME = "publishing-demo";

function readEnvFile(file, key) {
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8").split("\n").find((l) => l.startsWith(`${key}=`));
  return line?.slice(key.length + 1).trim().replace(/^["']|["']$/g, "") || undefined;
}

export const TOKEN =
  process.env.DOTCMS_TOKEN ||
  readEnvFile(join(REPO_DIR, "frontend-vodafone", ".env.local"), "NEXT_PUBLIC_DOTCMS_AUTH_TOKEN");
if (!TOKEN) {
  console.error("No DOTCMS_TOKEN and no token in frontend-vodafone/.env.local");
  process.exit(1);
}

/** The demo users' password: env, then publishing-demo/.env.local, else generated once. */
export function demoPassword() {
  let pw = process.env.DEMO_USER_PASSWORD || readEnvFile(DEMO_ENV, "DEMO_USER_PASSWORD");
  if (pw) return pw;
  pw = `Pd-${randomBytes(9).toString("base64url")}-26`;
  if (DRY) return pw;
  const prev = existsSync(DEMO_ENV) ? readFileSync(DEMO_ENV, "utf8") : "";
  writeFileSync(DEMO_ENV, `${prev}${prev && !prev.endsWith("\n") ? "\n" : ""}DEMO_USER_PASSWORD=${pw}\n`);
  log(`  generated DEMO_USER_PASSWORD into publishing-demo/.env.local (gitignored)`);
  return pw;
}

/** Store a value in publishing-demo/.env.local (gitignored), replacing an old one. */
export function saveLocalEnv(key, value) {
  if (DRY) return;
  const lines = existsSync(DEMO_ENV) ? readFileSync(DEMO_ENV, "utf8").split("\n").filter(Boolean) : [];
  const kept = lines.filter((l) => !l.startsWith(`${key}=`));
  writeFileSync(DEMO_ENV, [...kept, `${key}=${value}`].join("\n") + "\n");
}
export const localEnv = (key) => process.env[key] || readEnvFile(DEMO_ENV, key);

export function log(...a) {
  console.log(...a);
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

const READ_POSTS = [
  /^\/api\/v1\/site\/_byname/,
  /^\/api\/v1\/content\/_search/,
  /^\/api\/content\/_search/,
  /^\/api\/v1\/workflow\/tasks$/,
  /^\/api\/v1\/contenttype\/_filter/,
  /^\/api\/v1\/page\/_check-permission/,
];

/**
 * Call the dotCMS REST API. Returns parsed JSON (or {_raw, _status}).
 * In --dry-run, writes are logged and return {dry: true}.
 * Retries while awesomedemo-dev restarts (empty body / 502 / 503).
 */
export async function api(method, path, body, { token = TOKEN, headers = {}, raw = false, quiet = false } = {}) {
  const isWrite = method !== "GET" && !READ_POSTS.some((r) => r.test(path));
  if (DRY && isWrite) {
    if (!quiet) log(`    [dry-run] ${method} ${path}`);
    return { dry: true, entity: null };
  }
  if (path.includes("dry-")) return { entity: null, errors: ["placeholder id in dry run"] };
  const init = {
    method,
    headers: { Authorization: `Bearer ${token}`, ...headers },
  };
  if (body !== undefined) {
    if (body instanceof FormData) init.body = body;
    else {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
  }
  for (let attempt = 1; ; attempt++) {
    let res, text;
    try {
      res = await fetch(URL_BASE + path, init);
      text = await res.text();
    } catch (e) {
      res = { status: 0 };
      text = "";
      if (attempt > 10) throw e;
    }
    const restarting = res.status === 502 || res.status === 503 || res.status === 0 || (res.status >= 500 && !text);
    if (restarting && attempt <= 10) {
      log(`    … dotCMS unavailable (${res.status}) on ${method} ${path.slice(0, 60)}, retry ${attempt}`);
      await new Promise((r) => setTimeout(r, 15000));
      continue;
    }
    if (raw) return { _status: res.status, _raw: text, headers: res.headers };
    try {
      const json = JSON.parse(text);
      if (json && typeof json === "object" && !Array.isArray(json)) json._status = res.status;
      return json;
    } catch {
      return { _status: res.status, _raw: text.slice(0, 600) };
    }
  }
}

export const failed = (r) =>
  !r || r.dry ? false : (r._status && r._status >= 400) || (Array.isArray(r.errors) && r.errors.length > 0);

/** The entity of a response, or exit with the error. In dry run returns a placeholder. */
export function must(r, what, placeholder = {}) {
  if (r?.dry) return { ...placeholder, id: `dry-${what}`, identifier: `dry-${what}`, inode: `dry-${what}` };
  if (failed(r) || r?.entity === undefined || r?.entity === null) {
    console.error(`  ! ${what} failed: ${JSON.stringify(r).slice(0, 700)}`);
    process.exit(1);
  }
  return r.entity;
}

// ---------------------------------------------------------------------------
// Ledger of what this build created (teardown removes only these)
// ---------------------------------------------------------------------------

export function loadState() {
  if (!existsSync(STATE_FILE)) return { created: [] };
  return JSON.parse(readFileSync(STATE_FILE, "utf8"));
}

export function record(kind, key, id, extra = {}) {
  if (DRY || !id || String(id).startsWith("dry-")) return;
  const state = loadState();
  if (!state.created.some((c) => c.kind === kind && c.id === id)) {
    state.created.push({ kind, key, id, at: new Date().toISOString(), ...extra });
    mkdirSync(dirname(STATE_FILE), { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
  }
}

export function forget(kind, id) {
  if (DRY) return;
  const state = loadState();
  state.created = state.created.filter((c) => !(c.kind === kind && c.id === id));
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
}

export const created = (kind) => loadState().created.filter((c) => c.kind === kind);

// ---------------------------------------------------------------------------
// Common lookups
// ---------------------------------------------------------------------------

/** The site, including when it is archived (the site list leaves archived sites out). */
export async function getSite() {
  const r = await api("POST", "/api/v1/site/_byname", { siteName: SITE_NAME });
  const e = r?.entity;
  if (!e || !(e.identifier)) return null;
  return { ...e, hostname: e.siteName || e.hostname };
}

export async function siteId() {
  const s = await getSite();
  if (s) return s.identifier;
  if (DRY) return "dry-site";
  console.error(`  ! site ${SITE_NAME} not found: run 02-site first`);
  process.exit(1);
}

/** Every role, flattened (role search skips top-level roles). */
export async function allRoles() {
  const out = [];
  const walk = (x) => {
    if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === "object") {
      if ("roleKey" in x) out.push(x);
      Object.values(x).forEach(walk);
    }
  };
  walk((await api("GET", "/api/v1/roles")).entity);
  return out;
}

export async function allUsers() {
  const r = await api("GET", "/api/v1/users/filter?per_page=1000");
  return r.entity || [];
}

/** Fire a workflow action by its id (as `token`'s user). */
export function fireAction(actionId, contentlet, { comments, assign, token } = {}) {
  const body = { contentlet };
  if (comments !== undefined) body.comments = comments;
  if (assign) body.assign = assign;
  return api("PUT", `/api/v1/workflow/actions/${actionId}/fire?indexPolicy=WAIT_FOR`, body, { token });
}

/** Fire a system action (NEW, EDIT, PUBLISH, ...) mapped on the type's workflow. */
export function fireSystem(systemAction, contentlet, { comments, token } = {}) {
  const body = { contentlet };
  if (comments) body.comments = comments;
  return api("PUT", `/api/v1/workflow/actions/default/fire/${systemAction}?indexPolicy=WAIT_FOR`, body, { token });
}

export async function search(query, { limit = 500, token, depth = 0 } = {}) {
  const r = await api("POST", "/api/content/_search", { query, limit, depth }, { token });
  return r?.entity?.jsonObjectView?.contentlets || [];
}

// ---------------------------------------------------------------------------
// Block editor (StoryBlock) JSON — passed to the API as a JSON string
// ---------------------------------------------------------------------------

const text = (t) => {
  // **bold** spans become bold marks
  const parts = String(t).split(/(\*\*[^*]+\*\*)/).filter(Boolean);
  return parts.map((p) =>
    p.startsWith("**") ? { type: "text", text: p.slice(2, -2), marks: [{ type: "bold" }] } : { type: "text", text: p },
  );
};
export const sb = {
  h: (level, t) => ({ type: "heading", attrs: { level, textAlign: "left" }, content: text(t) }),
  p: (t) => ({ type: "paragraph", attrs: { textAlign: "left" }, content: text(t) }),
  ul: (items) => ({
    type: "bulletList",
    content: items.map((i) => ({ type: "listItem", content: [{ type: "paragraph", content: text(i) }] })),
  }),
  quote: (t) => ({ type: "blockquote", content: [{ type: "paragraph", content: text(t) }] }),
  doc: (nodes) => JSON.stringify({ type: "doc", content: nodes }),
};

export async function step(name, fn) {
  log(`\n== ${name}${DRY ? " (dry run)" : ""}`);
  await fn();
}
