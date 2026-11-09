// Seed content, created and moved through the workflow AS the demo users, so the
// history shows real names: Hannah writes, Lukas localises, Priya reviews, Eleanor approves.
// Re-running finds items by URL title or title and leaves existing ones (and their
// workflow state) alone.
import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  api, must, record, step, log, siteId, search, fireAction, allUsers, DRY, DEMO_DIR, URL_BASE, TOKEN,
} from "./lib/api.mjs";
import { htmlToPdf } from "./lib/pdf.mjs";
import { USERS } from "./04-roles-users.mjs";
import { SCHEME } from "./05-workflow.mjs";
import { SOURCES, LOCALISED, ARTICLES, NEWSLETTER, ASSET_PACK } from "./content/seed-content.mjs";

const email = (role) => USERS.find((u) => u.role === role).email;

/** Short-lived (2 h) API tokens for the demo users, revoked at the end. */
async function userTokens() {
  const users = await allUsers();
  const tokens = {};
  const ids = [];
  for (const u of USERS) {
    const userId = users.find((x) => x.emailAddress === u.email)?.userId;
    if (!userId || DRY) continue;
    const r = await api("POST", "/api/v1/apitoken", {
      userId, expirationSeconds: 7200, network: "0.0.0.0/0", claims: { label: "publishing-demo seed" },
    });
    const e = must(r, `token for ${u.email}`);
    tokens[u.role] = e.jwt;
    ids.push(e.token?.id);
  }
  return { tokens, revoke: async () => { for (const id of ids.filter(Boolean)) await api("PUT", `/api/v1/apitoken/${id}/revoke`); } };
}

