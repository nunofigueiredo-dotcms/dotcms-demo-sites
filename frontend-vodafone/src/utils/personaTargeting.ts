/**
 * Persona targeting for the Vodafone Egypt personalization demo.
 *
 * dotCMS rules on telcodemo.com assign the same personas ("Persona: …" in
 * the Rules screen), but rules only run for pages dotCMS serves itself. This
 * site renders pages with Next.js and calls the page API server-side with a
 * token, so dotCMS never sees the visitor: the site resolves the triggers
 * here and asks dotCMS for the persona's version of the page.
 *
 * Keep the campaign values in sync with the dotCMS rules
 * (docs/vodafone-personalization.py → RULES).
 */

export const PERSONA_COOKIE = "vf_persona";

/** Persona key tags; the page API accepts a key tag as the persona. */
export const PERSONAS = {
  VodafoneTourist: "Tourist / Visitor to Egypt",
  VodafoneSocialPrepaid: "Young Social-First Prepaid",
  VodafoneDeviceShopper: "Device Shopper",
} as const;

export type PersonaKey = keyof typeof PERSONAS;

export function isPersona(value: string | undefined | null): value is PersonaKey {
  return Boolean(value && value in PERSONAS);
}

/** Pages whose visit makes someone a device shopper (unless they already have a persona). */
export const DEVICE_PAGES = "/devices";

// utm_campaign values are matched by "contains"; none may be a substring of
// another persona's, or two rules would both match one link.
const CAMPAIGNS: Record<PersonaKey, readonly string[]> = {
  VodafoneTourist: ["airport", "visit-egypt"],
  VodafoneSocialPrepaid: ["social-unlimited"],
  VodafoneDeviceShopper: ["device-instalments"],
};
// utm_source values are matched exactly.
const SOURCES: Record<string, PersonaKey> = {
  travel: "VodafoneTourist",
  tiktok: "VodafoneSocialPrepaid",
  instagram: "VodafoneSocialPrepaid",
  facebook: "VodafoneSocialPrepaid",
};

/** Persona from campaign parameters, or undefined. */
export function personaFromCampaign(campaign?: string | null, source?: string | null): PersonaKey | undefined {
  const c = campaign?.toLowerCase();
  if (c) {
    for (const [persona, values] of Object.entries(CAMPAIGNS) as [PersonaKey, readonly string[]][]) {
      if (values.some((v) => c.includes(v))) return persona;
    }
  }
  return source ? SOURCES[source.toLowerCase()] : undefined;
}

/**
 * Browsing from outside Egypt makes a visitor a tourist. Off by default, so
 * a demo presented from abroad still shows the default page; the dotCMS
 * rule shows the same condition. Turn on with PERSONA_GEO=true (the country
 * comes from Vercel's x-vercel-ip-country header).
 */
export function personaFromCountry(country?: string | null): PersonaKey | undefined {
  if (process.env.PERSONA_GEO !== "true" || !country) return undefined;
  return country.toUpperCase() === "EG" ? undefined : "VodafoneTourist";
}

export interface PersonaSignals {
  /** What the Universal Visual Editor sends when previewing a persona. */
  editorPersona?: string | null;
  /** ?persona=VodafoneTourist to drive a demo, ?persona=reset to clear. */
  override?: string | null;
  utmCampaign?: string | null;
  utmSource?: string | null;
  country?: string | null;
  cookie?: string | null;
}

/**
 * The persona for a request, in precedence order: the editor's preview, the
 * ?persona= override, campaign parameters, location, then the visit's cookie.
 * `reset` means clear the cookie and show the default page.
 */
export function resolvePersona(s: PersonaSignals): { persona?: string; reset?: boolean } {
  if (s.editorPersona) return { persona: s.editorPersona };
  if (s.override === "reset") return { reset: true };
  if (isPersona(s.override)) return { persona: s.override };
  const assigned = personaFromCampaign(s.utmCampaign, s.utmSource) ?? personaFromCountry(s.country);
  if (assigned) return { persona: assigned };
  return isPersona(s.cookie) ? { persona: s.cookie } : {};
}
