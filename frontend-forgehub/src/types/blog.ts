import type { DotCMSBasicContentlet } from "@dotcms/types";

export interface BlogAuthor {
  firstName: string;
  lastName: string;
}

export interface BlogImage {
  idPath?: string;
  title?: string;
}

export interface Blog extends DotCMSBasicContentlet {
  urlTitle: string;
  urlMap: string | null;
  author: BlogAuthor[];
  image: BlogImage | null;
  description?: string;
}

import type { DotCMSURLContentMap, BlockEditorNode } from "@dotcms/types";

// add after the existing Blog interface

// DotCMSBasicContentlet has body?: string, but blog returns a BlockEditorNode at runtime.
// Use Omit to override body with the correct type.
export type BlogURLContentMap = Omit<DotCMSURLContentMap, "body"> & {
  description?: string;
  publishDate?: number;
  body?: { json: BlockEditorNode };
  image?: BlogImage;
  author?: BlogAuthor[];
};
