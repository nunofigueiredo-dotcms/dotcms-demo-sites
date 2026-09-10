import { DotCMSBasicContentlet } from "@dotcms/types";
import DotCMSImage, { type DotCMSImageSrc } from "@/components/DotCMSImage";

type ProductCardProps = DotCMSBasicContentlet & {
  title: string;
  description?: string;
  image?: DotCMSImageSrc;
};

export default function ProductCard({ title, description, image }: ProductCardProps) {
  return (
    <article className="card">
      {image && (
        <div className="card__image">
          <DotCMSImage src={image} alt={title || "Product"} fill={true} />
        </div>
      )}
      <div className="card__body">
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
    </article>
  );
}
