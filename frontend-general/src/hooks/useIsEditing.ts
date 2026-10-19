"use client";

import { useSyncExternalStore } from "react";
import { getUVEState } from "@dotcms/uve";
import { UVE_MODE } from "@dotcms/types";

const noSubscribe = () => () => {};
const isEditing = () => getUVEState()?.mode === UVE_MODE.EDIT;
const isInEditor = () => getUVEState() !== undefined;

/**
 * True inside the Universal Visual Editor's Edit mode, where text fields
 * become inline-editable. Detected on the client only (the server snapshot is
 * false), so the first render matches the server and hydration stays clean.
 */
export function useIsEditing(): boolean {
  return useSyncExternalStore(noSubscribe, isEditing, () => false);
}

/** True anywhere inside the Universal Visual Editor (edit or preview). */
export function useIsInEditor(): boolean {
  return useSyncExternalStore(noSubscribe, isInEditor, () => false);
}
