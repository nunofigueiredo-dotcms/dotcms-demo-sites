// The five content types, all on the publishing-demo site and on the
// "Governed Content" workflow. Relationship fields are added after every type
// exists (a relationship needs its target type).
import { api, must, record, step, log, siteId, DRY } from "./lib/api.mjs";
import { USERS } from "./04-roles-users.mjs";
import { SCHEME } from "./05-workflow.mjs";
import { pageIds } from "./06-pages.mjs";

const F = "com.dotcms.contenttype.model.field.Immutable";
const opts = (pairs) => pairs.map(([l, v]) => `${l}|${v}`).join("\r\n");

const field = (kind, name, variable, o = {}) => ({
  clazz: F + kind, name, variable,
  required: !!o.required, indexed: !!(o.indexed || o.required || o.listed), listed: !!o.listed,
  searchable: !!o.searchable, unique: !!o.unique,
  ...(o.values !== undefined ? { values: o.values } : {}),
  ...(o.hint ? { hint: o.hint } : {}),
  ...(o.dataType ? { dataType: o.dataType } : {}),
  ...(o.defaultValue ? { defaultValue: o.defaultValue } : {}),
  ...(o.extra || {}),
});
const site = () => field("HostFolderField", "Site", "site", { required: true });
const rel = (name, variable, target, cardinality, o = {}) =>
  field("RelationshipField", name, variable, {
    ...o, indexed: true,
    extra: { relationships: { cardinality, velocityVar: target, isParentField: true }, skipRelationshipCreation: false },
  });
// Cardinality: 0 one-to-many, 1 many-to-many, 2 one-to-one, 3 many-to-one.
const MANY_TO_ONE = 3, MANY_TO_MANY = 1, ONE_TO_ONE = 2;

export const CHANNELS = [["Web", "web"], ["PDF", "pdf"], ["Email", "email"], ["LinkedIn newsletter", "linkedin-newsletter"], ["Paid social", "paid-social"], ["Organic social", "organic-social"]];
export const REGIONS = [["DACH", "dach"], ["Iberia", "iberia"], ["APAC", "apac"], ["UK & Ireland", "uk-ireland"], ["North America", "north-america"], ["LATAM", "latam"]];
const OWNERS = USERS.filter((u) => u.role === "owner" || u.role === "sme").map((u) => [`${u.firstName} ${u.lastName}, ${u.title}`, u.email]);

function types(topicsInode) {
  const topic = (o = {}) => field("CategoryField", "Topic", "topic", { ...o, values: topicsInode, listed: true });
  return [
    {
      variable: "PdMessagingSot", name: "Messaging Source of Truth", icon: "verified",
      description: "The approved, current messaging for one topic. New versions supersede old ones.",
      urlMap: { pattern: "/topics/{urlTitle}", page: "topic" },
      fields: [
        site(),
        field("TextField", "Title", "title", { required: true, listed: true, searchable: true }),
        field("TextField", "URL title", "urlTitle", { required: true, unique: true, hint: "Topic page address, e.g. open-access (current) or open-access-v1" }),
        field("TextField", "Topic key", "sotKey", { required: true, hint: "The same for every version of this topic, e.g. open-access" }),
        topic({ required: true }),
        field("StoryBlockField", "Key messages", "keyMessages", { searchable: true }),
        field("StoryBlockField", "Approved proof points", "proofPoints"),
        field("TextAreaField", "Do-not-say list", "doNotSay", { hint: "Manual reference for writers and reviewers. One per line: avoid → say instead." }),
        field("SelectField", "Owner", "owner", { required: true, values: opts(OWNERS), hint: "Who to ask about this messaging" }),
        field("TextField", "Version", "version", { required: true, dataType: "INTEGER", listed: true }),
        field("DateField", "Approved date", "approvedDate"),
        field("DateField", "Review-by date", "reviewByDate", { indexed: true }),
        field("SelectField", "Status", "status", { required: true, listed: true, values: opts([["Current", "current"], ["Superseded", "superseded"]]) }),
      ],
      relationships: [rel("Supersedes", "supersedes", "PdMessagingSot", ONE_TO_ONE, { hint: "The previous version this one replaces" })],
    },
    {
      variable: "PdLocalisedMessage", name: "Localised Message", icon: "translate",
      description: "Approved messaging adapted for one region, language and channel. Always points to its source of truth.",
      fields: [
        site(),
        field("TextField", "Title", "title", { required: true, listed: true, searchable: true }),
        field("SelectField", "Region", "region", { required: true, listed: true, values: opts(REGIONS) }),
        field("StoryBlockField", "Body", "body", { searchable: true }),
        field("SelectField", "Target channel", "targetChannel", { required: true, listed: true, values: opts(CHANNELS) }),
        field("RadioField", "SME needed", "smeNeeded", { required: true, values: opts([["Yes", "yes"], ["No", "no"]]), defaultValue: "no", hint: "Yes sends it to an SME before the Messaging Owner" }),
      ],
      relationships: [rel("Source of truth", "parentSot", "PdMessagingSot", MANY_TO_ONE, { required: true })],
    },
    {
      variable: "PdArticle", name: "Thought Leadership Article", icon: "article",
      description: "Long-form thought leadership for the website, PDFs and newsletters.",
      urlMap: { pattern: "/articles/{urlTitle}", page: "article" },
      fields: [
        site(),
        field("TextField", "Title", "title", { required: true, listed: true, searchable: true }),
        field("TextField", "URL title", "urlTitle", { required: true, unique: true }),
        field("TextField", "H1", "h1", { required: true }),
        field("TextAreaField", "Standfirst", "standfirst", { required: true }),
        field("StoryBlockField", "Body", "body", { searchable: true, hint: "Use H2 for sections and H3 for sub-sections" }),
        field("TextField", "Author", "author", { listed: true }),
        field("TextField", "Author role", "authorRole"),
        topic(),
        field("TextAreaField", "SEO / AEO summary", "seoSummary", { hint: "40–60 words that answer the article's main question directly" }),
        field("KeyValueField", "FAQ pairs", "faq", { hint: "Question → answer. Rendered as FAQ structured data for answer engines." }),
        field("DateField", "Last reviewed", "lastReviewed", { listed: true }),
      ],
      relationships: [rel("Related source of truth", "relatedSot", "PdMessagingSot", MANY_TO_ONE)],
    },
    {
      variable: "PdNewsletterIssue", name: "Newsletter Issue", icon: "mail",
      description: "An email or LinkedIn newsletter issue assembled from approved articles and messages.",
      fields: [
        site(),
        field("TextField", "Title", "title", { required: true, listed: true }),
        field("SelectField", "Channel", "channel", { required: true, listed: true, values: opts([["Email", "email"], ["LinkedIn", "linkedin"]]) }),
        field("DateField", "Issue date", "issueDate", { required: true, listed: true }),
        field("TextAreaField", "Intro", "intro"),
        field("SelectField", "Approval status", "approvalStatus", {
          listed: true, defaultValue: "draft", hint: "Kept in step with the workflow automatically",
          values: opts([["Draft", "draft"], ["In review", "in-review"], ["Rejected", "rejected"], ["Approved", "approved"], ["Published", "published"], ["Ready for External Channel", "ready-external"]]),
        }),
      ],
      relationships: [
        rel("Article sections", "articles", "PdArticle", MANY_TO_MANY),
        rel("Message sections", "messages", "PdLocalisedMessage", MANY_TO_MANY),
      ],
    },
    {
      variable: "PdAssetPack", name: "Asset Pack", icon: "inventory_2",
      description: "Downloadable material for partners and events.",
      fields: [
        site(),
        field("TextField", "Title", "title", { required: true, listed: true }),
        field("TextAreaField", "Description", "description"),
        field("BinaryField", "PDF", "pdf", { required: true }),
        field("TextField", "Distribution partner", "distributionPartner", { listed: true }),
        field("TextField", "Event", "event", { listed: true }),
      ],
      relationships: [rel("Related messages", "relatedMessages", "PdMessagingSot", MANY_TO_MANY)],
    },
  ];
}

