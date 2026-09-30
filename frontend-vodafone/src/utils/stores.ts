/** Store services, keyed by the values of the VodafoneStore Services field. */
export const STORE_SERVICES: Record<string, string> = {
  cash: "Vodafone Cash",
  lines: "New lines & migration",
  devices: "Devices & accessories",
  dsl: "Home DSL",
  business: "Business customers",
};

/** Great-circle distance in kilometres. */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

// Largest markets first, then the rest A–Z.
const GOVERNORATE_ORDER = ["Cairo", "Giza", "Alexandria"];

export function governorateRank(name: string): number {
  const i = GOVERNORATE_ORDER.indexOf(name);
  return i === -1 ? GOVERNORATE_ORDER.length : i;
}

export function compareGovernorates(a: string, b: string): number {
  return governorateRank(a) - governorateRank(b) || a.localeCompare(b);
}
