import { Facebook, Globe, Instagram, Linkedin, Twitter, Youtube, type LucideIcon } from "lucide-react";
import { parseLines } from "@/utils/content";

const ICONS: Record<string, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  x: Twitter,
  twitter: Twitter,
  linkedin: Linkedin,
};

export interface SocialLink {
  label: string;
  href: string;
  Icon: LucideIcon;
}

/** "Facebook | https://…" lines from TSD Site Settings, with each network's icon. */
export function socialLinks(value: string | null | undefined): SocialLink[] {
  return parseLines(value ?? undefined, 2)
    .filter(([label, href]) => label && href)
    .map(([label, href]) => ({ label, href, Icon: ICONS[label.toLowerCase()] ?? Globe }));
}

/** "Label | link" lines, as used by the top bar and the footer columns. */
export function links(value: string | null | undefined): { title: string; href: string }[] {
  return parseLines(value ?? undefined, 2)
    .filter(([title, href]) => title && href)
    .map(([title, href]) => ({ title, href }));
}
