"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { useSiteData } from "@/components/site/SiteData";
import { SmartLink } from "@/components/SmartLink";
import { useIsInEditor } from "@/hooks/useIsEditing";
import type { Plan } from "@/types/page";
import { byDisplayOrder, formatPrice } from "@/utils/content";

type VodafonePlanListProps = DotCMSBasicContentlet & {
  heading?: string;
  intro?: string;
  /** Plan family to list, e.g. "red". */
  family: string;
};

/** "/month" by default; a word like "one-off" gets a space before it. */
function period(value?: string) {
  const p = value?.trim() || "/month";
  return p.startsWith("/") ? p : ` ${p}`;
}

// Benefits shown before "Show all benefits".
const PREVIEW = 4;

function PlanCard({ plan }: { plan: Plan }) {
  const [expanded, setExpanded] = useState(false);
  const benefits = (plan.benefits ?? "").split(/\r?\n/).filter(Boolean);
  const shown = expanded ? benefits : benefits.slice(0, PREVIEW);

  return (
    <li className="plan-card">
      {plan.badge && <span className="plan-card__badge">{plan.badge}</span>}
      <h3>{plan.title}</h3>
      <dl className="plan-card__allowance">
        {plan.data && (
          <div>
            <dt>Data</dt>
            <dd>{plan.data}</dd>
          </div>
        )}
        {plan.minutes && (
          <div>
            <dt>Minutes</dt>
            <dd>{plan.minutes}</dd>
          </div>
        )}
      </dl>
      <p className="plan-card__price">
        <span className="plan-card__currency">EGP</span> {formatPrice(plan.price)}
        <span className="plan-card__period">{period(plan.pricePeriod)}</span>
      </p>
      {plan.priceNote && <p className="plan-card__note">{plan.priceNote}</p>}
      {plan.subscriptions?.length ? (
        <div className="plan-card__subscriptions">
          <h4>
            {plan.subscriptionsIncluded
              ? `Choose ${plan.subscriptionsIncluded} of ${plan.subscriptions.length} subscriptions`
              : "Subscriptions"}
          </h4>
          <ul>
            {plan.subscriptions.map((s) => (
              <li key={s.title}>{s.title}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {benefits.length > 0 && (
        <div className="plan-card__benefits">
          <h4>Your plan benefits</h4>
          <ul>
            {shown.map((benefit) => (
              <li key={benefit}>
                <Check aria-hidden className="h-4 w-4 shrink-0 text-brand-red" /> {benefit}
              </li>
            ))}
          </ul>
          {benefits.length > PREVIEW && (
            <button type="button" className="link-red" onClick={() => setExpanded((e) => !e)}>
              {expanded ? "Show fewer benefits" : `Show all ${benefits.length} benefits`}
            </button>
          )}
        </div>
      )}
      {plan.ctaText && plan.ctaLink && (
        <SmartLink href={plan.ctaLink} className="btn btn--primary plan-card__cta">
          {plan.ctaText}
        </SmartLink>
      )}
    </li>
  );
}

/** Cards for every published plan in one family, in the plans' Order. */
export default function VodafonePlanList({ heading, intro, family }: VodafonePlanListProps) {
  const inEditor = useIsInEditor();
  const plans = useSiteData()
    .plans.filter((p) => p.family === family)
    .sort(byDisplayOrder);

  return (
    <section className="section" id="plans">
      <div className="container-vf">
        {heading && <h2 className="section__title">{heading}</h2>}
        {intro && <p className="section__intro">{intro}</p>}
        {plans.length ? (
          <ul className="plan-row">
            {plans.map((plan) => (
              <PlanCard key={plan.identifier} plan={plan} />
            ))}
          </ul>
        ) : (
          inEditor && <p className="editor-note">No published Vodafone Plans in this family yet.</p>
        )}
      </div>
    </section>
  );
}
