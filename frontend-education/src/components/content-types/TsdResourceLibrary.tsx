"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, ExternalLink, FileText, Search } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { CategoryChip, CategoryFilter, useCategoryFilter } from "@/components/site/CategoryFilter";
import { useSiteData } from "@/components/site/SiteData";
import { useIsInEditor } from "@/hooks/useIsEditing";
import type { Resource } from "@/types/page";
import { distinctCategories, toCategories } from "@/utils/categories";
import { checkboxValues, isChecked } from "@/utils/content";
import { monthYear, olderThan } from "@/utils/dates";
import { AUDIENCES, audiences, resourceKind } from "@/utils/resources";

type TsdResourceLibraryProps = DotCMSBasicContentlet & {
  heading?: string;
  intro?: string;
  /** "Only these topics": a category field; empty lists every topic. */
  topics?: unknown;
  /** "Only for": audience checkbox; empty for everyone. */
  audience?: unknown;
  /** Options checkbox: "search", "filter", "audience". */
  options?: unknown;
};

const fold = (value: string) => value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

const KIND = {
  document: { Icon: FileText, label: "Document" },
  link: { Icon: ExternalLink, label: "On another site" },
  article: { Icon: BookOpen, label: "Article" },
};

/**
 * The knowledge base: help articles and documents, searchable and filterable
 * by topic and audience, A to Z. Each shows when it was last reviewed; in the
 * editor, entries not reviewed for a year are flagged.
 */
export default function TsdResourceLibrary({ heading, intro, topics, audience, options }: TsdResourceLibraryProps) {
  const inEditor = useIsInEditor();
  const scope = toCategories(topics).map((c) => c.key);
  const forAudiences = checkboxValues(audience);
  const all = useSiteData()
    .resources.filter((r) => !scope.length || toCategories(r.topics).some((c) => scope.includes(c.key)))
    .filter((r) => !forAudiences.length || audiences(r).some((a) => forAudiences.includes(a)))
    .sort((a, b) => a.title.localeCompare(b.title));
  const showSearch = isChecked(options, "search");
  const showFilter = isChecked(options, "filter");
  const showAudience = isChecked(options, "audience");
  const filters = distinctCategories(all.map((r) => toCategories(r.topics)));
  const [topic, selectTopic] = useCategoryFilter(filters, showFilter);
  const [query, setQuery] = useState("");
  const [who, setWho] = useState("");

  const terms = fold(query).split(/\s+/).filter(Boolean);
  const matches = all.filter((r: Resource) => {
    const rTopics = toCategories(r.topics);
    if (topic && !rTopics.some((c) => c.key === topic)) return false;
    if (who && !audiences(r).includes(who)) return false;
    const haystack = fold([r.title, r.summary, ...rTopics.map((c) => c.name)].join(" "));
    return terms.every((t) => haystack.includes(t));
  });

  if (!all.length) {
    return inEditor ? <p className="editor-note">No published resources in the chosen topics.</p> : null;
  }

  return (
    <section className="section section--white">
      <div className="container-tsd">
        {(heading || intro) && (
          <header className="section__header">
            {heading && <h2 className="section__title">{heading}</h2>}
            {intro && <p className="section__intro">{intro}</p>}
          </header>
        )}
        <div className="library-tools">
          {showSearch && (
            <div className="staff-search">
              <label htmlFor="resource-search">Search resources</label>
              <div className="staff-search__field">
                <Search aria-hidden className="h-5 w-5" />
                <input
                  id="resource-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. tours, transcripts, weather"
                  autoComplete="off"
                />
              </div>
            </div>
          )}
          {showAudience && (
            <div className="library-audience">
              <label htmlFor="resource-audience">Show resources for</label>
              <select id="resource-audience" value={who} onChange={(e) => setWho(e.target.value)}>
                <option value="">Everyone</option>
                {Object.entries(AUDIENCES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {showFilter && <CategoryFilter label="Filter resources by topic" filters={filters} selected={topic} onSelect={selectTopic} />}
        {(showSearch || showFilter || showAudience) && (
          <p className="staff-count" role="status">
            {matches.length} of {all.length} resources
          </p>
        )}
        <ul className="resource-list">
          {matches.map((r) => {
            const { Icon, label } = KIND[resourceKind(r)];
            const overdue = inEditor && olderThan(r.lastReviewed, 12);
            return (
              <li key={r.identifier} className="resource-card">
                <span className="resource-card__icon" title={label}>
                  <Icon aria-hidden className="h-6 w-6" />
                </span>
                <div>
                  <h3>
                    <Link href={`/resources/${r.urlTitle}`}>{r.title}</Link>
                    <span className="sr-only"> ({label})</span>
                  </h3>
                  <p className="resource-card__summary">{r.summary}</p>
                  <p className="resource-card__meta">
                    {toCategories(r.topics).map((c) => (
                      <CategoryChip key={c.key} category={c} />
                    ))}
                    {audiences(r).length > 0 && <span>For {audiences(r).map((a) => AUDIENCES[a] ?? a).join(", ")}</span>}
                    {r.lastReviewed && <span>Reviewed {monthYear(r.lastReviewed)}</span>}
                    {overdue && <span className="resource-card__overdue">Review overdue</span>}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        {matches.length === 0 && <p className="event-list__empty">No resources match. Try another word or topic.</p>}
      </div>
    </section>
  );
}
