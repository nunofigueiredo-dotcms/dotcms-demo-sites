import Image from "next/image";
import { Mail, Phone, Video } from "lucide-react";
import type { StaffMember } from "@/types/page";
import { imageSrc } from "@/utils/images";

/** "(512) 555-0101" → "tel:+15125550101" */
const tel = (number: string) => `tel:+1${number.replace(/\D/g, "")}`;

/** The staff member's photo, or their initials in a circle when there isn't one. */
export function StaffAvatar({ person, size }: { person: StaffMember; size: "small" | "large" }) {
  const src = imageSrc(person.photo);
  const initials = person.title
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  return (
    <span className={`avatar avatar--${size}`} aria-hidden={!src}>
      {src ? (
        <Image src={src} alt={person.photoAlt ?? ""} fill sizes={size === "large" ? "192px" : "80px"} />
      ) : (
        initials
      )}
    </span>
  );
}

/** E-mail, voice and videophone, each a link; VP beside voice for calls in ASL. */
export function StaffContact({ person }: { person: StaffMember }) {
  return (
    <ul className="staff-contact">
      {person.email && (
        <li>
          <Mail aria-hidden className="h-4 w-4" />
          <a href={`mailto:${person.email}`}>{person.email}</a>
        </li>
      )}
      {person.phone && (
        <li>
          <Phone aria-hidden className="h-4 w-4" />
          <span className="sr-only">Voice: </span>
          <a href={tel(person.phone)}>{person.phone}</a>
        </li>
      )}
      {person.videophone && (
        <li>
          <Video aria-hidden className="h-4 w-4" />
          <abbr title="Videophone">VP</abbr>
          <a href={tel(person.videophone)}>{person.videophone}</a>
        </li>
      )}
    </ul>
  );
}