export async function run() {
  const site = await siteId();
  const scheme = ((await api("GET", "/api/v1/workflow/schemes")).entity || []).find((s) => s.name === SCHEME && !s.archived);
  const actions = scheme
    ? Object.fromEntries(((await api("GET", `/api/v1/workflow/schemes/${scheme.id}/actions`)).entity || []).map((a) => [a.name, a.id]))
    : {};
  const langs = Object.fromEntries(((await api("GET", "/api/v2/languages")).entity || []).map((l) => [l.isoCode, l.id]));
  const { tokens, revoke } = await userTokens();
  const as = (role) => ({ token: tokens[role] || TOKEN });

  const existing = async (type) => (DRY && site.startsWith("dry-") ? [] : search(`+contentType:${type} +conHost:${site} +deleted:false`, { limit: 500 }));

  // Relationship values are plain identifiers (comma-separated): a "+identifier:" query
  // would run in the item's own language and miss the English sources of truth.
  // Create an item as `role` (Save Draft), then fire `walk` actions in order.
  async function create(type, role, fields, walk = [], comments = {}, actors = {}) {
    const r = await fireAction(actions["Save Draft"], { contentType: type, site, languageId: 1, ...fields }, as(role));
    const e = must(r, `${type} ${fields.title}`);
    record("content", `${type}:${fields.urlTitle || fields.title}`, e.identifier, { type });
    for (const name of walk) {
      const actor = actors[name] || (["Approve", "Reject", "Publish to Web", "Ready for External Channel"].includes(name) ? "owner" : name === "SME Approve" ? "sme" : role);
      const res = await fireAction(actions[name], { identifier: e.identifier, languageId: fields.languageId || 1 }, { ...as(actor), comments: comments[name] });
      if (res.dry) continue;
      if (res._status >= 400) {
        console.error(`  ! ${name} on ${fields.title}: ${JSON.stringify(res).slice(0, 300)}`);
        process.exit(1);
      }
    }
    log(`  ${type} "${fields.title}" → ${walk.at(-1) || "Draft"}`);
    return e.identifier;
  }

  const ids = { sot: {}, article: {}, localised: {} };
  const sotWalk = ["Submit for Approval", "Approve", "Publish to Web"];

  try {
    await step("Messaging sources of truth", async () => {
      const have = await existing("PdMessagingSot");
      for (const s of SOURCES) {
        const found = have.find((c) => c.urlTitle === s.urlTitle);
        if (found) {
          ids.sot[s.urlTitle] = found.identifier;
          log(`  "${s.title}" (v${s.version}) exists`);
          continue;
        }
        const fields = {
          title: s.title, urlTitle: s.urlTitle, sotKey: s.key, topic: [s.category], keyMessages: s.keyMessages,
          proofPoints: s.proofPoints, doNotSay: s.doNotSay, owner: s.owner, version: s.version, status: s.status,
          approvedDate: s.approvedDate, reviewByDate: s.reviewByDate,
        };
        if (s.supersedes) fields.supersedes = ids.sot[s.supersedes];
        ids.sot[s.urlTitle] = await create("PdMessagingSot", "marketer", fields, sotWalk, {
          "Submit for Approval": `Version ${s.version} of the ${s.key} messaging.`,
          Approve: s.status === "superseded" ? "Approved (historical version)." : "Approved as the current source of truth.",
        });
      }
    });

    await step("Thought leadership articles", async () => {
      const have = await existing("PdArticle");
      for (const a of ARTICLES) {
        const found = have.find((c) => c.urlTitle === a.urlTitle);
        if (found) {
          ids.article[a.urlTitle] = found.identifier;
          log(`  "${a.title}" exists`);
          continue;
        }
        ids.article[a.urlTitle] = await create("PdArticle", "marketer", {
          title: a.title, urlTitle: a.urlTitle, h1: a.h1, standfirst: a.standfirst, body: JSON.stringify({ type: "doc", content: a.body }),
          author: a.author, authorRole: a.authorRole, topic: [a.category], seoSummary: a.seoSummary,
          faq: JSON.stringify(a.faq), lastReviewed: a.lastReviewed, relatedSot: ids.sot[a.sot],
        }, sotWalk, { "Submit for Approval": "Ready for review.", Approve: "Approved for the website." });
      }
    });

    await step("Localised messages", async () => {
      const have = await existing("PdLocalisedMessage");
      for (const m of LOCALISED) {
        const found = have.find((c) => c.title === m.title);
        if (found) {
          ids.localised[m.key] = found.identifier;
          log(`  "${m.title}" exists`);
          continue;
        }
        const sotId = ids.sot[m.parent];
        ids.localised[m.key] = await create("PdLocalisedMessage", "regional", {
          title: m.title, region: m.region, languageId: langs[m.language] || 1, body: m.body,
          targetChannel: m.targetChannel, smeNeeded: m.smeNeeded, parentSot: sotId,
        }, m.walk, m.comments);
      }
    });

    await step("Newsletter issue", async () => {
      const have = await existing("PdNewsletterIssue");
      if (have.find((c) => c.title === NEWSLETTER.title)) return log(`  "${NEWSLETTER.title}" exists`);
      const articleIds = NEWSLETTER.articles.map((u) => ids.article[u]).join(",");
      await create("PdNewsletterIssue", "marketer", {
        title: NEWSLETTER.title, channel: NEWSLETTER.channel, issueDate: NEWSLETTER.issueDate, intro: NEWSLETTER.intro,
        approvalStatus: "draft", articles: articleIds,
        messages: ids.localised["lm-iberia-ai"],
      }, NEWSLETTER.walk, NEWSLETTER.comments);
    });

    await step("Asset pack", async () => {
      const have = await existing("PdAssetPack");
      if (have.find((c) => c.title === ASSET_PACK.title)) return log(`  "${ASSET_PACK.title}" exists`);
      const dir = join(DEMO_DIR, "setup", "state");
      mkdirSync(dir, { recursive: true });
      const pdfPath = join(dir, ASSET_PACK.pdfName);
      htmlToPdf({ html: placeholderPdfHtml() }, pdfPath);
      let tempId = "dry-temp";
      if (!DRY) {
        const form = new FormData();
        form.append("file", new Blob([readFileSync(pdfPath)], { type: "application/pdf" }), ASSET_PACK.pdfName);
        // A temp file can only be used by the user who uploaded it.
        const up = await api("POST", "/api/v1/temp", form, { headers: { Origin: URL_BASE }, token: as("marketer").token });
        tempId = up.tempFiles?.[0]?.id;
        if (!tempId) { console.error(`  ! PDF upload: ${JSON.stringify(up).slice(0, 300)}`); process.exit(1); }
      }
      const rel = ASSET_PACK.related.map((k) => ids.sot[k]).join(",");
      await create("PdAssetPack", "marketer", {
        title: ASSET_PACK.title, description: ASSET_PACK.description, pdf: tempId,
        distributionPartner: ASSET_PACK.distributionPartner, event: ASSET_PACK.event, relatedMessages: rel,
      }, sotWalk, { "Submit for Approval": "Partner pack for OA Week.", Approve: "Approved for partners." });
    });
  } finally {
    await revoke();
  }
  return ids;
}

function placeholderPdfHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 22mm; }
  body { font-family: Helvetica, Arial, sans-serif; color: #1c1d22; }
  .bar { height: 6px; background: #ff551d; margin-bottom: 18px; }
  h1 { font-size: 26px; margin: 0 0 6px; } .muted { color: #5c5f66; font-size: 12px; }
  li { margin: 6px 0; } .box { border: 1px solid #ddd; padding: 14px; margin-top: 18px; background: #f7f6f2; }
  </style></head><body><div class="bar"></div>
  <p class="muted">Partner pack · Open Access Week 2026 · DEMO PLACEHOLDER (fictional content)</p>
  <h1>Open access agreements: equitable routes to publish and to read</h1>
  <p>Based on the current Open access source of truth (version 2, approved 1 October 2026).</p>
  <ul>
    <li>Institutional agreements make open access the default for eligible authors.</li>
    <li>Waivers and discounts mean that cost is not a barrier for researchers in lower-income countries.</li>
    <li>Licence and funder data reach your repository automatically, so reporting is simple.</li>
  </ul>
  <div class="box"><strong>Who to ask:</strong> Eleanor Shaw, Messaging Owner, A&amp;G Content (fictional)</div>
  </body></html>`;
}

if (import.meta.url === `file://${process.argv[1]}`) await run();
