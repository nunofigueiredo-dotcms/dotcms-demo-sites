"use client";

import { ArrowUpRight } from "lucide-react";
import type { SiteSettings } from "@/types/page";
import { parseLines } from "@/utils/content";
import { SmartLink } from "../SmartLink";
import { useLocale } from "./Locale";

/** The "what's new" strip under the header, from the site settings' Announcements. */
export function Announcements({ settings }: { settings?: SiteSettings }) {
  const { t } = useLocale();
  const items = parseLines(settings?.announcements ?? "", 3);
  if (!items.length) return null;
  return (
    <aside className="announcements" aria-label={t("announcements")}>
      <ul className="container-expo announcements__list">
        {items.map(([label, text, link]) => (
          <li key={`${label}-${text}`}>
            {link ? (
              <SmartLink href={link} className="announcements__item">
                <span className="announcements__label">{label}</span>
                <span>{text}</span>
                <ArrowUpRight aria-hidden className="h-4 w-4 flip-rtl" />
              </SmartLink>
            ) : (
              <span className="announcements__item">
                <span className="announcements__label">{label}</span>
                <span>{text}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
