// Verify the demo as each role, walk one Localised Message through the whole
// workflow, and check the save path the Universal Visual Editor uses.
// Writes publishing-demo/VERIFY-REPORT.md. Test items are removed afterwards;
// the seeded demo content is not touched.
//
//   node verify.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  api, siteId, search, fireAction, allUsers, allRoles, demoPassword, localEnv, URL_BASE, DEMO_DIR, sb,
} from "./lib/api.mjs";
import { USERS, ROLES } from "./04-roles-users.mjs";
import { SCHEME, SPRINKLR_NOTE } from "./05-workflow.mjs";

const lines = [];
const out = (s = "") => { lines.push(s); console.log(s); };
const results = [];
const findings = [];
const check = (area, what, ok, detail = "") => {
  results.push({ area, what, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${what}${detail ? ` (${detail})` : ""}`);
};

const site = await siteId();
const scheme = (await api("GET", "/api/v1/workflow/schemes")).entity.find((s) => s.name === SCHEME);
const actions = Object.fromEntries((await api("GET", `/api/v1/workflow/schemes/${scheme.id}/actions`)).entity.map((a) => [a.name, a.id]));
const users = await allUsers();
const roleIdOf = Object.fromEntries((await allRoles()).filter((r) => String(r.roleKey).startsWith("pd")).map((r) => [r.roleKey, r.id]));
const password = demoPassword();

// Short-lived tokens for the back-end demo users (Hub Reader is checked with
// the hub service account, which has the same role, and with a session).
const tokens = {};
const tokenIds = [];
for (const u of USERS.filter((x) => x.role !== "reader")) {
  const userId = users.find((x) => x.emailAddress === u.email).userId;
  const e = (await api("POST", "/api/v1/apitoken", { userId, expirationSeconds: 3600, network: "0.0.0.0/0", claims: { label: "publishing-demo verify" } })).entity;
  tokens[u.role] = e.jwt;
  tokenIds.push(e.token.id);
}
tokens.reader = localEnv("DOTCMS_READ_TOKEN");
const as = (role) => ({ token: tokens[role] });
const stepOf = async (identifier, languageId = 1) => {
  const c = (await search(`+identifier:${identifier} +languageId:${languageId} +working:true`, { limit: 1 }))[0];
  return c ? (await api("GET", `/api/v1/workflow/status/${c.inode}`)).entity?.step?.name : undefined;
};
const itemFor = async (title) => (await search(`+conHost:${site} +working:true +deleted:false`, { limit: 200 })).find((c) => c.title.startsWith(title));
const removeIds = [];

try {
  // -------------------------------------------------------------------------
  out("## 1. Each role: what it can see and do\n");
  const seeded = {
    draft: await itemFor("APAC:"), sme: await itemFor("DACH:"), approved: await itemFor("Iberia:"),
    published: await itemFor("Open access: equitable"),
  };
  const roleRows = [];
  for (const u of USERS) {
    const role = u.role;
    console.log(`\n${ROLES[role].roleName} (${u.email})`);
    // Backend login and tools
    const login = await fetch(`${URL_BASE}/api/v1/authentication`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u.email, password }),
    });
    const cookie = login.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    const menuRes = await fetch(`${URL_BASE}/api/v1/menu`, { headers: { Cookie: cookie } });
    const tools = menuRes.ok ? ((await menuRes.json()).entity || []).map((l) => l.tabName || l.name) : [];
    check(role, `${u.firstName} can sign in`, login.ok);
    check(role, "backend tools", role === "reader" ? tools.length === 0 : ["Site", "Content", "Digital Assets"].every((t) => tools.includes(t)), tools.join(", ") || "none (hub only)");

    // Read
    const visible = await search(`+(contentType:PdMessagingSot contentType:PdLocalisedMessage contentType:PdArticle) +conHost:${site} +working:true`, { ...as(role), limit: 200 });
    check(role, "reads governed content", visible.length >= 11, `${visible.length} items`);

    // Create (Save Draft)
    const created = await fireAction(actions["Save Draft"], {
      contentType: "PdLocalisedMessage", site, languageId: 1, title: `zz verify create (${role})`, region: "uk-ireland",
      targetChannel: "web", smeNeeded: "no", body: sb.doc([sb.p("verify")]), parentSot: seeded.published.identifier,
    }, as(role));
    const canCreate = !!created.entity?.identifier;
    if (canCreate) removeIds.push(created.entity.identifier);
    const shouldCreate = ["marketer", "regional", "owner"].includes(role);
    check(role, shouldCreate ? "can create a localised message" : "cannot create content", canCreate === shouldCreate,
      canCreate ? "created" : String(created.message || created.errors?.[0]?.message || created._status).slice(0, 80));

    // Workflow actions offered on items in each step
    const offered = {};
    for (const [k, c] of Object.entries(seeded)) {
      const r = await api("GET", `/api/v1/workflow/contentlet/${c.inode}/actions`, undefined, as(role));
      offered[k] = (r.entity || []).map((a) => a.name).filter((n) => n !== "Remove (admin)");
    }
    // Publishing a draft directly, outside the workflow, through the generic
    // PUBLISH endpoint. Always on a throwaway draft, never on seeded content.
    const probe = await fireAction(actions["Save Draft"], {
      contentType: "PdLocalisedMessage", site, languageId: 1, title: `zz verify publish probe (${role})`, region: "uk-ireland",
      targetChannel: "web", smeNeeded: "no", body: sb.doc([sb.p("verify")]), parentSot: seeded.published.identifier,
    });
    removeIds.push(probe.entity.identifier);
    const pub = await api("PUT", `/api/v1/workflow/actions/default/fire/PUBLISH?indexPolicy=WAIT_FOR`, { contentlet: { identifier: probe.entity.identifier } }, as(role));
    const published = (await search(`+identifier:${probe.entity.identifier} +live:true`, { limit: 1 })).length > 0;
    if (role === "owner") {
      // Finding, not a failure: the final approver holds Publish permission (the
      // "Publish to Web" step publishes as her), and the generic PUBLISH call uses it.
      findings.push(`Messaging Owner can publish a draft directly with the generic \`fire/PUBLISH\` API call (${published ? "it went live" : "refused"}). The workflow history then shows only “Save Draft”; the publish is in the item's version history.`);
      console.log(`  NOTE  Messaging Owner direct publish via API: ${published ? "allowed" : "refused"}`);
    } else {
      check(role, "cannot publish a draft outside the workflow", !published, String(pub.message || pub._status).slice(0, 90));
    }
    roleRows.push({ role: ROLES[role].roleName, user: `${u.firstName} ${u.lastName}`, tools: tools.join(", ") || "none (Messaging Hub only)", read: visible.length, create: canCreate ? "yes" : "no", offered });
  }
  out("| Role | User | Backend tools | Items readable | Can create | Actions on Draft (sent back) | on SME Review | on Approved | on Published |");
  out("|---|---|---|---|---|---|---|---|---|");
  for (const r of roleRows) {
    const f = (k) => r.offered[k].join(", ") || "none";
    out(`| ${r.role} | ${r.user} | ${r.tools} | ${r.read} | ${r.create} | ${f("draft")} | ${f("sme")} | ${f("approved")} | ${f("published")} |`);
  }

  // -------------------------------------------------------------------------
  out("\n## 2. One Localised Message through the whole workflow\n");
  console.log("");
  const walk = [];
  const fire = async (who, name, identifier, comments, expectOk, label) => {
    const r = await fireAction(actions[name], { identifier, languageId: 1 }, { ...as(who), comments });
    const ok = r._status < 300;
    const step = await stepOf(identifier);
    const msg = ok ? "" : String(r.message || r.errors?.[0]?.message || r._status).replace(/^Error: /, "").slice(0, 120);
    check("walkthrough", label || `${ROLES[who].roleName}: ${name}`, ok === expectOk, ok ? `now ${step}` : msg);
    walk.push(`| ${ROLES[who].roleName} | ${name}${comments !== undefined ? ` (comment: ${comments ? `“${comments}”` : "empty"})` : ""} | ${ok ? "done" : `refused: ${msg}`} | ${step} |`);
    return ok;
  };
  const c = await fireAction(actions["Save Draft"], {
    contentType: "PdLocalisedMessage", site, languageId: 1, title: "zz verify walkthrough: UK & Ireland open access post",
    region: "uk-ireland", targetChannel: "organic-social", smeNeeded: "yes",
    body: sb.doc([sb.p("Open access is about equity on both sides. Institutional agreements make it the default for authors.")]),
    parentSot: seeded.published.identifier,
  }, as("regional"));
  const id = c.entity.identifier;
  removeIds.push(id);
  walk.push(`| Regional Marketer | Save Draft (new item, SME needed, Organic social) | done | ${await stepOf(id)} |`);
  await fire("regional", "Submit for Approval", id, "", false, "SME-needed item can't skip SME review");
  await fire("regional", "Submit for SME Review", id, "Ready for SME check", true);
  await fire("sme", "Reject", id, "", false, "Reject without a comment is refused");
  await fire("sme", "Reject", id, "Say “agreements”, not “deals”, in line 2.", true, "Reject with a comment returns it to Draft");
  await fire("marketer", "Approve", id, "", false, "Content Marketer can't approve");
  await fire("regional", "Submit for SME Review", id, "Fixed wording", true, "Resubmitted");
  await fire("sme", "SME Approve", id, "Claims check out", true);
  await fire("owner", "Approve", id, "Approved", true);
  await fire("owner", "Publish to Web", id, undefined, false, "Social item can't be published to the web");
  await fire("owner", "Ready for External Channel", id, "Scheduled in Sprinklr", true);
  out("| Who | Action | Result | Step after |");
  out("|---|---|---|---|");
  walk.forEach((w) => out(w));
  const history = (await api("GET", `/api/v1/workflow/tasks/history/comments/${id}`)).entity || [];
  check("walkthrough", "Sprinklr note recorded in the history", history.some((h) => h.commentDescription?.includes("Sprinklr") && h.commentDescription.includes("dotCMS holds")));
  const live = (await search(`+identifier:${id} +live:true`, { limit: 1 })).length === 1;
  check("walkthrough", "approved item is live in the content API (for the hand-off)", live);
  out("\nAudit trail (newest first), from `GET /api/v1/workflow/tasks/history/comments/{id}`:\n");
  for (const h of history) out(`- ${h.postedBy}: ${h.commentDescription}`);

  // -------------------------------------------------------------------------
  out("\n## 3. Universal Visual Editor: the H3 fix\n");
  console.log("");
  const real = (await search(`+contentType:PdArticle +PdArticle.urlTitle:open-access-agreements-what-libraries-need +live:true`, { limit: 1 }))[0];
  const bodyText = JSON.stringify(real.body);
  check("uve", "the live article has the H3 “How your Organisation can prepare”", bodyText.includes("How your Organisation can prepare"));
  const page = await api("GET", `/api/v1/page/json/articles/${real.urlTitle}?host_id=${site}&mode=EDIT_MODE&language_id=1`, undefined, { token: tokens.reader });
  check("uve", "the frontend's read-only token loads the page in EDIT_MODE", page.entity?.urlContentMap?.identifier === real.identifier);
  const uve = (await api("GET", `/api/v1/apps/dotema-config-v2/${site}`)).entity?.sites?.[0];
  const uveUrl = JSON.parse(uve?.secrets?.find((s) => s.name === "configuration")?.value || "{}").config?.[0]?.url;
  check("uve", "UVE is configured for the site", !!uveUrl, uveUrl);

  // The save UVE makes for an inline edit, on a throwaway copy of the article
  // (so the real one keeps its "Organisation" for the live demo).
  const copy = await fireAction(actions["Save Draft"], {
    contentType: "PdArticle", site, languageId: 1, title: "zz verify UVE copy", urlTitle: "zz-verify-uve-copy",
    h1: real.h1, standfirst: real.standfirst, body: typeof real.body === "string" ? real.body : JSON.stringify(real.body),
  }, as("marketer"));
  const copyId = copy.entity.identifier;
  removeIds.push(copyId);
  for (const [who, name] of [["marketer", "Submit for Approval"], ["owner", "Approve"], ["owner", "Publish to Web"]]) {
    await fireAction(actions[name], { identifier: copyId }, { ...as(who), comments: "verify" });
  }
  const fixed = (typeof real.body === "string" ? real.body : JSON.stringify(real.body)).replace("How your Organisation can prepare", "How your Organization can prepare");
  const edit = await api("PUT", "/api/v1/workflow/actions/default/fire/EDIT?indexPolicy=WAIT_FOR", { contentlet: { identifier: copyId, body: fixed } }, as("marketer"));
  const working = (await search(`+identifier:${copyId} +working:true`, { limit: 1 }))[0];
  const liveCopy = (await search(`+identifier:${copyId} +live:true`, { limit: 1 }))[0];
  check("uve", "Content Marketer's inline save on a published article works", edit._status < 300, `now ${await stepOf(copyId)}`);
  check("uve", "the fix is in the new draft", JSON.stringify(working.body).includes("Organization"));
  check("uve", "the live page keeps the approved text until the draft is approved", JSON.stringify(liveCopy.body).includes("Organisation"));
  out("| Check | Result |");
  out("|---|---|");
  for (const r of results.filter((x) => x.area === "uve")) out(`| ${r.what} | ${r.ok ? "✅" : "❌"} ${r.detail} |`);
  out("\nNot checked automatically: clicking the H3 inside the editor itself (that needs a person in the browser). See “Still to do by hand”.");
} finally {
  for (const id of removeIds) await fireAction(actions["Remove (admin)"], { identifier: id });
  for (const t of tokenIds) await api("PUT", `/api/v1/apitoken/${t}/revoke`);
}

const failed = results.filter((r) => !r.ok);
const header = [
  "# Verification report",
  "",
  `Run ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC against ${URL_BASE}, site \`publishing-demo\`. Re-run with \`node setup/verify.mjs\`.`,
  "",
  `**${results.length - failed.length} of ${results.length} checks passed.**${failed.length ? ` Failed: ${failed.map((f) => `${f.area}: ${f.what}`).join("; ")}.` : ""}`,
  "",
  ...(findings.length ? ["**Findings** (behaviour to know about, not failures):", "", ...findings.map((f) => `- ${f}`), ""] : []),
  "Test items created by this run were removed afterwards. Actions were fired as each demo user with a one-hour token (revoked at the end), so they behave exactly as in the dotCMS UI.",
  "",
];
const known = readFileSync(join(DEMO_DIR, "setup", "known-issues.md"), "utf8");
writeFileSync(join(DEMO_DIR, "VERIFY-REPORT.md"), [...header, ...lines, "", known].join("\n"));
console.log(`\n${results.length - failed.length}/${results.length} passed → publishing-demo/VERIFY-REPORT.md`);
process.exit(failed.length ? 1 : 0);
