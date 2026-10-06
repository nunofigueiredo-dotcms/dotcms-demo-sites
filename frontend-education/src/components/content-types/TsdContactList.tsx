import { Phone, Printer, Video } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { parseLines } from "@/utils/content";

type TsdContactListProps = DotCMSBasicContentlet & {
  heading?: string;
  intro?: string;
  /** One per line: Office | Description | Voice | Videophone (VP) | Fax */
  items: string;
};

/** "(512) 462-5353" → "tel:+15124625353" */
function tel(number: string) {
  return `tel:+1${number.replace(/\D/g, "")}`;
}

/**
 * Office contact cards. Videophone (VP) numbers sit beside voice numbers,
 * because many families and staff call by video in ASL.
 */
export default function TsdContactList({ heading, intro, items }: TsdContactListProps) {
  const offices = parseLines(items, 5);
  return (
    <section className="section section--mist">
      <div className="container-tsd">
        {heading && <h2 className="section__title">{heading}</h2>}
        {intro && <p className="section__intro">{intro}</p>}
        <ul className="contact-list">
          {offices.map(([office, description, voice, vp, fax]) => (
            <li key={office} className="contact-card">
              <h3>{office}</h3>
              {description && <p className="contact-card__description">{description}</p>}
              <dl>
                {voice && (
                  <div>
                    <dt>
                      <Phone aria-hidden className="h-4 w-4" /> Voice
                    </dt>
                    <dd>
                      <a href={tel(voice)}>{voice}</a>
                    </dd>
                  </div>
                )}
                {vp && (
                  <div>
                    <dt>
                      <Video aria-hidden className="h-4 w-4" /> <abbr title="Videophone">VP</abbr>
                    </dt>
                    <dd>
                      <a href={tel(vp)}>{vp}</a>
                    </dd>
                  </div>
                )}
                {fax && (
                  <div>
                    <dt>
                      <Printer aria-hidden className="h-4 w-4" /> Fax
                    </dt>
                    <dd>{fax}</dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
