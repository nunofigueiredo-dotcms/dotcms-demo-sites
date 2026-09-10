import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDotCMSPage } from "@/utils/getDotCMSPage";
import { blogDetailGraphQL } from "@/utils/queries";
import { buildPageMetadata } from "@/utils/seo";
import { DetailPage } from "@/views/DetailPage";
import type { BlogURLContentMap } from "@/types/blog";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const path = `/blog/${slug.join("/")}`;

  try {
    const pageData = await getDotCMSPage(path, blogDetailGraphQL);
    if (!pageData) return { title: "Not found" };

    const urlContentMap = pageData.pageAsset?.urlContentMap as BlogURLContentMap | undefined;
    const title = urlContentMap?.title ? `${urlContentMap.title} - Blog` : "Blog";
    return buildPageMetadata({
      title,
      description: urlContentMap?.description,
      path,
      type: "article",
    });
  } catch {
    return { title: "Not found" };
  }
}

export default async function BlogDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const path = `/blog/${slug.join("/")}`;

  const pageContent = await getDotCMSPage(path, blogDetailGraphQL);
  if (!pageContent) return notFound();

  const layout = pageContent.pageAsset?.layout;
  const navItems = pageContent.content?.navigation?.children ?? [];

  return (
    <>
      {layout?.header && (
        <Header navItems={navItems} />
      )}
      <DetailPage pageContent={pageContent} />
      {layout?.footer && <Footer />}
    </>
  );
}
