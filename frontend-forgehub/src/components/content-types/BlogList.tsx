import { dotCMSClient } from "@/utils/dotCMSClient";
import BlogListView from "@/components/BlogListView";
import type { Blog } from "@/types/blog";
import type { DotCMSBasicContentlet } from "@dotcms/types";

export interface BlogCardShow {
  image: boolean;
  date: boolean;
  description: boolean;
}

type BlogListProps = DotCMSBasicContentlet & {
  quantity?: number;
  show?: string;
};

export default async function BlogList(props: BlogListProps) {
  const result = await dotCMSClient.content
    .getCollection<Blog>("Blog")
    .limit(props.quantity ?? 0);

  const show: BlogCardShow = {
    image: props.show?.includes("image") ?? true,
    date: props.show?.includes("date") ?? true,
    description: props.show?.includes("description") ?? true,
  };

  return <BlogListView blogs={result.contentlets} show={show} />;
}
