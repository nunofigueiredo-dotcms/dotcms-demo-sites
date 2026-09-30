"use client";

import { Phone } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { LocationSelector } from "./LocationSelector";
import { useSiteData } from "./SiteData";
import { centerShortName, telHref } from "@/utils/centers";
import { useT } from "@/components/site/Strings";

/** Top bar above the main header, as on sandler.com: secondary information
 *  on the left, language and LOCATIONS on the right. */
export function UtilityBar() {
  const t = useT();
  const { selectedCenter } = useSiteData();

  return (
    <div className="utility-bar">
      <div className="utility-bar__inner">
        <p className="hidden md:flex items-center gap-2">
          {selectedCenter?.phone ? (
            <>
              <Phone aria-hidden className="h-3.5 w-3.5 text-brand-cyan" />
              {t("brand.utilityCenter", { city: centerShortName(selectedCenter) })}
              <a href={telHref(selectedCenter.phone)}>{selectedCenter.phone}</a>
            </>
          ) : (
            t("brand.tagline")
          )}
        </p>
        <div className="utility-bar__actions">
          <LanguageSwitcher />
          <LocationSelector />
        </div>
      </div>
    </div>
  );
}
