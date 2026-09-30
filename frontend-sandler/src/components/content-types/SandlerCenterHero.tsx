"use client";

import type { DotCMSBasicContentlet } from "@dotcms/types";
import { CenterHero } from "@/components/site/CenterHero";
import { useCurrentCenter } from "@/components/site/CurrentCenter";
import { useIsEditing, useIsInEditor } from "@/hooks/useIsEditing";
import type { TrainingCenter } from "@/types/page";
import { useT } from "@/components/site/Strings";

type SandlerCenterHeroProps = DotCMSBasicContentlet & {
  headline?: string;
  subtitle?: string;
};

const SAMPLE_CENTER: TrainingCenter = {
  title: "{{franchisee}}",
  urlTitle: "",
  city: "City",
  region: "State",
  country: "US",
  address: "Street address, City, State ZIP",
  phone: "(555) 010-0100",
};

/**
 * Hero for a training center's own page (/locations/{center}). The headline
 * and subtitle are this section's; the address, phone and buttons come from
 * the center whose page it is.
 */
export default function SandlerCenterHero(props: SandlerCenterHeroProps) {
  const t = useT();
  const current = useCurrentCenter();
  const editing = useIsEditing();
  const inEditor = useIsInEditor();
  // On the template page (no center of its own) the editor shows sample
  // details, so the headline and subtitle can still be edited in place.
  const center = current ?? (inEditor ? SAMPLE_CENTER : undefined);
  if (!center) {
    return editing ? (
      <p className="section__inner py-10 text-brand-slate">
        Center hero — shows the center&apos;s details on a /locations/&lt;center&gt; page.
      </p>
    ) : null;
  }
  return (
    <CenterHero
      center={center}
      headline={props.headline || t("center.headline", { city: center.city })}
      subtitle={props.subtitle}
      editable={editing ? { contentlet: props, headline: "headline", subtitle: "subtitle" } : undefined}
    />
  );
}
