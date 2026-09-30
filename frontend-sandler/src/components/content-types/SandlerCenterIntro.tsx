"use client";

import { ChevronRight } from "lucide-react";
import { DotCMSEditableText } from "@dotcms/react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { Link } from "@/components/site/Locale";
import { useCurrentCenter } from "@/components/site/CurrentCenter";
import { useIsEditing } from "@/hooks/useIsEditing";
import { centerSolutions, solutionKey } from "@/utils/centers";
import { useT } from "@/components/site/Strings";

type SandlerCenterIntroProps = DotCMSBasicContentlet & {
  eyebrow?: string;
  heading?: string;
  intro?: string;
};

/** A center's introduction, beside the solutions it offers (the center's
 *  "Solutions offered" checkboxes decide the list). */
export default function SandlerCenterIntro(props: SandlerCenterIntroProps) {
  const t = useT();
  const { eyebrow, heading, intro } = props;
  const center = useCurrentCenter();
  const editing = useIsEditing();
  const solutions = center ? centerSolutions(center) : [];

  return (
    <section className="section section--light">
      <div className="section__inner center-intro">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          {editing ? (
            <>
              <div className="center-intro__heading">
                <DotCMSEditableText contentlet={props} fieldName="heading" />
              </div>
              <div className="center-intro__lead">
                <DotCMSEditableText contentlet={props} fieldName="intro" />
              </div>
            </>
          ) : (
            <>
              {heading && <h2>{heading}</h2>}
              {intro && <p className="center-intro__lead">{intro}</p>}
            </>
          )}
        </div>
        {solutions.length > 0 && (
          <div className="center-solutions">
            <h3>{t("center.ourSolutions")}</h3>
            <ul>
              {solutions.map((solution) => (
                <li key={solution.label}>
                  <Link href={solution.href}>
                    <ChevronRight aria-hidden className="h-5 w-5 text-brand-cyan shrink-0" />
                    {t(solutionKey(solution.slug), undefined, solution.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
