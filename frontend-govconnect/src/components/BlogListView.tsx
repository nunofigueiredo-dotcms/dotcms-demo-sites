import BlogCard from "@/components/content-types/BlogCard";
import type { Blog } from "@/types/blog";
import type { BlogCardShow } from "@/components/content-types/BlogList";

interface BlogListViewProps {
  blogs?: Blog[];
  show?: BlogCardShow;
}

export default function BlogListView({ blogs = [], show }: BlogListViewProps) {
  return (
    <div className="blog-list">
      {blogs.map((blog) => (
        <BlogCard key={blog.identifier} {...blog} show={show} />
      ))}
      {blogs.length === 0 && <p className="blog-list__empty">No blogs available.</p>}
    </div>
  );
}
