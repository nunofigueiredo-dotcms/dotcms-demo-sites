import type { DotCMSFile, Resource } from "@/types/page";
import { checkboxValues } from "./content";

export const AUDIENCES: Record<string, string> = {
  families: "Families",
  students: "Students",
  staff: "Staff",
  public: "Public",
};

export function audiences(resource: Resource): string[] {
  return checkboxValues(resource.audience);
}

/**
 * The attached file. GraphQL gives the whole file; on a resource's own page
 * the page data has only part of it, so the library data fills it in.
 */
export function resourceFile(resource: Resource, all: Resource[]): DotCMSFile | undefined {
  const doc = resource.document;
  if (!doc) return undefined;
  if (typeof doc === "object" && doc.fileAsset) return doc;
  const known = all.find((r) => r.identifier === resource.identifier)?.document;
  if (known && typeof known === "object") return known;
  return typeof doc === "string" ? { identifier: doc } : doc;
}

/** "/dA/…/board-policy-fd.pdf" (served through this site's /dA rewrite), without "?language_id=1". */
export function fileHref(file: DotCMSFile): string {
  return (file.fileAsset?.idPath ?? `/dA/${file.identifier}`).split("?")[0];
}

/** 232148 → "227 KB" */
export function fileSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** What a resource is: a document, a link elsewhere, or an article here. */
export function resourceKind(resource: Resource): "document" | "link" | "article" {
  if (resource.document) return "document";
  if (resource.externalUrl) return "link";
  return "article";
}
