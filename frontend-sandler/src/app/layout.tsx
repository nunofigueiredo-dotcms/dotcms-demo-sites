import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { getLocale } from "@/utils/languages";

// Sandler's brand typeface, used for headings and body alike.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: { default: "Sandler | Sales Training & Business Development", template: "%s" },
  description:
    "Sales training, sales management and leadership development from Sandler's network of local training centers.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
