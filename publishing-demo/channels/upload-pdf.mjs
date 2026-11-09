// Upload (or replace) the article PDF in dotCMS at /files/pdfs on the
// publishing-demo site, so the article page's "Download PDF" serves it.
// This is a write, so it uses the admin token (setup/lib/api.mjs), not the
// read-only one.
import { readFileSync } from "node:fs";
import { api, fireSystem, record, siteId, search, URL_BASE } from "../setup/lib/api.mjs";

export async function uploadPdf(path, fileName, title) {
  const site = await siteId();
  const form = new FormData();
  form.append("file", new Blob([readFileSync(path)], { type: "application/pdf" }), fileName);
  const up = await api("POST", "/api/v1/temp", form, { headers: { Origin: URL_BASE } });
  const tempId = up.tempFiles?.[0]?.id;
  if (!tempId) throw new Error(`PDF upload failed: ${JSON.stringify(up).slice(0, 200)}`);
  const [existing] = await search(`+contentType:FileAsset +conHost:${site} +FileAsset.fileName:${fileName}`, { limit: 1 });
  const r = await fireSystem("PUBLISH", {
    ...(existing ? { identifier: existing.identifier } : {}),
    contentType: "FileAsset", hostFolder: `${site}:/files/pdfs`, title: `${title} (PDF)`,
    fileName, fileAsset: tempId, languageId: 1,
  });
  if (!r.entity?.identifier) throw new Error(`PDF save failed: ${JSON.stringify(r).slice(0, 200)}`);
  if (!existing) record("content", `FileAsset:${fileName}`, r.entity.identifier, { type: "FileAsset" });
  console.log(`  uploaded       → dotCMS /files/pdfs/${fileName} (${existing ? "replaced" : "new"}); the article page links to it`);
}
