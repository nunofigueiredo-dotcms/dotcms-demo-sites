"use client";

import Image from "next/image";
import { Smartphone } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { useSiteData } from "@/components/site/SiteData";
import { useIsInEditor } from "@/hooks/useIsEditing";
import { formatPrice } from "@/utils/content";
import { imageSrc } from "@/utils/images";

type VodafoneDeviceListProps = DotCMSBasicContentlet & {
  heading?: string;
  intro?: string;
  /** Instalment months, e.g. "12". */
  months?: string;
};

/** Cards for every published Vodafone Device, with the monthly instalment. */
export default function VodafoneDeviceList({ heading, intro, months = "12" }: VodafoneDeviceListProps) {
  const inEditor = useIsInEditor();
  // Flagships first.
  const devices = [...useSiteData().devices].sort(
    (a, b) => Number(b.price.replace(/,/g, "")) - Number(a.price.replace(/,/g, ""))
  );
  const term = Number(months) || 12;

  return (
    <section className="section">
      <div className="container-vf">
        {heading && <h2 className="section__title">{heading}</h2>}
        {intro && <p className="section__intro">{intro}</p>}
        {devices.length ? (
          <ul className="device-grid">
            {devices.map((device) => {
              const src = imageSrc(device.image);
              const total = Number(device.price.replace(/,/g, ""));
              return (
                <li key={device.identifier} className="device-card">
                  {device.badge && <span className="plan-card__badge">{device.badge}</span>}
                  <div className="device-card__image">
                    {src ? (
                      <Image src={src} alt="" fill sizes="240px" />
                    ) : (
                      <Smartphone aria-hidden className="h-20 w-20 text-brand-red" strokeWidth={1} />
                    )}
                  </div>
                  <p className="device-card__brand">{device.brand}</p>
                  <h3>{device.title}</h3>
                  {device.storage && <p className="device-card__storage">{device.storage}</p>}
                  <p className="device-card__monthly">
                    <span className="plan-card__currency">EGP</span> {formatPrice(String(Math.ceil(total / term)))}
                    <span className="plan-card__period">/month</span>
                  </p>
                  <p className="device-card__total">
                    for {term} months at 0% · or EGP {formatPrice(device.price)}
                  </p>
                  <a className="btn btn--primary" href="https://eshop.vodafone.com.eg/en/" target="_blank" rel="noopener">
                    Buy with instalments
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          inEditor && <p className="editor-note">No published Vodafone Devices yet.</p>
        )}
      </div>
    </section>
  );
}
