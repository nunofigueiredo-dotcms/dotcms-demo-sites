"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { categoryColor, type Category } from "@/utils/categories";

/**
 * The selected category of a list, kept in the address (?category=KEY) so a
 * filtered list can be shared or linked to. Starts from the address when it
 * names one of `filters`; changes update it without a navigation.
 */
export function useCategoryFilter(filters: Category[], enabled: boolean): [string, (key: string) => void] {
  const requested = useSearchParams().get("category") ?? "";
  const [selected, setSelected] = useState(enabled && filters.some((c) => c.key === requested) ? requested : "");

  const select = (key: string) => {
    setSelected(key);
    const url = new URL(window.location.href);
    if (key) url.searchParams.set("category", key);
    else url.searchParams.delete("category");
    // A string: Next.js's patched replaceState doesn't accept a URL object.
    window.history.replaceState(null, "", url.toString());
  };
  return [selected, select];
}

interface CategoryFilterProps {
  label: string;
  filters: Category[];
  selected: string;
  onSelect: (key: string) => void;
}

/** "All" plus one toggle button per category, each with its colour dot. */
export function CategoryFilter({ label, filters, selected, onSelect }: CategoryFilterProps) {
  if (filters.length < 2) return null;
  return (
    <div className="category-filter" role="group" aria-label={label}>
      <button type="button" aria-pressed={!selected} onClick={() => onSelect("")}>
        All
      </button>
      {filters.map((c) => (
        <button
          key={c.key}
          type="button"
          aria-pressed={selected === c.key}
          onClick={() => onSelect(c.key)}
          style={{ "--category": categoryColor(c.key) } as React.CSSProperties}
        >
          <span className="category-chip__dot" aria-hidden />
          {c.name}
        </button>
      ))}
    </div>
  );
}

/** A category label with its colour dot. */
export function CategoryChip({ category }: { category: Category }) {
  return (
    <span className="category-chip">
      <span className="category-chip__dot" style={{ background: categoryColor(category.key) }} aria-hidden />
      {category.name}
    </span>
  );
}
