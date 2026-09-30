"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { BarsIcon } from "@/components/BarsIcon";
import { useCurrentCenter } from "@/components/site/CurrentCenter";
import { useSiteData } from "@/components/site/SiteData";
import { useT } from "@/components/site/Strings";

type HubSpotFormProps = DotCMSBasicContentlet & {
  portalId?: string;
  formId?: string;
  region?: "na1" | "eu1";
  heading?: string;
  intro?: string;
  /** One per line: "hubspot_property | Label | text|email|tel|textarea | required". */
  formFields?: string;
  /** HubSpot property for the chosen center; empty = append it to `message`. */
  centerProperty?: string;
  submitText?: string;
  successMessage?: string;
  consentText?: string;
};

interface FieldSpec {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea";
  required: boolean;
}

type Status = { state: "idle" | "sending" | "sent" } | { state: "error"; message: string };

const FIELD_TYPES = ["text", "email", "tel", "textarea"] as const;

function parseFields(value?: string): FieldSpec[] {
  return (value ?? "")
    .split("\n")
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter(([name]) => Boolean(name))
    .map(([name, label, type, required]) => ({
      name,
      label: label || name,
      type: (FIELD_TYPES as readonly string[]).includes(type) ? (type as FieldSpec["type"]) : "text",
      required: required === "required",
    }));
}

// HubSpot's visitor cookie, set by its tracking code if the site loads it.
function hubspotUtk(): string | undefined {
  return document.cookie.match(/(?:^|; )hubspotutk=([^;]+)/)?.[1];
}

/**
 * A dotCMS "HubSpot Form" widget. Editors set the HubSpot portal and form IDs
 * and the fields in dotCMS; submissions go directly to HubSpot's Forms API
 * (a public endpoint designed to be called from the browser). The visitor's
 * training center is sent too, so HubSpot can route the lead.
 */
export default function HubSpotForm({
  portalId,
  formId,
  region = "na1",
  heading,
  intro,
  formFields,
  centerProperty,
  submitText,
  successMessage,
  consentText,
}: HubSpotFormProps) {
  const t = useT();
  const { centers, selectedCenter } = useSiteData();
  const current = useCurrentCenter();
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const fields = parseFields(formFields);
  const connected = Boolean(portalId && formId);
  const defaultCenter = (current ?? selectedCenter)?.urlTitle ?? "";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!connected) return;
    const data = new FormData(event.currentTarget);
    const center = centers.find((c) => c.urlTitle === data.get("center"));
    const centerLabel = center ? `${center.title} (${center.city}, ${center.region})` : "";

    const values = fields.map((f) => ({ name: f.name, value: String(data.get(f.name) ?? "") }));
    if (centerLabel && centerProperty) {
      values.push({ name: centerProperty, value: centerLabel });
    } else if (centerLabel) {
      const message = values.find((v) => v.name === "message");
      if (message) message.value = `${message.value}\n\nTraining center: ${centerLabel}`.trim();
    }

    const host = region === "eu1" ? "https://api-eu1.hsforms.com" : "https://api.hsforms.com";
    setStatus({ state: "sending" });
    try {
      const response = await fetch(
        `${host}/submissions/v3/integration/submit/${portalId}/${formId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: values
              .filter((v) => v.value)
              .map((v) => ({ objectTypeId: "0-1", name: v.name, value: v.value })),
            context: { pageUri: window.location.href, pageName: document.title, hutk: hubspotUtk() },
            ...(consentText && {
              legalConsentOptions: { consent: { consentToProcess: true, text: consentText } },
            }),
          }),
        }
      );
      if (response.ok) {
        setStatus({ state: "sent" });
        return;
      }
      const body = (await response.json().catch(() => null)) as {
        message?: string;
        errors?: { message: string }[];
      } | null;
      setStatus({
        state: "error",
        message: body?.errors?.map((e) => e.message).join(" ") || body?.message || "HubSpot rejected the submission.",
      });
    } catch {
      setStatus({ state: "error", message: t("hubspot.error") });
    }
  }

  return (
    <section className="section section--muted">
      <div className="section__inner hubspot-form">
        <div>
          <p className="eyebrow">{t("hubspot.eyebrow")}</p>
          {heading && <h2>{heading}</h2>}
          {intro && <p className="hubspot-form__intro">{intro}</p>}
        </div>

        <div className="hubspot-form__card">
          {status.state === "sent" ? (
            <div className="hubspot-form__success" role="status">
              <CheckCircle2 aria-hidden className="h-10 w-10 text-brand-cyan" />
              <p>{successMessage || t("hubspot.thanks")}</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate={false}>
              {!connected && (
                <p className="hubspot-form__notice" role="note">
                  {t("hubspot.notConnected")}
                </p>
              )}
              <div className="hubspot-form__grid">
                {fields.map((f) => (
                  <label
                    key={f.name}
                    className={f.type === "textarea" ? "hubspot-form__field--wide" : undefined}
                  >
                    <span>
                      {f.label}
                      {f.required && <span aria-hidden>*</span>}
                    </span>
                    {f.type === "textarea" ? (
                      <textarea name={f.name} required={f.required} rows={4} />
                    ) : (
                      <input
                        name={f.name}
                        type={f.type}
                        required={f.required}
                        autoComplete={f.type === "email" ? "email" : f.type === "tel" ? "tel" : undefined}
                      />
                    )}
                  </label>
                ))}
                {centers.length > 0 && (
                  <label className="hubspot-form__field--wide">
                    <span>{t("hubspot.center")}</span>
                    <select name="center" defaultValue={defaultCenter}>
                      <option value="">{t("hubspot.noPreference")}</option>
                      {centers.map((c) => (
                        <option key={c.urlTitle} value={c.urlTitle}>
                          {c.city}, {c.region} — {c.title}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              {consentText && (
                <label className="hubspot-form__consent">
                  <input type="checkbox" name="consent" required />
                  <span>{consentText}</span>
                </label>
              )}

              {status.state === "error" && (
                <p className="hubspot-form__error" role="alert">
                  {status.message}
                </p>
              )}

              <button
                type="submit"
                className="btn btn--primary mt-6"
                disabled={!connected || status.state === "sending"}
              >
                {status.state === "sending" ? (
                  <>
                    <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> {t("hubspot.sending")}
                  </>
                ) : (
                  <>
                    {submitText || t("hubspot.submit")} <BarsIcon />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