export const TYPE_VARS = ["PdMessagingSot", "PdLocalisedMessage", "PdArticle", "PdNewsletterIssue", "PdAssetPack"];

export async function run() {
  const site = await siteId();
  const scheme = ((await api("GET", "/api/v1/workflow/schemes")).entity || []).find((s) => s.name === SCHEME && !s.archived)?.id || "dry-scheme";
  const topics = (await api("GET", "/api/v1/categories/pdTopics")).entity?.inode || "dry-topics";
  const pages = await pageIds(site);
  const defs = types(topics);

  await step("Content types", async () => {
    for (const t of defs) {
      const found = (await api("GET", `/api/v1/contenttype/id/${t.variable}`)).entity;
      const body = {
        clazz: "com.dotcms.contenttype.model.type.ImmutableSimpleContentType",
        name: t.name, variable: t.variable, description: t.description, icon: t.icon,
        host: site, workflow: [scheme],
        ...(t.urlMap ? { urlMapPattern: t.urlMap.pattern, detailPage: pages[t.urlMap.page] } : {}),
      };
      if (found?.id) {
        const missing = t.fields.filter((f) => !found.fields.some((x) => x.variable === f.variable));
        for (const f of missing) {
          must(await api("POST", `/api/v1/contenttype/${found.id}/fields`, { ...f, contentTypeId: found.id }), `${t.variable}.${f.variable}`);
          log(`  ${t.variable}: added ${f.variable}`);
        }
        const wfOk = (found.workflows || []).map((w) => w.id).join() === scheme;
        const mapOk = !t.urlMap || (found.urlMapPattern === t.urlMap.pattern && found.detailPage === pages[t.urlMap.page]);
        if (!wfOk || !mapOk) {
          const full = { ...found, ...body, fields: undefined };
          delete full.workflows;
          must(await api("PUT", `/api/v1/contenttype/id/${found.id}`, full), `update ${t.variable}`);
          log(`  ${t.variable}: workflow / URL map updated`);
        }
        log(`  ${t.variable} exists -> ${found.id}`);
        continue;
      }
      const r = await api("POST", "/api/v1/contenttype", [{ ...body, fields: t.fields }]);
      const e = must(r, `type ${t.variable}`);
      const id = Array.isArray(e) ? e[0]?.id : e.id;
      record("contenttype", t.variable, id);
      log(`  ${t.variable} created -> ${id}`);
    }
  });

  await step("Relationships", async () => {
    for (const t of defs) {
      const found = DRY ? null : (await api("GET", `/api/v1/contenttype/id/${t.variable}`)).entity;
      for (const f of t.relationships) {
        if (found?.fields.some((x) => x.variable === f.variable)) continue;
        must(await api("POST", `/api/v1/contenttype/${found?.id || "dry-type"}/fields`, { ...f, contentTypeId: found?.id }), `${t.variable}.${f.variable}`);
        log(`  ${t.variable}.${f.variable} → ${f.relationships.velocityVar}`);
      }
    }
    log("  relationships in place");
  });
}

if (import.meta.url === `file://${process.argv[1]}`) await run();
