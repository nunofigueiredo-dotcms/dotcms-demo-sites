"use client";

import { Link, useLocalizedPush } from "@/components/site/Locale";
import { Navigation, Phone } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { useCurrentCenter } from "@/components/site/CurrentCenter";
import { useSiteData } from "@/components/site/SiteData";
import { CenterCard } from "@/components/site/CenterCard";
import { centerHref, centerShortName, directionsHref, telHref } from "@/utils/centers";
import { useT } from "@/components/site/Strings";

type SandlerLocalCenterProps = DotCMSBasicContentlet & {
  heading?: string;
  fallbackText?: string;
};

/**
 * Personalised block. On a center's own pages it shows that center; elsewhere
 * it shows the visitor's chosen center, or asks them to pick one. The same
 * contentlet renders differently for every center and visitor.
 */
export default function SandlerLocalCenter({ heading, fallbackText }: SandlerLocalCenterProps) {
  const t = useT();
  const { centers, selectedCenter, selectCenter } = useSiteData();
  const current = useCurrentCenter();
  const push = useLocalizedPush();
  const center = current ?? selectedCenter;

  return (
    <section className="section section--light">
      <div className="section__inner">
        <div className="local-center">
          <div>
            <p className="eyebrow">{current ? current.title : t("center.nearYou")}</p>
            {heading && <h2>{heading}</h2>}
            {center ? (
              <p>
                {center.summary} {t("center.programsNote")}
              </p>
            ) : (
              fallbackText && <p>{fallbackText}</p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              {current ? (
                <>
                  {current.phone && (
                    <a href={telHref(current.phone)} className="btn btn--primary">
                      <Phone aria-hidden className="h-4 w-4" /> {t("center.call", { phone: current.phone })}
                    </a>
                  )}
                  <a
                    href={directionsHref(current)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn--outline"
                  >
                    <Navigation aria-hidden className="h-4 w-4" /> {t("center.directions")}
                  </a>
                </>
              ) : center ? (
                <>
                  <Link href={centerHref(center)} className="btn btn--primary">
                    {t("center.visit", { city: centerShortName(center) })}
                  </Link>
                  <Link href="/locations" className="btn btn--outline">
                    {t("center.change")}
                  </Link>
                </>
              ) : (
                <Link href="/locations" className="btn btn--primary">
                  {t("center.find")}
                </Link>
              )}
            </div>
          </div>

          {center ? (
            <CenterCard center={center} detailed />
          ) : (
            <div className="local-center__picker">
              <p className="font-semibold mb-3">{t("center.popular")}</p>
              <div className="flex flex-wrap gap-2">
                {centers.slice(0, 6).map((c) => (
                  <button
                    key={c.urlTitle}
                    type="button"
                    className="chip"
                    onClick={() => {
                      selectCenter(c);
                      push(centerHref(c));
                    }}
                  >
                    {centerShortName(c)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
