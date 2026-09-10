import DotCMSImage from "@/components/DotCMSImage";
import Link from "next/link";
import type { Blog } from "@/types/blog";
import type { BlogCardShow } from "@/components/content-types/BlogList";

export default function BlogCard(blog: Blog & { show?: BlogCardShow }) {
  const { title, image, urlMap, modDate, urlTitle, description, show } = blog;

  return (
    <article className="blog-card">
      {(show?.image ?? true) && image && (
        <Link href={urlMap || "#"}>
          <DotCMSImage src={image} alt={urlTitle || title || ""} fill={true} />
        </Link>
      )}
      <div className="blog-card__body">
        <a href={urlMap || "#"}>{title}</a>
        {(show?.description ?? true) && description && <p>{description}</p>}
        <footer>
          {(show?.date ?? true) && modDate && (
            <time>{new Date(modDate).toLocaleDateString("en-US")}</time>
          )}
        </footer>
      </div>
    </article>
  );
}
