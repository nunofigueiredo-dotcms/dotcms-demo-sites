export const CHANNEL_LABELS: Record<string, string> = {
  web: "Web",
  pdf: "PDF",
  email: "Email",
  "linkedin-newsletter": "LinkedIn newsletter",
  "paid-social": "Paid social",
  "organic-social": "Organic social",
  linkedin: "LinkedIn",
};

export const EXTERNAL_CHANNELS = ["linkedin-newsletter", "paid-social", "organic-social", "linkedin"];

export const REGION_LABELS: Record<string, string> = {
  dach: "DACH",
  iberia: "Iberia",
  apac: "APAC",
  "uk-ireland": "UK & Ireland",
  "north-america": "North America",
  latam: "LATAM",
};

const LANGUAGE_NAMES: Record<string, string> = {
  "en-us": "English",
  "de-de": "German",
  "es-es": "Spanish",
  "fr-fr": "French",
  "pt-pt": "Portuguese",
  "ar-ae": "Arabic",
};
export const languageName = (iso?: string) => (iso ? LANGUAGE_NAMES[iso] ?? iso : "");

/** "2026-10-01 00:00:00.0" or an epoch → "1 October 2026" */
export function formatDate(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return "";
  const d = typeof value === "number" ? new Date(value) : new Date(String(value).replace(" ", "T").replace(/\.\d+$/, ""));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** Categories arrive as [{ key: "Name" }] from REST and as { categories: [{ key, name }] }
 * from the Page API's GraphQL. Both give the first topic's key and name here. */
type TopicValue = Record<string, string>[] | { categories?: { key: string; name: string }[] } | undefined;
function firstTopic(topic: TopicValue): { key: string; name: string } | undefined {
  if (!topic) return undefined;
  if (Array.isArray(topic)) {
    const [entry] = topic;
    return entry ? { key: Object.keys(entry)[0], name: Object.values(entry)[0] } : undefined;
  }
  return topic.categories?.[0];
}
export const topicKey = (topic: TopicValue) => firstTopic(topic)?.key;
export const topicName = (topic: TopicValue) => firstTopic(topic)?.name;

/** Workflow step → badge tone */
export function stepTone(step?: string): "neutral" | "info" | "warning" | "success" | "external" {
  switch (step) {
    case "SME Review":
    case "Messaging Owner Approval":
      return "warning";
    case "Approved":
      return "info";
    case "Published to Web":
      return "success";
    case "Ready for External Channel":
      return "external";
    default:
      return "neutral";
  }
}

/** The first paragraph of a block editor document, as plain text (for summaries). */
export function firstParagraph(node: unknown): string {
  const doc = node as { content?: { type: string; content?: unknown[] }[] } | null | undefined;
  const para = doc?.content?.find((n) => n.type === "paragraph");
  return para ? blockText(para).trim() : "";
}

/** Plain text of a block editor document (for search snippets and PDFs). */
export function blockText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { text?: string; content?: unknown[] };
  return (n.text ?? "") + (n.content ?? []).map(blockText).join(" ");
}
