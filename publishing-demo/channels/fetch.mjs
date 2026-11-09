// One approved message, many channels.
//
// Pulls ONE approved message from dotCMS with the content APIs, using the
// read-only Hub Reader token, and writes it three ways:
//   out/web.json               what a website or app would consume
//   out/newsletter.html        an email/LinkedIn newsletter section (inline styles)
//   out/sprinklr-handoff.json  the hand-off for paid and organic social. Just a file:
//                              publishing to social happens in Sprinklr, not here.
// and prints one approved article to PDF (out/<article>.pdf).
//
// Governance: anything that isn't approved is refused, with the reason from the
// workflow history. Try it: node fetch.mjs --localised APAC
//
//   node fetch.mjs                                   open-access source of truth (current)
//   node fetch.mjs --sot ai-in-research              another source of truth
//   node fetch.mjs --localised Iberia                a localised message (title starts with)
//   node fetch.mjs --article <urlTitle>              which article becomes the PDF
//   node fetch.mjs --upload                          also upload the PDF to dotCMS (/files/pdfs),
//                                                    so the article page offers it (admin token)
//
// Env: DOTCMS_URL, DOTCMS_READ_TOKEN (from publishing-demo/.env.local),
//      PUBLISHING_FRONTEND (default http://localhost:3010) for links and the PDF.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { htmlToPdf } from "../setup/lib/pdf.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "out");
const envFile = join(HERE, "..", ".env.local");
const fromFile = (k) =>
  existsSync(envFile) ? readFileSync(envFile, "utf8").split("\n").find((l) => l.startsWith(`${k}=`))?.slice(k.length + 1) : undefined;

const DOTCMS = (process.env.DOTCMS_URL || "https://awesomedemo-dev.dotcms.dev").replace(/\/$/, "");
const TOKEN = process.env.DOTCMS_READ_TOKEN || fromFile("DOTCMS_READ_TOKEN");
const FRONTEND = (process.env.PUBLISHING_FRONTEND || "http://localhost:3010").replace(/\/$/, "");
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
if (!TOKEN) {
  console.error("No DOTCMS_READ_TOKEN: run publishing-demo/setup/09-frontend-env.mjs first.");
  process.exit(1);
}

const APPROVED_STEPS = ["Approved", "Published to Web", "Ready for External Channel"];
const EXTERNAL = ["linkedin-newsletter", "paid-social", "organic-social"];

async function api(path, init = {}) {
  const res = await fetch(DOTCMS + path, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`${init.method || "GET"} ${path}: HTTP ${res.status}`);
  return res.json();
}
const search = async (query, limit = 50) =>
  (await api("/api/content/_search", { method: "POST", body: JSON.stringify({ query: `${query} +deleted:false`, limit }) })).entity.jsonObjectView.contentlets;

// --- 1. Find the message ------------------------------------------------------
const siteId = fromFile("DOTCMS_SITE_ID") || process.env.DOTCMS_SITE_ID;
const site = siteId ? `+conHost:${siteId}` : "";
let item;
if (arg("localised")) {
  const prefix = arg("localised").toLowerCase();
  const all = await search(`+contentType:PdLocalisedMessage ${site} +working:true`);
  item = all.find((m) => m.title.toLowerCase().startsWith(prefix));
} else {
  const key = arg("sot", "open-access");
  [item] = await search(`+contentType:PdMessagingSot +PdMessagingSot.urlTitle:${key} ${site} +live:true`, 1);
}
if (!item) {
  console.error("Message not found.");
  process.exit(1);
}
const full = (await api(`/api/v1/content/${item.inode}?depth=1`)).entity; // follows relationships across languages
const status = (await api(`/api/v1/workflow/status/${item.inode}`)).entity;
const history = (await api(`/api/v1/workflow/tasks/history/comments/${item.identifier}?language=${item.languageId}`)).entity || [];
const step = status?.step?.name ?? "unknown";

