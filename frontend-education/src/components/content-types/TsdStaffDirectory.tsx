"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { CategoryChip, CategoryFilter, useCategoryFilter } from "@/components/site/CategoryFilter";
import { useSiteData } from "@/components/site/SiteData";
import { StaffAvatar, StaffContact } from "@/components/site/StaffContact";
import { useIsInEditor } from "@/hooks/useIsEditing";
import { distinctCategories, toCategories } from "@/utils/categories";
import { isChecked } from "@/utils/content";

type TsdStaffDirectoryProps = DotCMSBasicContentlet & {
  heading?: string;
  intro?: string;
  /** "Only these departments": a category field; empty lists everyone. */
  departments?: unknown;
  /** Options checkbox: "search", "filter". */
  options?: unknown;
};

/** Lower-case, without accents, so "tomas" finds "Tomás". */
const fold = (value: string) => value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Staff cards with contact details, linking to each profile, sorted by last
 * name. Editors can limit it to departments (e.g. the Outreach team on the
 * Outreach page) and turn on a search box and department filter buttons.
 */
export default function TsdStaffDirectory({ heading, intro, departments, options }: TsdStaffDirectoryProps) {
  const inEditor = useIsInEditor();
  const scope = toCategories(departments).map((c) => c.key);
  const people = useSiteData()
    .staff.filter((p) => !scope.length || toCategories(p.departments).some((c) => scope.includes(c.key)))
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.title.localeCompare(b.title));
  const showSearch = isChecked(options, "search");
  const showFilter = isChecked(options, "filter");
  const filters = distinctCategories(people.map((p) => toCategories(p.departments)));
  const [department, selectDepartment] = useCategoryFilter(filters, showFilter);
  const [query, setQuery] = useState("");

  const terms = fold(query).split(/\s+/).filter(Boolean);
  const matches = people.filter((p) => {
    const depts = toCategories(p.departments);
    if (department && !depts.some((c) => c.key === department)) return false;
    const haystack = fold([p.title, p.jobTitle, p.languages ?? "", ...depts.map((c) => c.name)].join(" "));
    return terms.every((t) => haystack.includes(t));
  });

  if (!people.length) {
    return inEditor ? <p className="editor-note">No published staff{scope.length ? " in the chosen departments" : ""}.</p> : null;
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
        {showSearch && (
          <div className="staff-search">
            <label htmlFor="staff-search">Search staff</label>
            <div className="staff-search__field">
              <Search aria-hidden className="h-5 w-5" />
              <input
                id="staff-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, job, department or language"
                autoComplete="off"
              />
            </div>
          </div>
        )}
        {showFilter && (
          <CategoryFilter label="Filter staff by department" filters={filters} selected={department} onSelect={selectDepartment} />
        )}
        {(showSearch || showFilter) && (
          <p className="staff-count" role="status">
            {matches.length} of {people.length} staff
          </p>
        )}
        <ul className="staff-grid">
          {matches.map((person) => (
            <li key={person.identifier} className="staff-card">
              <StaffAvatar person={person} size="small" />
              <div className="staff-card__body">
                <h3>
                  <Link href={`/staff/${person.urlTitle}`}>{person.title}</Link>
                </h3>
                <p className="staff-card__job">{person.jobTitle}</p>
                <p className="staff-card__departments">
                  {toCategories(person.departments).map((c) => (
                    <CategoryChip key={c.key} category={c} />
                  ))}
                </p>
                <StaffContact person={person} />
              </div>
            </li>
          ))}
        </ul>
        {matches.length === 0 && <p className="event-list__empty">No staff match your search.</p>}
      </div>
    </section>
  );
}
