import type { SandlerArticleSummary, TrainingCenter } from "@/types/page";
import type { BlockField } from "@/utils/blocks";

/** Shapes of `urlContentMap` on the two URL-mapped detail pages. */
export type TrainingCenterDetail = TrainingCenter & {
  contentType: "TrainingCenter";
  /** The center page's main heading; "Sales Training in {city}" if empty. */
  headline?: string;
  intro?: string;
  body?: BlockField;
  /** One per line: "Title | Description". */
  benefits?: string;
  /** One per line. */
  awards?: string;
};

export type SandlerArticle = Omit<SandlerArticleSummary, "publishDate"> & {
  contentType: "SandlerArticle";
  /** Epoch ms from the page API, or a date string. */
  publishDate: string | number;
  body?: BlockField;
};
