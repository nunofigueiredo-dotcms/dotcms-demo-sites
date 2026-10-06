import type { Metadata } from "next";
import { Jost, Libre_Baskerville } from "next/font/google";
import { DotContentAnalytics } from "@dotcms/analytics/react";
import { contentAnalyticsConfig } from "@/utils/analytics";
import "./globals.css";

// tsd.texas.gov sets headings in Libre Baskerville and body copy in Futura
// PT (Adobe Fonts). Jost is the closest open-licence geometric sans.
const baskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-baskerville",
  display: "swap",
});
const jost = Jost({ subsets: ["latin"], variable: "--font-jost", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Texas School for the Deaf", template: "%s" },
  description:
    "Texas School for the Deaf in Austin: bilingual ASL-English education from preschool to age 22, and statewide outreach.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${baskerville.variable} ${jost.variable}`}>
      <body>
        {/* Once, here: it records a page view on every route change. */}
        {contentAnalyticsConfig && <DotContentAnalytics config={contentAnalyticsConfig} />}
        {children}
      </body>
    </html>
  );
}
