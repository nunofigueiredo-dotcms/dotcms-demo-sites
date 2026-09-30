"use client";

import { Link } from "@/components/site/Locale";
import { MapPin, Phone } from "lucide-react";
import type { TrainingCenter } from "@/types/page";
import { centerHref, centerSolutions, solutionKey, telHref } from "@/utils/centers";
import { useT } from "@/components/site/Strings";

interface CenterCardProps {
  center: TrainingCenter;
  /** Show the full program list (used for the selected center). */
  detailed?: boolean;
}

/** Contact details for one training center. */
export function CenterCard({ center, detailed = false }: CenterCardProps) {
  const t = useT();
  const programs = centerSolutions(center).map((s) => t(solutionKey(s.slug), undefined, s.label));

  return (
    <div className="center-card">
      <h3>
        <Link href={centerHref(center)}>{center.title}</Link>
      </h3>
      {center.address && (
        <p className="center-card__line">
          <MapPin aria-hidden className="h-4 w-4 text-primary shrink-0" />
          {center.address}
        </p>
      )}
      {center.phone && (
        <p className="center-card__line">
          <Phone aria-hidden className="h-4 w-4 text-primary shrink-0" />
          <a href={telHref(center.phone)}>{center.phone}</a>
        </p>
      )}
      {detailed && center.summary && <p className="mt-3">{center.summary}</p>}
      {detailed && programs.length > 0 && (
        <ul className="center-card__programs">
          {programs.map((program) => (
            <li key={program}>{program}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
