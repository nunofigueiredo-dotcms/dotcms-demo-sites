import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Vodafone's own typeface, from web.vodafone.com.eg.
const vodafone = localFont({
  src: "./fonts/vodafone-regular.woff",
  variable: "--font-vodafone",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Vodafone Egypt", template: "%s" },
  description:
    "Vodafone Egypt rate plans, Vodafone Cash, Home DSL and store locations.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" className={vodafone.variable}>
      <body>{children}</body>
    </html>
  );
}
