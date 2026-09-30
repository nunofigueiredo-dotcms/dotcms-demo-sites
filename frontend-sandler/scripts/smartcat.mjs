#!/usr/bin/env node
/**
 * Smartcat ⇄ dotCMS translation bridge for Sandler articles.
 *
 *   npm run smartcat -- send         send queued articles to Smartcat
 *   npm run smartcat -- pull         import finished translations into dotCMS
 *   npm run smartcat -- pull --now   import whatever is translated so far
 *   npm run smartcat -- sync         send, then pull
 *   npm run smartcat -- status       list translation jobs
 *   npm run smartcat -- mt <id>      (re)apply machine translation to a project
 *
 * The flow, driven by the "Smartcat Translation" workflow in dotCMS:
 *   1. An editor fires "Send to Smartcat" on an article → "Queued for Smartcat".
 *   2. `send` exports the article's text to a key-value JSON file, creates a
 *      Smartcat project (en → targets) with machine translation, records a
 *      Translation Job in dotCMS and moves the article to "In translation".
 *   3. Smartcat translates (machine translation, optionally a linguist).
 *   4. `pull` downloads each finished language, rebuilds the article and saves
 *      it as that language's version in "Translation ready for review".
 *   5. An editor reviews it in dotCMS and fires "Publish translation".
 *
 * It polls rather than using Smartcat callbacks, so it needs no public URL.
 * Reads .env.local (dotCMS host, token, site) and .env.smartcat.local
 * (SMARTCAT_ACCOUNT_ID, SMARTCAT_API_KEY, SMARTCAT_SERVER, SMARTCAT_TARGETS).
 */

const env = process.env;
const DOTCMS = (env.NEXT_PUBLIC_DOTCMS_HOST || "").replace(/\/$/, "");
const DOTCMS_TOKEN = env.NEXT_PUBLIC_DOTCMS_AUTH_TOKEN;
const SITE_ID = env.NEXT_PUBLIC_DOTCMS_SITE_ID;
const TARGETS = (env.SMARTCAT_TARGETS || "es,fr").split(",").map((s) => s.trim()).filter(Boolean);
const SOURCE_LANGUAGE = "en";
const CONTENT_TYPE = "SandlerArticle";
const TEXT_FIELDS = ["title", "teaser"]; // plus the Block Editor `body`
// The translation workflow is found by its "Send to Smartcat" action, not by
// name, so renaming it in dotCMS doesn't break anything.
const MARKER_ACTION = "Send to Smartcat";

// Smartcat's API lives on *.smartcat.ai; accept the web app's host too.
const SMARTCAT = (env.SMARTCAT_SERVER || "https://smartcat.ai")
  .replace(/\/$/, "")
  .replace(/smartcat\.com$/, "smartcat.ai");
const SMARTCAT_API = `${SMARTCAT}/api/integration/v1`;

// ─── HTTP helpers ─────────────────────────────────────────────────────────

