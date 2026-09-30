import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDotCMSPage, type PageMode } from "@/utils/getDotCMSPage";
import { buildPageMetadata } from "@/utils/seo";
import { Page } from "@/views/Page";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** The Universal Visual Editor loads pages with ?mode=EDIT_MODE or PREVIEW_MODE. */
async function pageMode(searchParams: PageProps["searchParams"]): Promise<PageMode> {
  const mode = (await searchParams).mode;
  if (mode === "EDIT_MODE") return "EDIT";
  if (mode === "PREVIEW_MODE") return "PREVIEW";
  return "LIVE";
}

function resolvePath(slug?: string[]): string {
  return `/${(slug ?? []).join("/")}`;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const path = resolvePath((await params).slug);
  // Same arguments as the page render, so React's cache() serves both from
  // one request to dotCMS.
  const pageData = await getDotCMSPage(path, await pageMode(searchParams));
  if (!pageData) return { title: "Page not found | Vodafone Egypt" };
  const page = pageData.pageAsset?.page;
  return buildPageMetadata({
    title: page?.friendlyName || page?.title,
    description: page?.seodescription,
    path,
  });
}

export default async function CatchAllPage({ params, searchParams }: PageProps) {
  const pageContent = await getDotCMSPage(resolvePath((await params).slug), await pageMode(searchParams));
  if (!pageContent) return notFound();

  const layout = pageContent.pageAsset?.layout;
  const navItems = pageContent.content?.navigation?.children ?? [];

  return (
    <>
      {layout?.header && <Header navItems={navItems} />}
      <Page pageContent={pageContent} />
      {layout?.footer && <Footer navItems={navItems} />}
    </>
  );
}
