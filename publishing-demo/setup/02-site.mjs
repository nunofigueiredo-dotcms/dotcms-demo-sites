// The publishing-demo site, its folders, aliases and UVE configuration.
import { api, must, record, step, log, getSite, SITE_NAME, DRY } from "./lib/api.mjs";

// Where UVE loads pages from. Set PUBLISHING_FRONTEND to the Vercel URL once deployed.
export const FRONTEND = (process.env.PUBLISHING_FRONTEND || "http://localhost:3010").replace(/\/$/, "");
const DEV_FRONTENDS = ["http://localhost:3010", "http://publishing-demo.localhost:3010"];
const FOLDERS = ["/articles", "/hub", "/topics", "/newsletters", "/files", "/files/pdfs", "/images"];

export async function run() {
  let id;
  await step(`Site ${SITE_NAME}`, async () => {
    const site = await getSite();
    if (site) {
      id = site.identifier;
      log(`  site exists -> ${id}${site.live ? " (live)" : ""}${site.archived ? " (archived: restoring)" : ""}`);
      if (site.archived) await api("PUT", `/api/v1/site/${id}/_unarchive`);
      if (!site.live || site.archived) await api("PUT", `/api/v1/site/${id}/_publish`);
    } else {
      const e = must(
        await api("POST", "/api/v1/site", {
          siteName: SITE_NAME,
          languageId: 1,
          tagStorage: "SYSTEM_HOST",
          description: "Elsevier Academic & Government messaging hub demo (dotCMS governance layer)",
          runDashboard: false,
          forceExecution: true,
        }),
        "site",
      );
      id = e.identifier;
      record("site", SITE_NAME, id);
      await api("PUT", `/api/v1/site/${id}/_publish`);
      log(`  site created and published -> ${id}`);
    }

    const aliases = ["publishing-demo.localhost", FRONTEND.replace(/^https?:\/\//, "")]
      .filter((a, i, all) => !a.startsWith("localhost") && all.indexOf(a) === i)
      .join("\n");
    const current = DRY ? null : (await api("GET", `/api/v1/site/${id}`)).entity;
    if (!current || (current.aliases || "").trim() !== aliases) {
      must(
        await api("PUT", `/api/v1/site?id=${id}`, { siteName: SITE_NAME, aliases, forceExecution: true }),
        "site aliases",
      );
      log(`  aliases: ${aliases.replace(/\n/g, ", ")}`);
    }
  });

  await step("Folders", async () => {
    const r = await api("POST", `/api/v1/folder/createfolders/${SITE_NAME}`, FOLDERS);
    if (!r.dry) log(`  ${FOLDERS.join(", ")}`);
  });

  await step("UVE", async () => {
    const cfg = { config: [{ pattern: ".*", url: FRONTEND, options: { allowedDevURLs: DEV_FRONTENDS } }] };
    const r = await api("GET", `/api/v1/apps/dotema-config-v2/${id}`);
    const now = r.entity?.sites?.[0]?.secrets?.find((s) => s.name === "configuration")?.value;
    if (now && JSON.stringify(JSON.parse(now)) === JSON.stringify(cfg)) return log(`  UVE already -> ${FRONTEND}`);
    must(
      await api("POST", `/api/v1/apps/dotema-config-v2/${id}`, {
        configuration: { value: JSON.stringify(cfg, null, 2), hidden: false },
      }),
      "UVE config",
      {},
    );
    record("uve", SITE_NAME, id);
    log(`  UVE -> ${FRONTEND}`);
  });
  return id;
}

if (import.meta.url === `file://${process.argv[1]}`) await run();
