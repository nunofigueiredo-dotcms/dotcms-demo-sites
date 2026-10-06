import { ChevronDown } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { parseLines } from "@/utils/content";

type TsdFaqProps = DotCMSBasicContentlet & {
  heading?: string;
  intro?: string;
  /** One per line: Question | Answer */
  items: string;
};

/** Expandable questions and answers. */
export default function TsdFaq({ heading, intro, items }: TsdFaqProps) {
  const questions = parseLines(items, 2);
  return (
    <section className="section section--white">
      <div className="container-tsd faq">
        {heading && <h2 className="section__title">{heading}</h2>}
        {intro && <p className="section__intro">{intro}</p>}
        <div className="faq__list">
          {questions.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <ChevronDown aria-hidden className="faq__chevron h-5 w-5" />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
