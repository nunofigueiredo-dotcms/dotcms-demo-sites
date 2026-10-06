import Script from "next/script";

/** A GA4 measurement ID: "G-" followed by letters and digits. */
const GA_ID = /^G-[A-Z0-9]+$/;

/**
 * Google Analytics 4, switched on by the measurement ID in the site's TSD
 * Site Settings in dotCMS. The page leaves it out inside the Universal Visual
 * Editor. GA4's enhanced measurement records page views on client-side
 * navigation by itself.
 */
export function GoogleAnalytics({ measurementId }: { measurementId?: string | null }) {
  const id = measurementId?.trim().toUpperCase();
  if (!id || !GA_ID.test(id)) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');`}
      </Script>
    </>
  );
}
