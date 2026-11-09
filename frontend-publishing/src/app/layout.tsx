import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

// Elsevier's own typefaces are proprietary; Inter and Source Serif 4 are the
// closest open-licence equivalents.
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin", "latin-ext"], variable: "--font-serif4", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: { default: "Insights for research leaders | Elsevier (demo)", template: "%s | Elsevier (demo)" },
  description: "A dotCMS demo environment for the Elsevier Academic & Government marketing team. Fictional content.",
  // A demo environment: never indexed, so it can't be mistaken for the real site.
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
