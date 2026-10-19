/**
 * English and Arabic. Pages and content come from dotCMS in the visitor's
 * language; this file only holds the interface's own words (buttons, labels,
 * category names), which aren't content.
 *
 * English pages live at /…, Arabic pages at /ar/…. Inside the Universal
 * Visual Editor the language comes from its `language_id` parameter instead.
 */
export type Locale = "en" | "ar";

export const LANGUAGE_IDS: Record<Locale, number> = {
  en: 1,
  ar: Number(process.env.NEXT_PUBLIC_DOTCMS_ARABIC_LANGUAGE_ID || 0),
};

/** The locale for a dotCMS language id (as UVE sends it). */
export function localeForLanguageId(id: string | undefined | null): Locale | undefined {
  if (!id) return undefined;
  return Number(id) === LANGUAGE_IDS.ar && LANGUAGE_IDS.ar !== 0 ? "ar" : "en";
}

/** Split "/ar/visit" into the locale and the dotCMS page path ("/visit"). */
export function splitLocale(path: string): { locale: Locale; path: string } {
  if (path === "/ar" || path.startsWith("/ar/")) return { locale: "ar", path: path.slice(3) || "/" };
  return { locale: "en", path };
}

/** A path on this site in the given locale: "/visit" → "/ar/visit". */
export function localizePath(path: string, locale: Locale): string {
  if (locale === "en") return path;
  return path === "/" ? "/ar" : `/ar${path}`;
}

/** Intl locale tags. Expo City's Arabic site writes numbers in Latin digits. */
export const INTL_LOCALE: Record<Locale, string> = { en: "en-GB", ar: "ar-AE-u-nu-latn" };

const STRINGS = {
  skipToContent: { en: "Skip to main content", ar: "تخطي إلى المحتوى الرئيسي" },
  home: { en: "Home", ar: "الرئيسية" },
  switchLanguage: { en: "عربى", ar: "English" },
  switchLanguageLabel: { en: "اقرأ هذه الصفحة بالعربية", ar: "Read this page in English" },
  openMenu: { en: "Open menu", ar: "فتح القائمة" },
  closeMenu: { en: "Close menu", ar: "إغلاق القائمة" },
  mainMenu: { en: "Main", ar: "القائمة الرئيسية" },
  announcements: { en: "What's new", ar: "ما الجديد" },
  learnMore: { en: "Learn more", ar: "اعرف المزيد" },
  bookTickets: { en: "Book tickets", ar: "احجز التذاكر" },
  makeEnquiry: { en: "Make an enquiry", ar: "تواصلوا لحجز المساحات" },
  location: { en: "Location", ar: "الموقع" },
  hours: { en: "Opening hours", ar: "أوقات العمل" },
  price: { en: "Price", ar: "السعر" },
  when: { en: "When", ar: "الموعد" },
  venue: { en: "Venue", ar: "المكان" },
  cuisine: { en: "Cuisine", ar: "المطبخ" },
  capacity: { en: "Capacity", ar: "السعة" },
  area: { en: "Area", ar: "المساحة" },
  suits: { en: "Ideal for", ar: "مناسبة لـ" },
  highlights: { en: "Highlights", ar: "أبرز المزايا" },
  next: { en: "Next", ar: "التالي" },
  all: { en: "All", ar: "الكل" },
  filterEvents: { en: "Filter events by category", ar: "تصفية الفعاليات حسب الفئة" },
  noEvents: { en: "There are no upcoming events in this category.", ar: "لا توجد فعاليات قادمة في هذه الفئة." },
  noItems: { en: "Nothing to show here yet.", ar: "لا يوجد محتوى بعد." },
  followUs: { en: "Follow us", ar: "تابعونا" },
  contact: { en: "Contact", ar: "تواصل معنا" },
  rights: { en: "Expo City Dubai. All rights reserved.", ar: "مدينة إكسبو دبي. جميع الحقوق محفوظة" },
  notFoundTitle: { en: "Page not found", ar: "الصفحة غير موجودة" },
  notFoundText: {
    en: "The page you are looking for may have moved or no longer exists.",
    ar: "ربما تم نقل الصفحة التي تبحث عنها أو أنها لم تعد موجودة.",
  },
  backHome: { en: "Go to the home page", ar: "العودة إلى الصفحة الرئيسية" },
  previous: { en: "Previous", ar: "السابق" },
  scrollNext: { en: "Next", ar: "التالي" },
} as const;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, locale: Locale): string {
  return STRINGS[key][locale];
}

/** Labels for the values of the select and checkbox fields in dotCMS. */
const OPTION_LABELS: Record<string, Record<Locale, string>> = {
  attraction: { en: "Attraction", ar: "معلم" },
  park: { en: "Park", ar: "حديقة" },
  wellness: { en: "Wellness", ar: "العافية" },
  concert: { en: "Concert", ar: "حفلة موسيقية" },
  family: { en: "Family", ar: "عائلي" },
  workshop: { en: "Workshop", ar: "ورشة عمل" },
  festival: { en: "Festival", ar: "مهرجان" },
  sports: { en: "Sports", ar: "رياضة" },
  culture: { en: "Culture", ar: "ثقافة" },
  restaurant: { en: "Restaurant", ar: "مطعم" },
  cafe: { en: "Café", ar: "مقهى" },
  lounge: { en: "Lounge", ar: "لاونج" },
  flagship: { en: "Flagship venue", ar: "وجهة رئيسية" },
  weddings: { en: "Weddings & social events", ar: "حفلات الزفاف والمناسبات الاجتماعية" },
  meetings: { en: "Meetings & conferences", ar: "الاجتماعات والمؤتمرات" },
  fitness: { en: "Fitness & wellness", ar: "اللياقة البدنية والعافية" },
  festivals: { en: "Festivals & events", ar: "المهرجانات والفعاليات" },
};

export function optionLabel(value: string, locale: Locale): string {
  return OPTION_LABELS[value]?.[locale] ?? value;
}
