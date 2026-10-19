/** Structured data for search and AI answer engines (see utils/jsonld.ts). */
export function JsonLd({ data }: { data: object | object[] }) {
  // "<" is escaped so content can't close the script tag.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
