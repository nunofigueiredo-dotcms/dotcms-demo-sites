// German (de-DE) for the DACH localised message. Instance-wide, approved by Nuno.
// Teardown removes it only if this build created it.
import { api, must, record, step, log } from "./lib/api.mjs";

export async function run() {
  await step("Language de-DE", async () => {
    const langs = (await api("GET", "/api/v2/languages")).entity || [];
    const de = langs.find((l) => l.isoCode === "de-de");
    if (de) return log(`  de-DE exists -> ${de.id}`);
    const e = must(
      await api("POST", "/api/v2/languages", {
        languageCode: "de",
        countryCode: "DE",
        language: "German",
        country: "Germany",
      }),
      "language de-DE",
    );
    record("language", "de-de", e.id);
    log(`  de-DE created -> ${e.id}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) await run();