// --- 2. Governance gate --------------------------------------------------------
if (!APPROVED_STEPS.includes(step)) {
  const last = history.find((h) => h.type === "WorkflowComment");
  console.error(`REFUSED: "${item.title}" is not approved (workflow step: ${step}).`);
  if (last) console.error(`Latest comment from ${last.postedBy}: ${last.commentDescription}`);
  console.error("Only approved content leaves dotCMS. Nothing was written.");
  process.exit(2);
}
const approval = history.find((h) => h.type === "WorkflowHistory" && /completed action Approve$/.test(h.commentDescription));
const sot = item.contentType === "PdMessagingSot" ? full : Array.isArray(full.parentSot) ? full.parentSot[0] : full.parentSot;
const languages = Object.fromEntries((await api("/api/v2/languages")).entity.map((l) => [l.id, l.isoCode]));

// --- 3. Renditions ---------------------------------------------------------------
const blocks = (doc) => (typeof doc === "string" ? JSON.parse(doc) : doc) ?? { content: [] };
const text = (n) => (n.text ?? "") + (n.content ?? []).map(text).join("");
function toHtml(node, inline = false) {
  const kids = (n) => (n.content ?? []).map((c) => toHtml(c, true)).join("");
  switch (node.type) {
    case "doc": return (node.content ?? []).map((c) => toHtml(c)).join("\n");
    case "heading": return `<h${node.attrs?.level ?? 2} style="font:700 ${node.attrs?.level === 2 ? 20 : 17}px/1.3 Arial,sans-serif;color:#1c1d22;margin:22px 0 8px">${kids(node)}</h${node.attrs?.level ?? 2}>`;
    case "paragraph": return `<p style="font:16px/1.6 Georgia,serif;color:#1c1d22;margin:0 0 14px">${kids(node)}</p>`;
    case "bulletList": return `<ul style="font:16px/1.6 Georgia,serif;color:#1c1d22;margin:0 0 14px;padding-left:22px">${kids(node)}</ul>`;
    case "listItem": return `<li style="margin:0 0 6px">${(node.content ?? []).map((c) => kids(c)).join("")}</li>`;
    case "text": {
      const t = escape(node.text ?? "");
      return node.marks?.some((m) => m.type === "bold") ? `<strong>${t}</strong>` : t;
    }
    default: return inline ? kids(node) : `<div>${kids(node)}</div>`;
  }
}
const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const listItems = (doc) =>
  (blocks(doc).content ?? []).filter((n) => n.type === "bulletList").flatMap((l) => l.content.map((li) => text(li).trim()));

const isSot = item.contentType === "PdMessagingSot";
const body = isSot ? full.keyMessages : full.body;
const url = `${FRONTEND}/topics/${sot?.urlTitle ?? ""}`;
// History dates come as epoch numbers or as "2026-11-09 10:12:13.0".
function toIso(v) {
  const d = typeof v === "number" ? new Date(v) : new Date(String(v).replace(" ", "T").replace(/\.\d+$/, ""));
  return Number.isNaN(d.getTime()) ? String(v) : d.toISOString();
}
const governance = {
  workflowStep: step,
  approvedBy: approval?.postedBy ?? null,
  approvedAt: approval ? toIso(approval.createdDate) : null,
  owner: sot?.owner ?? null,
  sourceOfTruth: sot ? { id: sot.identifier, title: sot.title, version: Number(sot.version), status: sot.status, reviewBy: sot.reviewByDate ? toIso(sot.reviewByDate).slice(0, 10) : null } : null,
};

mkdirSync(OUT, { recursive: true });

// web.json
const web = {
  id: item.identifier,
  type: item.contentType,
  language: languages[item.languageId],
  title: item.title,
  region: item.region ?? null,
  channel: item.targetChannel ?? "web",
  url,
  keyMessages: listItems(body),
  proofPoints: isSot ? listItems(full.proofPoints) : [],
  body: blocks(body),
  governance,
};
writeFileSync(join(OUT, "web.json"), JSON.stringify(web, null, 2));

