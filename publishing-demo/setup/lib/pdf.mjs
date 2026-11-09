// HTML (a file or a URL) → PDF with headless Google Chrome.
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((p) => p && existsSync(p));

export function htmlToPdf({ html, url }, outPath) {
  if (!CHROME) throw new Error("Google Chrome not found (set CHROME_PATH)");
  let target = url;
  if (html) {
    const dir = mkdtempSync(join(tmpdir(), "pd-pdf-"));
    target = join(dir, "page.html");
    writeFileSync(target, html);
  }
  execFileSync(CHROME, [
    "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=8000",
    `--print-to-pdf=${outPath}`, target,
  ], { stdio: "ignore", timeout: 60000 });
  if (!existsSync(outPath)) throw new Error(`PDF not written: ${outPath}`);
  return outPath;
}
