// Remove everything this build created, and nothing else.
//
//   node teardown.mjs --dry-run     show what would be removed
//   node teardown.mjs --yes         remove it
//
// Only ids recorded in setup/state/created.json are touched, and each one is
// checked against the name this build gives it before it is deleted (a site
// called publishing-demo, types starting with Pd, roles starting with pd, ...).
// Content and pages go with their content types and the site.
import { api, created, forget, log, search, fireAction, DRY, SITE_NAME, failed } from "./lib/api.mjs";

const TYPES = ["PdNewsletterIssue", "PdAssetPack", "PdArticle", "PdLocalisedMessage", "PdMessagingSot"];

if (!DRY && !process.argv.includes("--yes")) {
  console.error("Refusing to delete without --yes. Run with --dry-run first to see what would go.");
  process.exit(1);
}

const did = (r) => (r?.dry ? "would remove" : failed(r) ? `FAILED ${JSON.stringify(r).slice(0, 200)}` : "removed");

async function section(title, kind, fn, order) {
  const items = created(kind).sort((a, b) => (order ? order.indexOf(a.key) - order.indexOf(b.key) : 0));
  if (!items.length) return;
  log(`\n== ${title}${DRY ? " (dry run)" : ""}`);
  for (const item of items) {
    const result = await fn(item);
    log(`  ${item.key}: ${result}`);
    if (result === "removed" || result === "already gone") forget(kind, item.id);
  }
}

// 1. API tokens
await section("API tokens", "apitoken", async (t) => did(await api("PUT", `/api/v1/apitoken/${t.id}/revoke`)));

// 2. UVE configuration for the site
await section("UVE configuration", "uve", async (u) => did(await api("DELETE", `/api/v1/apps/dotema-config-v2/${u.id}`)));

// 3a. Content first: every item of the demo's types on the site, in every language,
// through the workflow's "Remove (admin)" action (unpublish, archive, delete).
// Deleting types that still hold content can stall dotCMS's background clean-up.
{
  const site = created("site")[0]?.id;
  const scheme = ((await api("GET", "/api/v1/workflow/schemes")).entity || []).find((x) => x.name === "Governed Content");
  const remove = scheme && ((await api("GET", `/api/v1/workflow/schemes/${scheme.id}/actions`)).entity || []).find((a) => a.name === "Remove (admin)");
  if (site && remove) {
    const items = await search(`+(${TYPES.map((t) => `contentType:${t}`).join(" ")}) +conHost:${site}`, { limit: 1000 });
    if (items.length) log(`\n== Content${DRY ? " (dry run)" : ""}\n  ${items.length} item version(s) on the site`);
    const seen = new Set();
    for (const c of items) {
      const k = `${c.identifier}:${c.languageId}`;
      if (seen.has(k)) continue;
      seen.add(k);
      await fireAction(remove.id, { identifier: c.identifier, languageId: c.languageId });
    }
  }
}

// 3. Content types (now empty), referencing types first, one at a time
const TYPE_ORDER = TYPES;
await section("Content types", "contenttype", async (t) => {
  if (!t.key.startsWith("Pd")) return "skipped (not ours)";
  const found = (await api("GET", `/api/v1/contenttype/id/${t.id}`)).entity;
  if (!found) return "already gone";
  if (found.variable !== t.key) return `skipped (variable is ${found.variable})`;
  const r = await api("DELETE", `/api/v1/contenttype/id/${t.id}`);
  // Wait for this one to be gone before the next.
  for (let i = 0; !DRY && i < 24 && (await api("GET", `/api/v1/contenttype/id/${t.key}`)).entity?.id; i++) {
    await new Promise((res) => setTimeout(res, 5000));
  }
  return did(r);
}, TYPE_ORDER);

