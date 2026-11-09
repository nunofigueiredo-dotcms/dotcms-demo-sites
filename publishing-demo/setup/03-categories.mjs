// Topic categories: one parent (pdTopics) and one child per messaging topic.
import { api, must, record, step, log, DRY } from "./lib/api.mjs";

export const PARENT = { key: "pdTopics", name: "Publishing Demo Topics" };
export const TOPICS = [
  { key: "pdResearchIntegrity", name: "Research integrity", slug: "research-integrity" },
  { key: "pdOpenAccess", name: "Open access", slug: "open-access" },
  { key: "pdAiInResearch", name: "AI in research", slug: "ai-in-research" },
  { key: "pdResearchFundingImpact", name: "Research funding impact", slug: "research-funding-impact" },
];

async function byKey(key) {
  const r = await api("GET", `/api/v1/categories/${key}`);
  return r.entity && r.entity.key === key ? r.entity : null;
}

async function ensure(cat, parentInode, sortOrder) {
  const found = await byKey(cat.key);
  if (found) {
    log(`  ${cat.key} exists -> ${found.inode}`);
    return found.inode;
  }
  const body = {
    categoryName: cat.name,
    key: cat.key,
    categoryVelocityVarName: cat.key,
    keywords: cat.slug || "",
    active: true,
    sortOrder,
  };
  if (parentInode) body.parent = parentInode;
  const e = must(await api("POST", "/api/v1/categories", body), `category ${cat.key}`);
  record("category", cat.key, e.inode);
  log(`  ${cat.key} created -> ${e.inode}`);
  return e.inode;
}

export async function run() {
  const ids = {};
  await step("Categories", async () => {
    const parent = await ensure(PARENT, null, 0);
    ids[PARENT.key] = parent;
    for (const [i, t] of TOPICS.entries()) ids[t.key] = await ensure(t, DRY ? null : parent, i + 1);
  });
  return ids;
}

if (import.meta.url === `file://${process.argv[1]}`) await run();
