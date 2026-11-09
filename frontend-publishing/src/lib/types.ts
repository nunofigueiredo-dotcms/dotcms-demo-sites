import type { BlockEditorNode, DotCMSBasicContentlet, DotCMSComposedPageResponse, DotCMSExtendedPageResponse } from "@dotcms/types";

/** A page from the dotCMS Page API (no extra GraphQL content). */
export type PageResponse = DotCMSComposedPageResponse<DotCMSExtendedPageResponse>;

/** dotCMS's base contentlet types `body` as a string; block editor fields arrive as JSON. */
type Contentlet = Omit<DotCMSBasicContentlet, "body">;

/** For the SDK's editing helpers, which take its own contentlet type (body as a string). */
export const asContentlet = <T extends Contentlet & { body?: unknown }>(c: T) =>
  c as unknown as Omit<T, "body"> & DotCMSBasicContentlet;

/** The item a URL-mapped page shows (/articles/{urlTitle}, /topics/{urlTitle}). Its
 * shape depends on the content type, so the caller says which type it expects. */
export function mappedItem<T>(page: PageResponse | undefined | null): (T & { contentType: string }) | undefined {
  return page?.pageAsset?.urlContentMap as unknown as (T & { contentType: string }) | undefined;
}

/** A category value: [{ key: "Name" }] from REST, { categories: [...] } from GraphQL. */
export type CategoryValue = Record<string, string>[] | { categories?: { key: string; name: string }[] };

/** Relationship fields arrive as one item or a list, depending on cardinality. */
export type Related<T> = T | T[] | null | undefined;

export interface MessagingSot extends Contentlet {
  title: string;
  urlTitle: string;
  sotKey: string;
  topic?: CategoryValue;
  keyMessages?: BlockEditorNode;
  proofPoints?: BlockEditorNode;
  doNotSay?: string;
  owner: string;
  version: number | string;
  approvedDate?: string;
  reviewByDate?: string;
  status: "current" | "superseded";
  supersedes?: Related<MessagingSot>;
}

export interface LocalisedMessage extends Contentlet {
  title: string;
  region: string;
  body?: BlockEditorNode;
  targetChannel: string;
  smeNeeded: "yes" | "no";
  parentSot?: Related<MessagingSot>;
}

export interface Article extends Contentlet {
  title: string;
  urlTitle: string;
  h1: string;
  standfirst: string;
  body?: BlockEditorNode;
  author?: string;
  authorRole?: string;
  topic?: CategoryValue;
  seoSummary?: string;
  /** Key/value field: question → answer */
  faq?: Record<string, string>;
  lastReviewed?: string;
  relatedSot?: Related<MessagingSot>;
}

export interface NewsletterIssue extends Contentlet {
  title: string;
  channel: "email" | "linkedin";
  issueDate: string;
  intro?: string;
  approvalStatus?: string;
}

/** Where an item is in the "Governed Content" workflow. */
export interface WorkflowState {
  step: string;
  resolved: boolean;
  /** Role id (or role name) the task is assigned to */
  assignedTo?: string;
  /** The creator's personal role id */
  createdBy?: string;
  taskId?: string;
}

export interface WorkflowComment {
  type: "WorkflowComment" | "WorkflowHistory";
  postedBy: string;
  commentDescription: string;
  createdDate: number | string;
}

/** The signed-in hub user, from their dotCMS session. */
export interface HubUser {
  userId: string;
  roleId: string;
  name: string;
  email: string;
}

export const first = <T,>(r: Related<T>): T | undefined => (Array.isArray(r) ? r[0] : r ?? undefined);
export const all = <T,>(r: Related<T>): T[] => (Array.isArray(r) ? r : r ? [r] : []);