// newsletter.html (email-safe: tables and inline styles)
const newsletter = `<!doctype html>
<html lang="${(languages[item.languageId] || "en").slice(0, 2)}"><head><meta charset="utf-8"><title>${escape(item.title)}</title></head>
<body style="margin:0;background:#f7f6f2">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f2"><tr><td align="center" style="padding:24px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-top:6px solid #ff551d">
<tr><td style="padding:28px 32px 8px;font:600 12px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#5c5f66">Research Leaders Briefing · Elsevier (demo)</td></tr>
<tr><td style="padding:0 32px"><h1 style="font:600 28px/1.25 Georgia,serif;color:#1c1d22;margin:8px 0 18px">${escape(item.title)}</h1>
${toHtml(blocks(body))}
${isSot && listItems(full.proofPoints).length ? `<table role="presentation" width="100%" style="background:#f7f6f2;margin:8px 0 18px"><tr><td style="padding:16px 18px;font:15px/1.55 Arial,sans-serif;color:#1c1d22"><strong>Proof points</strong><br>${listItems(full.proofPoints).map(escape).join("<br>")}</td></tr></table>` : ""}
<p style="margin:8px 0 28px"><a href="${url}" style="background:#1c1d22;color:#ffffff;text-decoration:none;font:600 15px Arial,sans-serif;padding:12px 22px;border-radius:999px;display:inline-block">Read more</a></p></td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #e4e2dd;font:12px/1.5 Arial,sans-serif;color:#5c5f66">Approved content from dotCMS${governance.approvedBy ? ` · approved by ${escape(governance.approvedBy)}` : ""}${sot ? ` · source of truth v${sot.version}` : ""}. Demo environment, fictional content.</td></tr>
</table></td></tr></table></body></html>
`;
writeFileSync(join(OUT, "newsletter.html"), newsletter);

// sprinklr-handoff.json
const channels = item.targetChannel && EXTERNAL.includes(item.targetChannel) ? [item.targetChannel] : ["linkedin-newsletter", "organic-social", "paid-social"];
const plain = (blocks(body).content ?? []).map((n) => text(n).trim()).filter(Boolean).join("\n\n");
const handoff = {
  handoffVersion: "1.0",
  generatedAt: new Date().toISOString(),
  source: { system: "dotCMS", instance: DOTCMS, contentId: item.identifier, contentType: item.contentType, language: languages[item.languageId] },
  note: "Hand-off file only. Scheduling and publishing happen in Sprinklr; dotCMS keeps the approved source, version and audit trail.",
  channels,
  content: {
    headline: item.title,
    copy: plain.length > 2900 ? `${plain.slice(0, 2897)}...` : plain,
    keyMessages: listItems(body),
    link: url,
  },
  governance: {
    ...governance,
    doNotSay: (sot?.doNotSay ?? "").split(/\r?\n/).filter(Boolean).map((l) => {
      const [avoid, instead] = l.split("→").map((s) => s.trim());
      return { avoid, sayInstead: instead ?? null };
    }),
    doNotPublishAfter: governance.sourceOfTruth?.reviewBy ?? null,
  },
};
writeFileSync(join(OUT, "sprinklr-handoff.json"), JSON.stringify(handoff, null, 2));

console.log(`"${item.title}" (${step}${governance.approvedBy ? `, approved by ${governance.approvedBy}` : ""})`);
console.log(`  web            → channels/out/web.json`);
console.log(`  newsletter     → channels/out/newsletter.html`);
console.log(`  Sprinklr       → channels/out/sprinklr-handoff.json (${channels.join(", ")})`);

// --- 4. PDF of an approved article ------------------------------------------------
const slug = arg("article", "open-access-agreements-what-libraries-need");
const [article] = await search(`+contentType:PdArticle +PdArticle.urlTitle:${slug} ${site} +live:true`, 1);
if (!article) {
  console.error(`  PDF: no published article "${slug}"`);
  process.exit(1);
}
const pdfPath = join(OUT, `${slug}.pdf`);
htmlToPdf({ url: `${FRONTEND}/print/articles/${slug}` }, pdfPath);
console.log(`  PDF            → channels/out/${slug}.pdf (from ${FRONTEND}/print/articles/${slug})`);

if (process.argv.includes("--upload")) {
  const { uploadPdf } = await import("./upload-pdf.mjs");
  await uploadPdf(pdfPath, `${slug}.pdf`, article.title);
}
