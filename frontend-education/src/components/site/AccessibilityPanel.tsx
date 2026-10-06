"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronDown, RefreshCw, XCircle } from "lucide-react";
import { useIsInEditor } from "@/hooks/useIsEditing";

interface Issue {
  field: string;
  message: string;
}
interface SectionReport {
  identifier: string;
  title: string;
  errors: Issue[];
  warnings: Issue[];
}
interface PageReport {
  errors: number;
  sections: SectionReport[];
}

/**
 * Shown only inside the dotCMS editor: the accessibility problems in this
 * page's sections, from the same rules the workflow enforces on Submit for
 * review and Publish. Editors fix them as they go instead of finding out at
 * submit time.
 */
export function AccessibilityPanel({ version }: { version?: unknown }) {
  const inEditor = useIsInEditor();
  const pathname = usePathname();
  const [report, setReport] = useState<PageReport | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  const check = useCallback(async () => {
    try {
      const res = await fetch(`/api/accessibility?path=${encodeURIComponent(pathname)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setReport(await res.json());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [pathname]);

  // Re-check whenever the editor sends the page again (after each change):
  // `version` is the page data, a new object each time.
  useEffect(() => {
    if (!inEditor) return;
    const timer = setTimeout(check, 400);
    return () => clearTimeout(timer);
  }, [inEditor, check, version]);

  if (!inEditor || (!report && !failed)) return null;

  const withIssues = (report?.sections ?? []).filter((s) => s.errors.length || s.warnings.length);
  const warnings = withIssues.reduce((n, s) => n + s.warnings.length, 0);
  const errors = report?.errors ?? 0;

  return (
    <aside className={`a11y-panel ${errors ? "a11y-panel--errors" : ""}`} aria-label="Accessibility check">
      <button type="button" className="a11y-panel__summary" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {failed ? (
          <AlertTriangle aria-hidden className="h-5 w-5" />
        ) : errors ? (
          <XCircle aria-hidden className="h-5 w-5" />
        ) : (
          <CheckCircle2 aria-hidden className="h-5 w-5" />
        )}
        <span>
          {failed
            ? "Accessibility check unavailable"
            : errors
              ? `${errors} accessibility ${errors === 1 ? "problem" : "problems"} to fix`
              : "Accessibility: no problems"}
          {!failed && warnings > 0 && ` · ${warnings} ${warnings === 1 ? "suggestion" : "suggestions"}`}
        </span>
        <ChevronDown aria-hidden className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="a11y-panel__body">
          {withIssues.length === 0 && !failed && (
            <p>Every section passes. Submit for review and Publish will go through.</p>
          )}
          {withIssues.map((s) => (
            <section key={s.identifier}>
              <h3>{s.title}</h3>
              <ul>
                {s.errors.map((i) => (
                  <li key={i.field + i.message} className="a11y-panel__error">
                    <strong>{i.field}:</strong> {i.message}
                  </li>
                ))}
                {s.warnings.map((i) => (
                  <li key={i.field + i.message} className="a11y-panel__warning">
                    <strong>{i.field}:</strong> {i.message}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {errors > 0 && <p className="a11y-panel__note">Problems block Submit for review and Publish until they&rsquo;re fixed.</p>}
          <button type="button" className="a11y-panel__recheck" onClick={check}>
            <RefreshCw aria-hidden className="h-4 w-4" /> Check again
          </button>
        </div>
      )}
    </aside>
  );
}
