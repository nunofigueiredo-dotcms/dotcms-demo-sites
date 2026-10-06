import Link from "next/link";
import { ArrowLeft, Languages, MapPin } from "lucide-react";
import { DotCMSBlockEditorRenderer } from "@dotcms/react";
import type { StaffMember } from "@/types/page";
import { CategoryChip } from "@/components/site/CategoryFilter";
import { StaffAvatar, StaffContact } from "@/components/site/StaffContact";
import { toBlocks } from "@/utils/blocks";
import { toCategories } from "@/utils/categories";

/** A staff profile at /staff/{urlTitle}: the URL-mapped TsdStaff contentlet. */
export function StaffProfile({ person }: { person: StaffMember }) {
  const bio = toBlocks(person.bio);
  const departments = toCategories(person.departments);
  return (
    <article>
      <header className="page-banner page-banner--navy page-banner--left">
        <div className="container-tsd profile__header">
          <StaffAvatar person={person} size="large" />
          <div>
            <p className="eyebrow eyebrow--light">{departments.map((c) => c.name).join(" · ") || "Staff"}</p>
            <h1>{person.title}</h1>
            <p className="page-banner__subtitle">{person.jobTitle}</p>
          </div>
        </div>
      </header>
      <div className="section section--white">
        <div className="container-tsd profile">
          <aside className="profile__card" aria-label="Contact">
            <h2>Contact</h2>
            <StaffContact person={person} />
            {person.languages && (
              <p className="profile__fact">
                <Languages aria-hidden className="h-4 w-4" /> {person.languages}
              </p>
            )}
            {person.office && (
              <p className="profile__fact">
                <MapPin aria-hidden className="h-4 w-4" /> {person.office}
              </p>
            )}
            {departments.length > 0 && (
              <p className="staff-card__departments">
                {departments.map((c) => (
                  <CategoryChip key={c.key} category={c} />
                ))}
              </p>
            )}
          </aside>
          <div className="prose-tsd">
            <h2>About {person.title.split(" ")[0]}</h2>
            {bio && <DotCMSBlockEditorRenderer blocks={bio} />}
            <p>
              <Link href="/staff" className="text-link">
                <ArrowLeft aria-hidden className="h-4 w-4" /> Staff Directory
              </Link>
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
