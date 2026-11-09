// Template and pages. The frontend (frontend-publishing) renders them; each page
// has one SYSTEM_CONTAINER slot for an editable intro block.
//   /            Insights home (thought leadership, public-site style)
//   /hub         Messaging Hub (intranet)
//   /articles/detail   detail page for Thought Leadership Articles (/articles/{urlTitle})
//   /topics/detail     detail page for Messaging Sources of Truth (/topics/{urlTitle})
import { api, must, record, step, log, siteId, search, fireSystem, DRY } from "./lib/api.mjs";

// awesomedemo-dev's landing-page theme: headless templates still need a valid theme.
const THEME = process.env.DOTCMS_THEME_ID || "ce00bd28-5f66-47f9-96ca-bbf0722a79aa";
export const TEMPLATE_TITLE = "Publishing Demo Page";

export const PAGES = [
  { key: "home", folder: "/", url: "index", title: "Insights for research leaders", seo: "Thought leadership for academic and government research leaders." },
  { key: "hub", folder: "/hub", url: "index", title: "Messaging Hub", seo: "Approved A&G messaging, owners and review status." },
  { key: "article", folder: "/articles", url: "detail", title: "Article", seo: "Thought leadership article" },
  { key: "topic", folder: "/topics", url: "detail", title: "Topic", seo: "Source of truth and its localised messages" },
];

async function ensureTemplate(site) {
  const found = (await api("GET", `/api/v1/templates?filter=${encodeURIComponent(TEMPLATE_TITLE)}&host=${site}&per_page=50`)).entity || [];
  const t = found.find((x) => x.title === TEMPLATE_TITLE);
  if (t) {
    log(`  template exists -> ${t.identifier}`);
    return t.identifier;
  }
  const body = '#parseContainer("SYSTEM_CONTAINER","1")';
  const e = must(
    await api("POST", "/api/v1/templates", {
      title: TEMPLATE_TITLE, friendlyName: TEMPLATE_TITLE, siteId: site, theme: THEME, drawed: true,
      body, drawedBody: body,
      layout: {
        body: { rows: [{ styleClass: "", columns: [{ styleClass: "", leftOffset: 1, width: 12, containers: [{ identifier: "SYSTEM_CONTAINER", uuid: "1" }] }] }] },
        header: true, footer: true, sidebar: null,
      },
    }),
    "template",
  );
  await api("PUT", "/api/v1/templates/_publish", [e.identifier]);
  record("template", TEMPLATE_TITLE, e.identifier);
  log(`  template created -> ${e.identifier}`);
  return e.identifier;
}

export async function pageIds(site) {
  const all = DRY && site.startsWith("dry-") ? [] : await search(`+contentType:htmlpageasset +conHost:${site} +deleted:false`);
  return Object.fromEntries(
    PAGES.map((p) => {
      const uri = `${p.folder === "/" ? "" : p.folder}/${p.url}`;
      return [p.key, all.find((c) => c.url === uri || c.path === uri)?.identifier || `dry-page-${p.key}`];
    }),
  );
}

export async function run() {
  const site = await siteId();
  let tpl;
  await step("Template", async () => {
    tpl = await ensureTemplate(site);
  });
  await step("Pages", async () => {
    const have = await pageIds(site);
    for (const p of PAGES) {
      if (!have[p.key].startsWith("dry-")) {
        log(`  ${p.folder}${p.folder === "/" ? "" : "/"}${p.url} exists -> ${have[p.key]}`);
        continue;
      }
      const e = must(
        await fireSystem("PUBLISH", {
          contentType: "htmlpageasset", title: p.title, friendlyName: p.title, url: p.url,
          hostFolder: `${site}:${p.folder}`, template: tpl, cachettl: "0", sortOrder: 0,
          seodescription: p.seo, languageId: 1,
        }),
        `page ${p.key}`,
      );
      record("page", p.key, e.identifier);
      log(`  ${p.folder}${p.folder === "/" ? "" : "/"}${p.url} created -> ${e.identifier}`);
    }
  });
  return pageIds(site);
}

if (import.meta.url === `file://${process.argv[1]}`) await run();
