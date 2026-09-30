#!/usr/bin/env node
/**
 * Push the Universal Visual Editor style schemas in dotcms/style-schemas/ to
 * dotCMS. Each schema is normalised with the SDK's own
 * defineStyleEditorSchema (so the format is exactly what UVE expects) and
 * stored as a JSON string in its content type's metadata under
 * DOT_STYLE_EDITOR_SCHEMA — where dotCMS reads it when rendering a page in
 * edit mode.
 *
 *   npm run style-schemas
 *
 * Requires the UVE style editor feature flag (FEATURE_FLAG_UVE_STYLE_EDITOR)
 * on the dotCMS instance.
 */
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { defineStyleEditorSchema } from "@dotcms/uve/internal";

const DOTCMS = (process.env.NEXT_PUBLIC_DOTCMS_HOST || "").replace(/\/$/, "");
const TOKEN = process.env.NEXT_PUBLIC_DOTCMS_AUTH_TOKEN;
const METADATA_KEY = "DOT_STYLE_EDITOR_SCHEMA";
const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "dotcms", "style-schemas");

async function dotcms(method, path, body) {
  const res = await fetch(`${DOTCMS}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

if (!DOTCMS || !TOKEN) {
  console.error("Missing dotCMS settings — run from frontend-vodafone with .env.local present.");
  process.exit(1);
}

for (const file of readdirSync(dir).filter((f) => f.endsWith(".mjs"))) {
  const form = (await import(pathToFileURL(join(dir, file)).href)).default;
  const schema = defineStyleEditorSchema(form);
  const type = (await dotcms("GET", `/api/v1/contenttype/id/${schema.contentType}`)).entity;
  const fields = schema.sections.reduce((n, s) => n + s.fields.length, 0);

  type.metadata = { ...(type.metadata || {}), [METADATA_KEY]: JSON.stringify(schema) };
  const saved = (await dotcms("PUT", `/api/v1/contenttype/id/${type.id}`, type)).entity;
  const stored = saved?.metadata?.[METADATA_KEY];
  console.log(`${schema.contentType}: ${fields} style options ${stored ? "saved" : "NOT saved"}`);
}
