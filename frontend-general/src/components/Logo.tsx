import Image from "next/image";
import type { Locale } from "@/utils/i18n";

// Expo City Dubai's wordmark (public/), in colour or white for dark backgrounds.
const LOGOS = {
  en: { color: "/logo-en.png", white: "/logo-en-white.png", width: 263, height: 124 },
  ar: { color: "/logo-ar.png", white: "/logo-ar-white.png", width: 200, height: 103 },
};

export function Logo({ locale, white = false }: { locale: Locale; white?: boolean }) {
  return (
    <Image
      src={LOGOS[locale][white ? "white" : "color"]}
      alt={locale === "ar" ? "مدينة إكسبو دبي" : "Expo City Dubai"}
      width={LOGOS[locale].width}
      height={LOGOS[locale].height}
      unoptimized
      priority
      className="logo"
    />
  );
}
