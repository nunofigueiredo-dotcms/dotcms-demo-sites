import type { Metadata } from "next";
import { headers } from "next/headers";
import { Readex_Pro } from "next/font/google";
import { DotContentAnalytics } from "@dotcms/analytics/react";
import { contentAnalyticsConfig } from "@/utils/analytics";
import { baseUrl } from "@/utils/seo";
import "./globals.css";

// expocitydubai.com uses its own ExpoSans and ExpoArabic typefaces. Readex
// Pro is the closest open-licence family that covers both Latin and Arabic.
const readex = Readex_Pro({
  subsets: ["latin", "arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-readex",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: baseUrl() ? new URL(baseUrl()) : undefined,
  title: { default: "Expo City Dubai", template: "%s" },
  description: "The new centre of Dubai's future: attractions, events, parks, dining and event spaces.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Set by src/proxy.ts from the URL (/ar/…) or the editor's language_id.
  const locale = (await headers()).get("x-locale") === "ar" ? "ar" : "en";
  return (
    <html lang={locale === "ar" ? "ar-AE" : "en"} dir={locale === "ar" ? "rtl" : "ltr"} className={readex.variable}>
      <body>
        {/* Once, here: it records a page view on every route change. */}
        {contentAnalyticsConfig && <DotContentAnalytics config={contentAnalyticsConfig} />}
        {children}
      </body>
    </html>
  );
}
