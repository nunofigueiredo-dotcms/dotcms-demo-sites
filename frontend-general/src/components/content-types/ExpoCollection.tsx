"use client";

import type { DotCMSBasicContentlet } from "@dotcms/types";
import { RecordCard } from "@/components/site/RecordCard";
import { SectionHeader } from "@/components/site/SectionHeader";
import { useLocale } from "@/components/site/Locale";
import { useSiteData } from "@/components/site/SiteData";
import { selectValue } from "@/utils/content";
import { collectionItems } from "@/utils/records";

/** Style editor options (dotcms/style-schemas/ExpoCollection.mjs). */
interface CollectionStyles {
  layout?: "grid" | "carousel";
  columns?: "3" | "4";
  ratio?: "portrait" | "landscape";
}

type ExpoCollectionProps = DotCMSBasicContentlet & {
  eyebrow?: string;
  heading?: string;
  intro?: string;
  source: unknown;
  category?: string;
  count?: unknown;
  theme?: "white" | "sand" | "charcoal" | "teal";
  ctaText?: string;
  ctaLink?: string;
  dotStyleProperties?: CollectionStyles;
};

/**
 * Cards for attractions, restaurants or event spaces. The section only says
 * which and how many: the cards come from the content itself, so a new
 * restaurant appears everywhere it should as soon as it's published.
 */
export default function ExpoCollection(props: ExpoCollectionProps) {
  const { t } = useLocale();
  const data = useSiteData();
  const styles = props.dotStyleProperties ?? {};
  const count = selectValue(props.count) || "all";
  const all = collectionItems(selectValue(props.source), (props.category ?? "").trim(), data);
  const items = count === "all" ? all : all.slice(0, Number(count));
  const layout = styles.layout ?? "grid";
  return (
    <section className={`section section--${props.theme ?? "white"}`}>
      <div className="container-expo">
        <SectionHeader contentlet={props} />
        {items.length ? (
          <ul
            className={`card-list card-list--${layout}`}
            style={{ "--columns": styles.columns ?? "4" } as React.CSSProperties}
          >
            {items.map((item) => (
              <li key={item.identifier}>
                <RecordCard item={item} ratio={styles.ratio ?? "portrait"} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">{t("noItems")}</p>
        )}
      </div>
    </section>
  );
}
