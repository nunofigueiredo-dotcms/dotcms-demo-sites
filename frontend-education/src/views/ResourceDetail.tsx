"use client";

import Link from "next/link";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { DotCMSBlockEditorRenderer } from "@dotcms/react";

import { useSiteData } from "@/components/site/SiteData";
import type { Resource } from "@/types/page";
import { toBlocks } from "@/utils/blocks";
import { toCategories } from "@/utils/categories";
import { monthYear } from "@/utils/dates";
import { AUDIENCES, audiences, fileHref, fileSize, resourceFile } from "@/utils/resources";

/** A knowledge base entry at /resources/{urlTitle}: the URL-mapped TsdResource. */
export function ResourceDetail({ resource }: { resource: Resource }) {
  const all = useSiteData().resources;
  const file = resourceFile(resource, all);
  const body = toBlocks(resource.body);
  const owner = toCategories(resource.ownerDepartment)[0];
  const size = fileSize(file?.fileAsset?.size);
  const details = [resource.documentDescription, size].filter(Boolean).join(", ");

  return (
    <article>
      <header className="page-banner page-banner--navy page-banner--left">
        <div className="container-tsd page-banner__inner">
          <div className="page-banner__text">
            <p className="eyebrow eyebrow--light">Resources</p>
            <h1>{resource.title}</h1>
            <p className="page-banner__subtitle">{resource.summary}</p>
          </div>
        </div>
      </header>
      <div className="section section--white">
        <div className="container-tsd profile">
          <aside className="profile__card" aria-label="About this resource">
            {file && (
              <a href={fileHref(file)} className="btn btn--primary w-full" download>
                <Download aria-hidden className="h-5 w-5" /> Download{details && ` (${details})`}
              </a>
            )}
            {resource.externalUrl && (
              <a href={resource.externalUrl} className="btn btn--primary w-full" target="_blank" rel="noopener">
                Open on tsd.texas.gov <ExternalLink aria-hidden className="h-4 w-4" />
              </a>
            )}
            <dl className="resource-facts">
              {resource.lastReviewed && (
                <div>
                  <dt>Last reviewed</dt>
                  <dd>{monthYear(resource.lastReviewed)}</dd>
                </div>
              )}
              {owner && (
                <div>
                  <dt>Kept up to date by</dt>
                  <dd>{owner.name}</dd>
                </div>
              )}
              {audiences(resource).length > 0 && (
                <div>
                  <dt>For</dt>
                  <dd>{audiences(resource).map((a) => AUDIENCES[a] ?? a).join(", ")}</dd>
                </div>
              )}
            </dl>
            <p className="staff-card__departments">
              {toCategories(resource.topics).map((c) => (
                <Link key={c.key} href={`/resources?category=${c.key}`} className="category-chip category-chip--link">
                  {c.name}
                </Link>
              ))}
            </p>
          </aside>
          <div className="prose-tsd">
            {body && <DotCMSBlockEditorRenderer blocks={body} />}
            <p>
              <Link href="/resources" className="text-link">
                <ArrowLeft aria-hidden className="h-4 w-4" /> All resources
              </Link>
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

