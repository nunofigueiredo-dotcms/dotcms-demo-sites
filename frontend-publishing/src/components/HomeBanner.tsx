"use client";

import { DotCMSEditableText, DotCMSLayoutBody, useEditableDotCMSPage } from "@dotcms/react";
import { useIsEditing } from "@/components/uve";
import { asContentlet, type HomeBanner as HomeBannerContent, type PageResponse } from "@/lib/types";

/**
 * The banner at the top of the Insights home page: a Home Banner contentlet placed
 * in the page's container. In the Universal Visual Editor's Edit mode its eyebrow,
 * headline and intro are edited in place; the editor's own toolbar on the banner
 * opens the full form and the workflow.
 */
function HomeBanner(banner: HomeBannerContent) {
  const editing = useIsEditing();
  const text = (field: "eyebrow" | "headline" | "intro") =>
    editing ? <DotCMSEditableText contentlet={asContentlet(banner)} fieldName={field} format="text" mode="plain" /> : banner[field];

  return (
    <section className="bg-sand">
      <div className="container-page grid items-end gap-10 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
        <div>
          <span className="accent-rule" aria-hidden />
          {(banner.eyebrow || editing) && <p className="eyebrow">{text("eyebrow")}</p>}
          <h1 className="mt-3 font-serif text-5xl font-semibold leading-[1.05] md:text-6xl">{text("headline")}</h1>
        </div>
        {(banner.intro || editing) && <p className="text-lg leading-relaxed text-ink-soft">{text("intro")}</p>}
      </div>
    </section>
  );
}

/** The home page's layout from dotCMS (one container slot holding the banner). */
export function HomeLayout({ page }: { page: PageResponse }) {
  // After an edit, UVE sends the updated page here.
  const live = useEditableDotCMSPage(page);
  return <DotCMSLayoutBody page={(live ?? page).pageAsset} components={{ PdHomeBanner: HomeBanner }} />;
}