// Content types are deleted in the background; the site can't go until they have.
if (!DRY) {
  for (let i = 0; i < 40; i++) {
    const left = [];
    for (const v of ["PdMessagingSot", "PdLocalisedMessage", "PdArticle", "PdNewsletterIssue", "PdAssetPack"]) {
      if ((await api("GET", `/api/v1/contenttype/id/${v}`)).entity?.id) left.push(v);
    }
    if (!left.length) break;
    log(`  … waiting for ${left.join(", ")} to finish deleting`);
    // A background delete sometimes stalls; asking again finishes it.
    if (i % 6 === 5) for (const v of left) await api("DELETE", `/api/v1/contenttype/id/${v}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
}

// 4. Workflow scheme: archive, then delete
await section("Workflow", "workflow", async (w) => {
  const found = ((await api("GET", "/api/v1/workflow/schemes")).entity || []).find((s) => s.id === w.id);
  if (!found) return "already gone";
  if (found.name !== w.key) return `skipped (name is ${found.name})`;
  await api("PUT", `/api/v1/workflow/schemes/${w.id}`, { schemeName: found.name, schemeDescription: found.description, schemeArchived: true });
  return did(await api("DELETE", `/api/v1/workflow/schemes/${w.id}`));
});

// 5. The site (pages, template, folders and any remaining content): unpublish, archive, delete
await section("Site", "site", async (s) => {
  const found = (await api("GET", `/api/v1/site/${s.id}`)).entity;
  if (!found) return "already gone";
  const name = found.siteName || found.hostname;
  if (name !== SITE_NAME) return `skipped (site is ${name})`;
  await api("PUT", `/api/v1/site/${s.id}/_unpublish`);
  await api("PUT", `/api/v1/site/${s.id}/_archive`);
  // Retry for a while: dotCMS releases the site's last references in the background.
  let r;
  for (let i = 0; i < 12; i++) {
    r = await api("DELETE", `/api/v1/site/${s.id}`);
    if (DRY || !failed(r)) break;
    await new Promise((res) => setTimeout(res, 10000));
  }
  return did(r);
});
// Pages, templates and content were on the site; drop them from the ledger.
for (const kind of ["page", "template", "content", "category-perm"]) for (const i of created(kind)) forget(kind, i.id);

// 6. Users (their history is reassigned to the user running teardown)
const me = DRY ? null : await api("GET", "/api/v1/users/current");
await section("Users", "user", async (u) => {
  if (!u.key.endsWith("@publishing-demo.example")) return "skipped (not ours)";
  const found = await api("GET", `/api/v1/users/${u.id}`);
  if (found._status === 404) return "already gone";
  return did(await api("DELETE", `/api/v1/users/${u.id}?replacementUserId=${me?.userId || "dry"}`));
});

// 7. Roles: children first, then the parent
const roles = created("role").sort((a, b) => (a.key === "pdRoot") - (b.key === "pdRoot"));
if (roles.length) log(`\n== Roles${DRY ? " (dry run)" : ""}`);
for (const r of roles) {
  if (!r.key.startsWith("pd")) { log(`  ${r.key}: skipped (not ours)`); continue; }
  const res = await api("DELETE", `/api/v1/roles/${r.id}`);
  const out = res._status === 404 ? "already gone" : did(res);
  log(`  ${r.key}: ${out}`);
  if (out === "removed" || out === "already gone") forget("role", r.id);
}

// 8. Categories: children first, then the parent
const cats = created("category").sort((a, b) => (a.key === "pdTopics") - (b.key === "pdTopics"));
if (cats.length) {
  log(`\n== Categories${DRY ? " (dry run)" : ""}`);
  const ours = cats.filter((c) => c.key.startsWith("pd"));
  const children = ours.filter((c) => c.key !== "pdTopics").map((c) => c.id);
  const parent = ours.filter((c) => c.key === "pdTopics").map((c) => c.id);
  for (const batch of [children, parent]) {
    if (!batch.length) continue;
    const r = await api("DELETE", "/api/v1/categories", batch);
    log(`  ${batch.length} categor${batch.length === 1 ? "y" : "ies"}: ${did(r)}`);
    if (!failed(r)) for (const id of batch) forget("category", id);
  }
}

// 9. German, only if this build added it
await section("Language", "language", async (l) => {
  const langs = (await api("GET", "/api/v2/languages")).entity || [];
  const found = langs.find((x) => x.id === l.id);
  if (!found) return "already gone";
  if (found.isoCode !== "de-de") return `skipped (${found.isoCode})`;
  return did(await api("DELETE", `/api/v2/languages/${l.id}`));
});

log(`\nDone.${DRY ? " Nothing was changed." : ""}`);
