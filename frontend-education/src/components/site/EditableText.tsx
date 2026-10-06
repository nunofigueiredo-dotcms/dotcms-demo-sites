"use client";

import { DotCMSEditableText } from "@dotcms/react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { useIsEditing } from "@/hooks/useIsEditing";

interface EditableTextProps<T extends DotCMSBasicContentlet> {
  contentlet: T;
  field: keyof T & string;
}

/**
 * A text field that editors can change in place in the Universal Visual
 * Editor's Edit mode. Everywhere else it renders the plain value.
 */
export function EditableText<T extends DotCMSBasicContentlet>({ contentlet, field }: EditableTextProps<T>) {
  const editing = useIsEditing();
  if (editing) return <DotCMSEditableText contentlet={contentlet} fieldName={field} />;
  const value = contentlet[field];
  return <>{typeof value === "string" ? value : null}</>;
}
