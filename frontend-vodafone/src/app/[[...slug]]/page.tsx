import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import type { Metadata } from "next";
import { getDotCMSPage, type PageMode } from "@/utils/getDotCMSPage";
import { PERSONA_COOKIE, PERSONAS, isPersona, resolvePersona } from "@/utils/personaTargeting";
import { PersonaBadge } from "@/components/site/PersonaBadge";
import { buildPageMetadata } from "@/utils/seo";
import { Page } from "@/views/Page";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** The visitor's persona (see utils/personaTargeting.ts), or undefined for the default page. */
async function pagePersona(searchParams: PageProps["searchParams"]): Promise<string | undefined> {
  const params = await searchParams;
  const { persona } = resolvePersona({
    editorPersona: first(params["com.dotmarketing.persona.id"]) ?? first(params.personaId),
    override: first(params.persona),
    utmCampaign: first(params.utm_campaign),
    utmSource: first(params.utm_source),
    country: (await headers()).get("x-vercel-ip-country"),
    cookie: (await cookies()).get(PERSONA_COOKIE)?.value,
  });
  return persona;
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
  const pageData = await getDotCMSPage(path, await pageMode(searchParams), await pagePersona(searchParams));
  if (!pageData) return { title: "Page not found | Vodafone Egypt" };
  const page = pageData.pageAsset?.page;
  return buildPageMetadata({
    title: page?.friendlyName || page?.title,
    description: page?.seodescription,
    path,
  });
}

export default async function CatchAllPage({ params, searchParams }: PageProps) {
  const mode = await pageMode(searchParams);
  const persona = await pagePersona(searchParams);
  const pageContent = await getDotCMSPage(resolvePath((await params).slug), mode, persona);
  if (!pageContent) return notFound();

  const layout = pageContent.pageAsset?.layout;
  const navItems = pageContent.content?.navigation?.children ?? [];

  return (
    <>
      {layout?.header && <Header navItems={navItems} />}
      <Page pageContent={pageContent} />
      {layout?.footer && <Footer navItems={navItems} />}
      {mode === "LIVE" && isPersona(persona) && <PersonaBadge name={PERSONAS[persona]} />}
    </>
  );
}
