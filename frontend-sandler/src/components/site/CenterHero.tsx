"use client";

import { Check, MapPin, Navigation, Phone } from "lucide-react";
import { DotCMSEditableText } from "@dotcms/react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { BarsIcon } from "@/components/BarsIcon";
import { Link, useLocale } from "@/components/site/Locale";
import { useSiteData } from "@/components/site/SiteData";
import type { TrainingCenter } from "@/types/page";
import { centerHref, countryName, directionsHref, telHref } from "@/utils/centers";
import { useT } from "@/components/site/Strings";

interface CenterHeroProps {
  center: TrainingCenter;
  headline: string;
  subtitle?: string;
  /** In the editor's Edit mode: the contentlet and fields to edit inline.
   *  DotCMSEditableText mounts TinyMCE as a block element, which isn't
   *  valid inside <h1>/<p>, so the texts render in <div>s then. */
  editable?: { contentlet: DotCMSBasicContentlet; headline: string; subtitle: string };
}

/** The top of a training center's page: headline, calls to action and the
 *  center's contact card. */
export function CenterHero({ center, headline, subtitle, editable }: CenterHeroProps) {
  const t = useT();
  const locale = useLocale();
  const { centers, selectedCenter, selectCenter } = useSiteData();
  const isSelected = selectedCenter?.urlTitle === center.urlTitle;
  // Select from the loaded list so the context holds the same object shape.
  const listed = centers.find((c) => c.urlTitle === center.urlTitle) ?? center;

  return (
    <section className="hero hero--compact">
      <div className="hero__inner center-hero">
        <div>
          <p className="eyebrow eyebrow--light">
            {t("center.eyebrow", { city: center.city, region: center.region })}
          </p>
          {editable ? (
            <>
              <div className="hero__title">
                <DotCMSEditableText contentlet={editable.contentlet} fieldName={editable.headline as never} />
              </div>
              <div className="hero__subtitle">
                <DotCMSEditableText contentlet={editable.contentlet} fieldName={editable.subtitle as never} />
              </div>
            </>
          ) : (
            <>
              <h1>{headline}</h1>
              {subtitle && <p className="hero__subtitle">{subtitle}</p>}
            </>
          )}
          <div className="hero__actions">
            <Link href={`${centerHref(center)}/contact-us`} className="btn btn--white">
              {t("nav.letsConnect")} <BarsIcon />
            </Link>
            {isSelected ? (
              <span className="hero__selected">
                <Check aria-hidden className="h-5 w-5" /> {t("center.isMine")}
              </span>
            ) : (
              <button type="button" className="btn btn--outline-light" onClick={() => selectCenter(listed)}>
                {t("center.makeMine")}
              </button>
            )}
          </div>
        </div>

        <aside className="center-contact">
          <p className="eyebrow">{countryName(center.country, locale)}</p>
          <h2>{center.title}</h2>
          {center.address && (
            <p className="center-contact__line">
              <MapPin aria-hidden className="h-5 w-5 shrink-0" />
              {center.address}
            </p>
          )}
          {center.phone && (
            <p className="center-contact__line">
              <Phone aria-hidden className="h-5 w-5 shrink-0" />
              <a href={telHref(center.phone)}>{center.phone}</a>
            </p>
          )}
          <a
            href={directionsHref(center)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--primary mt-6"
          >
            <Navigation aria-hidden className="h-4 w-4" /> {t("center.directions")}
          </a>
        </aside>
      </div>
    </section>
  );
}
