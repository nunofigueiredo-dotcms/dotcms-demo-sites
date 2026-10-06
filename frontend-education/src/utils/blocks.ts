import type { BlockEditorNode } from "@dotcms/types";

/**
 * A Block Editor (StoryBlock) field. Depending on the dotCMS version and API,
 * it arrives as an object or as a JSON string — newer versions return a
 * string in the page API's _map.
 */
export type BlockField = BlockEditorNode | string;

export function toBlocks(body: BlockField | undefined | null): BlockEditorNode | undefined {
  if (!body) return undefined;
  if (typeof body !== "string") return body;
  try {
    return JSON.parse(body) as BlockEditorNode;
  } catch {
    return undefined;
  }
}
