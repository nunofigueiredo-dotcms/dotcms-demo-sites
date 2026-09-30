"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Star } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { BarsIcon } from "@/components/BarsIcon";
import { useCurrentCenter } from "@/components/site/CurrentCenter";
import { useSiteData } from "@/components/site/SiteData";
import { useT } from "@/components/site/Strings";

type SandlerReviewFormProps = DotCMSBasicContentlet & {
  heading?: string;
  intro?: string;
  successMessage?: string;
};

type Status = { state: "idle" | "sending" | "sent" } | { state: "error"; message: string };

/**
 * "Write a Review", as on go.sandler.com. Submissions go to /api/reviews,
 * which saves them in dotCMS as unpublished testimonials for this center;
 * they appear on the site once an editor publishes them.
 */
export default function SandlerReviewForm({ heading, intro, successMessage }: SandlerReviewFormProps) {
  const t = useT();
  const { selectedCenter } = useSiteData();
  const center = useCurrentCenter() ?? selectedCenter;
  const [rating, setRating] = useState(0);
  const [status, setStatus] = useState<Status>({ state: "idle" });

  if (!center) return null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setStatus({ state: "sending" });
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, rating, center: center!.urlTitle }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || t("review.error"));
      setStatus({ state: "sent" });
    } catch (e) {
      setStatus({ state: "error", message: (e as Error).message });
    }
  }

  return (
    <section className="section section--muted">
      <div className="section__inner hubspot-form">
        <div>
          <p className="eyebrow">{center.title}</p>
          {heading && <h2>{heading}</h2>}
          {intro && <p className="hubspot-form__intro">{intro}</p>}
        </div>
        <div className="hubspot-form__card">
          {status.state === "sent" ? (
            <div className="hubspot-form__success" role="status">
              <CheckCircle2 aria-hidden className="h-10 w-10 text-brand-cyan" />
              <p>{successMessage || t("review.thanks")}</p>
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              <fieldset className="review-stars">
                <legend>{t("review.rating")}</legend>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={t(n > 1 ? "review.stars" : "review.star", { n })}
                    aria-pressed={rating === n}
                    onClick={() => setRating(n)}
                  >
                    <Star aria-hidden className={`h-7 w-7 ${n <= rating ? "fill-current" : ""}`} />
                  </button>
                ))}
              </fieldset>
              <div className="hubspot-form__grid">
                <label>
                  <span>{t("review.name")}<span aria-hidden>*</span></span>
                  <input name="name" required maxLength={120} autoComplete="name" />
                </label>
                <label>
                  <span>{t("review.city")}</span>
                  <input name="city" maxLength={80} autoComplete="address-level2" />
                </label>
                <label>
                  <span>{t("review.region")}</span>
                  <input name="region" maxLength={80} autoComplete="address-level1" />
                </label>
                <label>
                  <span>{t("review.email")}</span>
                  <input name="email" type="email" maxLength={200} autoComplete="email" />
                </label>
                <label className="hubspot-form__field--wide">
                  <span>{t("review.headline")}<span aria-hidden>*</span></span>
                  <input name="headline" required maxLength={120} />
                </label>
                <label className="hubspot-form__field--wide">
                  <span>{t("review.quote")}<span aria-hidden>*</span></span>
                  <textarea name="quote" required rows={5} maxLength={2000} />
                </label>
                {/* Spam trap: hidden from people, often filled in by bots. */}
                <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
              </div>
              <p className="mt-3 text-xs text-brand-slate">
                {t("review.emailNote")}
              </p>
              {status.state === "error" && (
                <p className="hubspot-form__error" role="alert">{status.message}</p>
              )}
              <button type="submit" className="btn btn--primary mt-6" disabled={status.state === "sending"}>
                {status.state === "sending" ? (
                  <>
                    <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> {t("review.sending")}
                  </>
                ) : (
                  <>
                    {t("review.submit")} <BarsIcon />
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
