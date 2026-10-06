"use client";

import { useState, useSyncExternalStore } from "react";
import { AlertTriangle, CloudSnow, Hand, Info, X } from "lucide-react";
import { SmartLink } from "@/components/SmartLink";
import type { SiteAlert } from "@/types/page";

const SEVERITY = {
  emergency: { Icon: AlertTriangle, label: "Emergency" },
  closure: { Icon: CloudSnow, label: "Closure" },
  info: { Icon: Info, label: "Notice" },
};

const DISMISSED = "tsd-dismissed-alerts";
const noSubscribe = () => () => {};

/**
 * The dismissed notices, as stored. Storage can be blocked — e.g. inside the
 * dotCMS editor's iframe, where reading sessionStorage throws — so this must
 * never fail, or the whole page would.
 */
function storedDismissed(): string {
  try {
    return sessionStorage.getItem(DISMISSED) ?? "[]";
  } catch {
    return "[]";
  }
}

function readDismissed(): string[] {
  try {
    return JSON.parse(storedDismissed());
  } catch {
    return [];
  }
}

/**
 * Site-wide alerts above the header (which ones are active is decided on the
 * server, from their start and end times). Emergencies are announced at once
 * to screen readers (role="alert") and can't be dismissed; closures and
 * notices are announced politely, and notices can be dismissed for the visit.
 */
function parseList(value: string): string[] {
  try {
    const list = JSON.parse(value);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function AlertBanner({ alerts, scheduledNote }: { alerts: SiteAlert[]; scheduledNote?: boolean }) {
  // Dismissed notices, from this browser tab only ([] during the server render).
  const stored = useSyncExternalStore(noSubscribe, storedDismissed, () => "[]");
  const [dismissedNow, setDismissedNow] = useState<string[]>([]);
  const dismissed = [...parseList(stored), ...dismissedNow];

  const dismiss = (id: string) => {
    try {
      sessionStorage.setItem(DISMISSED, JSON.stringify([...readDismissed(), id]));
    } catch {
      // Private mode: dismiss for this page view only.
    }
    setDismissedNow((d) => [...d, id]);
  };

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
