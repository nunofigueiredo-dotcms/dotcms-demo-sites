"use client";

import { useSyncExternalStore } from "react";
import { DotCMSBlockEditorRenderer, useEditableDotCMSPage } from "@dotcms/react";
import { getUVEState } from "@dotcms/uve";
import { UVE_MODE, type BlockEditorNode } from "@dotcms/types";
import type { PageResponse } from "@/lib/types";

const noSubscribe = () => () => {};

/** True inside the Universal Visual Editor's Edit mode. Client-only (false on the
 * server), so the first render matches the server and hydration stays clean. */
export function useIsEditing(): boolean {
  return useSyncExternalStore(noSubscribe, () => getUVEState()?.mode === UVE_MODE.EDIT, () => false);
}

/** Connects a page to the Universal Visual Editor when it is open in it
 * (navigation, reloads after edits). Does nothing on the public site. */
export function UveBridge({ page }: { page: PageResponse }) {
  useEditableDotCMSPage(page);
  return null;
}

/** Block editor content; dotCMS may send it as JSON or as a JSON string. */
export function Blocks({ value, className }: { value?: BlockEditorNode | string | null; className?: string }) {
  const blocks = typeof value === "string" ? safeParse(value) : value;
  if (!blocks) return null;
  return <DotCMSBlockEditorRenderer blocks={blocks} className={className} />;
}

function safeParse(s: string): BlockEditorNode | null {
  try {
    return JSON.parse(s) as BlockEditorNode;
  } catch {
    return null;
  }
}