async function dotcms(method, path, body) {
  const res = await fetch(`${DOTCMS}${path}`, {
    method,
    headers: { Authorization: `Bearer ${DOTCMS_TOKEN}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 300) };
  }
  if (!res.ok) throw new Error(`dotCMS ${method} ${path} → ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

function smartcatAuth() {
  if (!env.SMARTCAT_ACCOUNT_ID || !env.SMARTCAT_API_KEY) {
    throw new Error("Set SMARTCAT_ACCOUNT_ID and SMARTCAT_API_KEY in .env.smartcat.local");
  }
  return "Basic " + Buffer.from(`${env.SMARTCAT_ACCOUNT_ID}:${env.SMARTCAT_API_KEY}`).toString("base64");
}

async function smartcat(method, path, { json, form, raw } = {}) {
  const headers = { Authorization: smartcatAuth() };
  if (json !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${SMARTCAT_API}/${path}`, {
    method,
    headers,
    body: form ?? (json === undefined ? undefined : JSON.stringify(json)),
  });
  if (raw) return res;
  const text = await res.text();
  if (!res.ok) throw new Error(`Smartcat ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── dotCMS: workflow, languages, content ─────────────────────────────────

async function loadWorkflow() {
  const schemes = (await dotcms("GET", "/api/v1/workflow/schemes")).entity.filter((s) => !s.archived);
  for (const scheme of schemes) {
    const actions = Object.fromEntries(
      (await dotcms("GET", `/api/v1/workflow/schemes/${scheme.id}/actions`)).entity.map((a) => [a.name, a.id])
    );
    if (!actions[MARKER_ACTION]) continue;
    const steps = Object.fromEntries(
      (await dotcms("GET", `/api/v1/workflow/schemes/${scheme.id}/steps`)).entity.map((s) => [s.name, s.id])
    );
    return { steps, actions };
  }
  throw new Error(`No workflow with a "${MARKER_ACTION}" action — run the dotCMS setup first`);
}

async function languageIds() {
  const langs = (await dotcms("GET", "/api/v2/languages")).entity;
  return Object.fromEntries(langs.map((l) => [l.languageCode, l.id]));
}

async function search(query, limit = 100) {
  const res = await dotcms("POST", "/api/content/_search", { query, limit });
  return res.entity.jsonObjectView.contentlets;
}

async function fire(actionId, contentlet) {
  const res = await dotcms("PUT", `/api/v1/workflow/actions/${actionId}/fire`, { contentlet });
  return res.entity;
}

function dotcmsDate(value) {
  if (typeof value === "number") return new Date(value).toISOString().slice(0, 19).replace("T", " ");
  return String(value ?? "").replace(/\.\d+$/, "");
}

// ─── Article ⇄ key-value JSON for Smartcat ───────────────────────────────

function parseBody(body) {
  if (!body) return null;
  return typeof body === "string" ? JSON.parse(body) : body;
}

/** Every text run in a Block Editor document, keyed by its path. */
function textNodes(node, path = [], out = []) {
  if (node.type === "text" && node.text?.trim()) out.push({ path, node });
  (node.content || []).forEach((child, i) => textNodes(child, [...path, i], out));
  return out;
}

function toSegments(article) {
  const segments = {};
  for (const f of TEXT_FIELDS) if (article[f]) segments[f] = article[f];
  const body = parseBody(article.body);
  if (body) for (const { path, node } of textNodes(body)) segments[`body/${path.join("/")}`] = node.text;
  return segments;
}

/** Rebuild the article's fields from translated segments; untranslated keys keep the source. */
function fromSegments(article, translated) {
  const fields = {};
  for (const f of TEXT_FIELDS) if (article[f]) fields[f] = translated[f] || article[f];
  const body = parseBody(article.body);
  if (body) {
    const copy = structuredClone(body);
    for (const { path } of textNodes(copy)) {
      const value = translated[`body/${path.join("/")}`];
      if (!value) continue;
      let node = copy;
      for (const i of path) node = node.content[i];
      node.text = value;
    }
    fields.body = JSON.stringify(copy);
  }
  return fields;
}

// ─── Translation Job records ──────────────────────────────────────────────

async function saveJob(job) {
  const { identifier, ...fields } = job;
  const res = await dotcms("PUT", "/api/v1/workflow/actions/default/fire/PUBLISH", {
    contentlet: { contentType: "TranslationJob", site: SITE_ID, languageId: 1, ...(identifier && { identifier }), ...fields },
  });
  return res.entity;
}

const JOB_FIELDS = ["identifier", "title", "contentId", "sourceType", "targetLanguages", "status",
  "smartcatProjectId", "smartcatUrl", "importedLanguages", "log"];

function logLine(job, line) {
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  job.log = `${job.log ? job.log + "\n" : ""}${stamp}  ${line}`;
  console.log(`  ${line}`);
}

// ─── send ─────────────────────────────────────────────────────────────────

// Preferred machine-translation engines, first match wins. Override with
// SMARTCAT_MT_ENGINE (an engine id such as "engine:DeepL" or a name).
const MT_PREFERENCE = [env.SMARTCAT_MT_ENGINE, "DeepL", "Google NMT", "Google"].filter(Boolean);

async function enableMachineTranslation(projectId, job) {
  try {
    // Smartcat returns these with capitalised keys (Id, Name, Languages).
    const engines = (await smartcat("GET", `project/${projectId}/mt/available`)).map((e) => ({
      id: e.Id ?? e.id,
      name: e.Name ?? e.name,
    }));
    const pick =
      MT_PREFERENCE.map((want) =>
        engines.find((e) => e.id === want || e.id === `engine:${want}` || e.name === want)
      ).find(Boolean) || engines[0];
    if (!pick) return logLine(job, "No machine-translation engine available — translate in Smartcat.");
    await smartcat("POST", `project/${projectId}/mt`, { json: [{ id: pick.id, languages: TARGETS }] });
    logLine(job, `Machine translation: ${pick.name}`);
  } catch (e) {
    logLine(job, `Couldn't set machine translation (${e.message.slice(0, 120)}). Pre-translate in Smartcat.`);
    return;
  }
  // The project was created with pre-translation rules (translation memory,
  // then MT). Re-save them with startPretranslate=true so they run now that
  // the MT engine is set.
  try {
    const rules = await smartcat("GET", `project/${projectId}/pretranslation-rules`);
    await smartcat("PUT", `project/${projectId}/pretranslation-rules?startPretranslate=true`, { json: rules });
    logLine(job, "Pre-translation requested.");
  } catch (e) {
    logLine(job, `Pre-translation not started (${e.message.slice(0, 120)}). Run it in Smartcat.`);
  }
}

async function send() {
  const { steps, actions } = await loadWorkflow();
  const queued = await search(
    `+contentType:${CONTENT_TYPE} +conHost:${SITE_ID} +languageId:1 +wfstep:${steps["Queued for Smartcat"]} +deleted:false`
  );
  console.log(`send: ${queued.length} article(s) queued for Smartcat`);

  for (const article of queued) {
    console.log(`→ ${article.title}`);
    const job = {
      title: `Smartcat · ${article.title}`,
      contentId: article.identifier,
      sourceType: CONTENT_TYPE,
      targetLanguages: TARGETS.join(","),
      status: "sent",
      importedLanguages: "",
      log: "",
    };
    try {
      const segments = toSegments(article);
      const form = new FormData();
      form.append(
        "model",
        new Blob(
          [JSON.stringify({
            name: `dotCMS · ${article.title}`,
            description: `dotCMS ${CONTENT_TYPE} ${article.identifier} on ${DOTCMS}`,
            sourceLanguage: SOURCE_LANGUAGE,
            targetLanguages: TARGETS,
            assignToVendor: false,
            // Pre-translation can only be requested when the project is
            // created: fill every segment with machine translation up front.
            useMT: true,
            pretranslate: true,
            useTranslationMemory: true,
            autoPropagateRepetitions: true,
            externalTag: "dotcms",
          })],
          { type: "application/json" }
        )
      );
      form.append("file", new Blob([JSON.stringify(segments, null, 2)], { type: "application/json" }),
        `${article.urlTitle}.json`);
      const project = await smartcat("POST", "project/create", { form });

      job.smartcatProjectId = project.id;
      job.smartcatUrl = `${SMARTCAT}/projects/${project.id}`;
      logLine(job, `Smartcat project ${project.id} (${Object.keys(segments).length} segments, ${TARGETS.join(", ")})`);
      await enableMachineTranslation(project.id, job);

      job.status = "in-translation";
      const saved = await saveJob(job);
      await fire(actions["Mark in translation"], { identifier: article.identifier, languageId: 1 });
      console.log(`  job ${saved.identifier}`);
    } catch (e) {
      job.status = "failed";
      logLine(job, `Failed: ${e.message}`);
      await saveJob(job).catch(() => {});
    }
  }
}

// ─── pull ─────────────────────────────────────────────────────────────────

async function exportDocument(documentId) {
  const task = await smartcat("POST", `document/export?documentIds=${documentId}&type=target`);
  for (let i = 0; i < 30; i++) {
    const res = await smartcat("GET", `document/export/${task.id}`, { raw: true });
    if (res.status === 200) return await res.text();
    if (res.status !== 204) throw new Error(`export ${documentId} → ${res.status}`);
    await sleep(2000);
  }
  throw new Error(`export ${documentId} not ready after 60s`);
}

async function pull({ now = false } = {}) {
  const { actions } = await loadWorkflow();
  const langIds = await languageIds();
  const jobs = await search(`+contentType:TranslationJob +conHost:${SITE_ID} +TranslationJob.status:in-translation +deleted:false`);
  console.log(`pull: ${jobs.length} job(s) in translation${now ? " (importing current progress)" : ""}`);

  for (const found of jobs) {
    const job = Object.fromEntries(JOB_FIELDS.map((k) => [k, found[k] ?? ""]));
    console.log(`→ ${job.title}`);
    try {
      const [article] = await search(`+identifier:${job.contentId} +languageId:1 +deleted:false`, 1);
      if (!article) throw new Error(`source content ${job.contentId} not found`);
      const project = await smartcat("GET", `project/${job.smartcatProjectId}`);
      const imported = new Set(String(job.importedLanguages).split(",").filter(Boolean));

      for (const doc of project.documents || []) {
        const lang = doc.targetLanguage;
        if (imported.has(lang) || !TARGETS.includes(lang)) continue;
        const done = String(doc.status).toLowerCase() === "completed";
        if (!done && !now) {
          console.log(`  ${lang}: ${doc.status} — not finished yet`);
          continue;
        }
        const languageId = langIds[lang];
        if (!languageId) {
          logLine(job, `${lang}: no matching language in dotCMS — skipped`);
          continue;
        }
        const translated = JSON.parse(await exportDocument(doc.id));
        await fire(actions["Import translation"], {
          identifier: article.identifier,
          languageId,
          contentType: CONTENT_TYPE,
          site: SITE_ID,
          urlTitle: article.urlTitle,
          category: article.category,
          publishDate: dotcmsDate(article.publishDate),
          ...fromSegments(article, translated),
        });
        imported.add(lang);
        logLine(job, `${lang}: imported into dotCMS for review${done ? "" : " (partial — Smartcat not complete)"}`);
      }

      job.importedLanguages = [...imported].join(",");
      if (TARGETS.every((l) => imported.has(l))) {
        job.status = "imported";
        await fire(actions["Mark translated"], { identifier: article.identifier, languageId: 1 });
        logLine(job, "All languages imported — ready for review in dotCMS.");
      }
      await saveJob(job);
    } catch (e) {
      logLine(job, `Failed: ${e.message}`);
      await saveJob(job).catch(() => {});
    }
  }
}

async function status() {
  const jobs = await search(`+contentType:TranslationJob +conHost:${SITE_ID} +deleted:false`);
  if (!jobs.length) return console.log("No translation jobs yet.");
  for (const j of jobs) {
    console.log(`${String(j.status).padEnd(15)} ${j.title}  [imported: ${j.importedLanguages || "-"}]  ${j.smartcatUrl || ""}`);
  }
}

// ─── CLI ──────────────────────────────────────────────────────────────────

const [command, ...flags] = process.argv.slice(2);
if (!DOTCMS || !DOTCMS_TOKEN || !SITE_ID) {
  console.error("Missing dotCMS settings — run from frontend-sandler with .env.local present.");
  process.exit(1);
}
const commands = {
  send,
  pull: () => pull({ now: flags.includes("--now") }),
  sync: async () => {
    await send();
    await pull({ now: flags.includes("--now") });
  },
  status,
  // Re-run machine translation on an existing project: smartcat -- mt <projectId>
  mt: async () => {
    const job = { log: "" };
    await enableMachineTranslation(flags[0], job);
  },
};
if (!commands[command]) {
  console.log("Usage: npm run smartcat -- <send|pull [--now]|sync [--now]|status>");
  process.exit(command ? 1 : 0);
}
commands[command]().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
