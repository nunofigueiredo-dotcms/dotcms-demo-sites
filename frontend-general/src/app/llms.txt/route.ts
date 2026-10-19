import { absoluteUrl } from "@/utils/seo";
import { siteIndex, type IndexedPage } from "@/utils/siteIndex";

export const revalidate = 300;

const GROUPS: [string, string | undefined][] = [
  ["Pages", undefined],
  ["Attractions and parks", "ExpoAttraction"],
  ["Events and workshops", "ExpoEvent"],
  ["Restaurants and cafés", "ExpoRestaurant"],
  ["Event spaces", "ExpoVenue"],
];

const line = (p: IndexedPage) =>
  `- [${p.title}](${absoluteUrl(p.path)})${p.description ? `: ${p.description.replace(/\s+/g, " ")}` : ""}`;

/**
 * /llms.txt (llmstxt.org): a plain-text map of the site for AI assistants
 * and answer engines, built from the published content in dotCMS, so it is
 * always as current as the site.
 */
export async function GET() {
  const pages = await siteIndex();
  const sections = GROUPS.map(([heading, type]) => {
    const items = pages.filter((p) => p.contentType === type);
    return items.length ? `## ${heading}\n\n${items.map(line).join("\n")}` : "";
  }).filter(Boolean);
  const body = [
    "# Expo City Dubai",
    "",
    "> The new centre of Dubai's future, built on the legacy of Expo 2020 Dubai: attractions, " +
      "events, parks, dining and event spaces. Entry to the city is free. Every page is also " +
      `available in Arabic under ${absoluteUrl("/ar")}.`,
    "",
    ...sections.flatMap((s) => [s, ""]),
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
