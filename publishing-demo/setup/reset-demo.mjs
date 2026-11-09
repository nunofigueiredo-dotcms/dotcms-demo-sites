// Put the demo back to its starting state after a rehearsal, without touching
// users, tokens or the frontend:
//   - the article's H3 goes back to "How your Organisation can prepare" (through
//     the workflow, as Hannah and Eleanor), published;
//   - the three localised messages are recreated in their starting states
//     (DACH in SME Review, Iberia Approved, APAC sent back);
//   - any other localised message created during the demo is removed.
//
//   node reset-demo.mjs [--dry-run]
import { api, siteId, search, fireAction, allUsers, forget, loadState, log, step, DRY } from "./lib/api.mjs";
import { USERS } from "./04-roles-users.mjs";
import { SCHEME } from "./05-workflow.mjs";
import { ARTICLES, LOCALISED } from "./content/seed-content.mjs";
import { run as seed } from "./08-seed.mjs";

const site = await siteId();
const scheme = (await api("GET", "/api/v1/workflow/schemes")).entity.find((s) => s.name === SCHEME);
const actions = Object.fromEntries((await api("GET", `/api/v1/workflow/schemes/${scheme.id}/actions`)).entity.map((a) => [a.name, a.id]));
const users = await allUsers();
const tokens = {};
const tokenIds = [];
for (const role of ["marketer", "owner"]) {
  const userId = users.find((u) => u.emailAddress === USERS.find((x) => x.role === role).email).userId;
  if (DRY) continue;
  const e = (await api("POST", "/api/v1/apitoken", { userId, expirationSeconds: 1800, network: "0.0.0.0/0", claims: { label: "publishing-demo reset" } })).entity;
  tokens[role] = e.jwt;
  tokenIds.push(e.token.id);
}

try {
  await step("Article H3", async () => {
    const seedArticle = ARTICLES.find((a) => a.body.some((n) => JSON.stringify(n).includes("Organisation")));
    const [working] = await search(`+contentType:PdArticle +PdArticle.urlTitle:${seedArticle.urlTitle} +working:true`, { limit: 1 });
    const [live] = await search(`+contentType:PdArticle +PdArticle.urlTitle:${seedArticle.urlTitle} +live:true`, { limit: 1 });
    const ok = (c) => c && JSON.stringify(c.body).includes("How your Organisation can prepare");
    const status = (await api("GET", `/api/v1/workflow/status/${working.inode}`)).entity?.step?.name;
    if (ok(working) && ok(live) && status === "Published to Web") return log("  already in its starting state");
    const body = JSON.stringify({ type: "doc", content: seedArticle.body });
    const steps = [["marketer", "Save Draft"], ["marketer", "Submit for Approval"], ["owner", "Approve"], ["owner", "Publish to Web"]];
    for (const [who, name] of steps) {
      const fields = name === "Save Draft" ? { identifier: working.identifier, body, h1: seedArticle.h1, standfirst: seedArticle.standfirst } : { identifier: working.identifier };
      const r = await fireAction(actions[name], fields, { token: tokens[who], comments: name === "Save Draft" ? undefined : "Reset for the demo" });
      if (!r.dry && r._status >= 400) throw new Error(`${name}: ${r.message}`);
    }
    log("  restored and published");
  });

  await step("Localised messages", async () => {
    const all = await search(`+contentType:PdLocalisedMessage +conHost:${site} +working:true +deleted:false`);
    const seen = new Set();
    for (const m of all) {
      const k = `${m.identifier}:${m.languageId}`;
      if (seen.has(k)) continue;
      seen.add(k);
      // The newsletter links to the Iberia message: keep it while it's still in
      // its starting state, so the link survives.
      const step = (await api("GET", `/api/v1/workflow/status/${m.inode}`)).entity?.step?.name;
      if (m.title.startsWith("Iberia") && step === "Approved") {
        log(`  kept "${m.title}" (still Approved)`);
        continue;
      }
      await fireAction(actions["Remove (admin)"], { identifier: m.identifier, languageId: m.languageId });
      for (const c of loadState().created.filter((c) => c.id === m.identifier)) forget(c.kind, c.id);
      log(`  removed "${m.title}"${LOCALISED.some((l) => l.title === m.title) ? "" : " (created during the demo)"}`);
    }
  });
} finally {
  for (const id of tokenIds) await api("PUT", `/api/v1/apitoken/${id}/revoke`);
}

// Re-creates the missing localised messages and walks them to their starting states.
await seed();

// If the Iberia message was recreated, link the newsletter to it again and walk the
// newsletter back to Ready for External Channel.
await step("Newsletter link", async () => {
  const [issue] = await search(`+contentType:PdNewsletterIssue +conHost:${site} +working:true`, { limit: 1 });
  const iberia = (await search(`+contentType:PdLocalisedMessage +conHost:${site} +working:true`)).find((m) => m.title.startsWith("Iberia"));
  const full = (await api("GET", `/api/v1/content/${issue.inode}?depth=1`)).entity;
  const linked = [full.messages].flat().filter(Boolean).map((m) => m.identifier);
  if (linked.includes(iberia.identifier)) return log("  newsletter already links to the Iberia message");
  const fresh = {};
  for (const role of ["marketer", "owner"]) {
    const userId = users.find((u) => u.emailAddress === USERS.find((x) => x.role === role).email).userId;
    if (DRY) continue;
    const e = (await api("POST", "/api/v1/apitoken", { userId, expirationSeconds: 900, network: "0.0.0.0/0", claims: { label: "publishing-demo reset" } })).entity;
    fresh[role] = e;
  }
  try {
    const walk = [["marketer", "Save Draft"], ["marketer", "Submit for Approval"], ["owner", "Approve"], ["owner", "Ready for External Channel"]];
    for (const [who, name] of walk) {
      const fields = name === "Save Draft" ? { identifier: issue.identifier, messages: iberia.identifier } : { identifier: issue.identifier };
      const r = await fireAction(actions[name], fields, { token: fresh[who]?.jwt, comments: name === "Save Draft" ? undefined : "Reset for the demo" });
      if (!r.dry && r._status >= 400) throw new Error(`${name}: ${r.message}`);
    }
    log("  newsletter re-linked and back at Ready for External Channel");
  } finally {
    for (const t of Object.values(fresh)) await api("PUT", `/api/v1/apitoken/${t.token.id}/revoke`);
  }
});
log("\nDemo reset.");
