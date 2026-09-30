import type { DotCMSBasicContentlet } from "@dotcms/types";
import { TestimonialCard } from "@/components/site/TestimonialCard";

type SandlerTestimonialProps = DotCMSBasicContentlet & {
  quote: string;
  name?: string;
  role?: string;
  headline?: string;
  rating?: string;
};

/**
 * A single testimonial placed directly on a page (e.g. dropped onto the home
 * page in the Universal Visual Editor). Lists of testimonials use
 * SandlerTestimonialList instead.
 */
export default function SandlerTestimonial({ quote, name, role, headline, rating }: SandlerTestimonialProps) {
  if (!quote) return null;
  return (
    <section className="section section--light">
      <div className="section__inner">
        <ul className="testimonial-grid testimonial-grid--single">
          <TestimonialCard testimonial={{ quote, name, role, headline, rating }} />
        </ul>
      </div>
    </section>
  );
}
