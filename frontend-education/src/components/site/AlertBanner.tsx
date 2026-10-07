"use client";

import { useState } from "react";
import { AlertTriangle, CloudSnow, Hand, Info, X } from "lucide-react";
import { SmartLink } from "@/components/SmartLink";
import type { SiteAlert } from "@/types/page";

const SEVERITY = {
  emergency: { Icon: AlertTriangle, label: "Emergency" },
  closure: { Icon: CloudSnow, label: "Closure" },
  info: { Icon: Info, label: "Notice" },
};

/**
 * Site-wide alerts above the header (which ones are active is decided on the
 * server, from their start and end times). Emergencies are announced at once
 * to screen readers (role="alert") and can't be dismissed; closures and
 * notices are announced politely. A notice can be dismissed for the page
 * being viewed; it shows again on the next page or reload, so nobody misses
 * it later, and nothing is stored in the browser.
 */
export function AlertBanner({ alerts, scheduledNote }: { alerts: SiteAlert[]; scheduledNote?: boolean }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const dismiss = (id: string) => setDismissed((d) => [...d, id]);

  const visible = alerts.filter((a) => a.severity !== "info" || !dismissed.includes(a.identifier));
  if (!visible.length) return null;

  return (
    <div className="alerts">
      {visible.map((alert) => {
        const { Icon, label } = SEVERITY[alert.severity] ?? SEVERITY.info;
        return (
          <div
            key={alert.identifier}
            className={`alert alert--${alert.severity}`}
            role={alert.severity === "emergency" ? "alert" : "status"}
          >
            <div className="container-tsd alert__inner">
              <Icon aria-hidden className="alert__icon h-6 w-6" />
              <p className="alert__text">
                <span className="sr-only">{label}: </span>
                <strong>{alert.title}</strong>
                {alert.message && <span> {alert.message}</span>}
                {scheduledNote && <em className="alert__scheduled"> (preview: shown on the site only between its start and end times)</em>}
              </p>
              <span className="alert__links">
                {alert.ctaText && alert.ctaLink && (
                  <SmartLink href={alert.ctaLink} className="alert__link">
                    {alert.ctaText}
                  </SmartLink>
                )}
                {alert.aslVideoUrl && (
                  <SmartLink href={alert.aslVideoUrl} className="alert__link">
                    <Hand aria-hidden className="h-4 w-4" /> Watch in ASL
                  </SmartLink>
                )}
              </span>
              {alert.severity === "info" && (
                <button type="button" className="alert__close" aria-label={`Dismiss: ${alert.title}`} onClick={() => dismiss(alert.identifier)}>
                  <X aria-hidden className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
