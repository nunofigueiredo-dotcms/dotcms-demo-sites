// Build the whole publishing demo, in order. Safe to re-run: every step looks
// items up by name or key first and only creates what is missing.
//
//   node run-all.mjs --dry-run
//   node run-all.mjs
//   PUBLISHING_FRONTEND=https://<vercel-app>.vercel.app node run-all.mjs   (points UVE at Vercel)
const steps = [
  "01-language.mjs", "02-site.mjs", "03-categories.mjs", "04-roles-users.mjs", "05-workflow.mjs",
  "06-pages.mjs", "07-content-types.mjs", "08-seed.mjs", "09-frontend-env.mjs",
];
for (const s of steps) {
  const mod = await import(`./${s}`);
  await mod.run();
}
console.log("\nAll steps done.");
