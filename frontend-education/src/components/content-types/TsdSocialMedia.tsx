"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { ExternalLink, Facebook, Instagram } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";

type TsdSocialMediaProps = DotCMSBasicContentlet & {
  heading?: string;
  intro?: string;
  facebookUrl?: string;
  instagramUrl?: string;
};

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

/** A short handle for labels: "https://www.instagram.com/texasschoolforthedeaf/" → "texasschoolforthedeaf". */
function handle(url: string) {
  return url.replace(/\/+$/, "").split("/").pop() ?? url;
}

/**
 * Before loading content from another company, ask: a state agency's site
 * shouldn't let Facebook or Instagram track every visitor by default.
 */
function Consent({ network, onLoad }: { network: string; onLoad: () => void }) {
  return (
    <div className="social-embed__consent">
      <p>
        This shows posts from {network}. {network} may set cookies when it loads.
      </p>
      <button type="button" className="btn btn--primary" onClick={onLoad}>
        Show {network} posts
      </button>
    </div>
  );
}

function FacebookPage({ url }: { url: string }) {
  const [show, setShow] = useState(false);
  const src = `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(url)}&tabs=timeline&width=500&height=600&small_header=false&adapt_container_width=true&hide_cover=false`;
  return (
    <div className="social-embed">
      <h3>
        <Facebook aria-hidden className="h-5 w-5" /> Facebook
      </h3>
      {show ? (
        <iframe src={src} title="Texas School for the Deaf on Facebook" className="social-embed__facebook" loading="lazy" />
      ) : (
        <Consent network="Facebook" onLoad={() => setShow(true)} />
      )}
      <a href={url} target="_blank" rel="noopener" className="text-link">
        Open on Facebook <ExternalLink aria-hidden className="h-4 w-4" />
      </a>
    </div>
  );
}

function InstagramProfile({ url }: { url: string }) {
  const [show, setShow] = useState(false);
  // The embed script turns the blockquote into the profile; re-run it if it's already loaded.
  useEffect(() => {
    if (show) window.instgrm?.Embeds.process();
  }, [show]);
  return (
    <div className="social-embed">
      <h3>
        <Instagram aria-hidden className="h-5 w-5" /> Instagram
      </h3>
      {show ? (
        <>
          <blockquote className="instagram-media" data-instgrm-permalink={url} data-instgrm-version="14">
            <a href={url}>@{handle(url)} on Instagram</a>
          </blockquote>
          <Script src="https://www.instagram.com/embed.js" strategy="lazyOnload" onLoad={() => window.instgrm?.Embeds.process()} />
        </>
      ) : (
        <Consent network="Instagram" onLoad={() => setShow(true)} />
      )}
      <a href={url} target="_blank" rel="noopener" className="text-link">
        Open @{handle(url)} on Instagram <ExternalLink aria-hidden className="h-4 w-4" />
      </a>
    </div>
  );
}

/** TSD's Facebook page and Instagram profile, side by side, as on tsd.texas.gov. */
export default function TsdSocialMedia({ heading, intro, facebookUrl, instagramUrl }: TsdSocialMediaProps) {
  if (!facebookUrl && !instagramUrl) return null;
  return (
    <section className="section section--mist">
      <div className="container-tsd">
        {(heading || intro) && (
          <header className="section__header">
            {heading && <h2 className="section__title">{heading}</h2>}
            {intro && <p className="section__intro">{intro}</p>}
          </header>
        )}
        <div className="social-grid">
          {facebookUrl && <FacebookPage url={facebookUrl} />}
          {instagramUrl && <InstagramProfile url={instagramUrl} />}
        </div>
      </div>
    </section>
  );
}
