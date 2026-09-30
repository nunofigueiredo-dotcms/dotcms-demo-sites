import { NextResponse } from "next/server";

/**
 * Saves a review from the site's "Write a Review" form as an UNPUBLISHED
 * Sandler Testimonial in dotCMS (System Workflow "Save"), linked to the
 * center it's about. It appears on the site only after an editor publishes it.
 * Runs on the server, so the dotCMS token never reaches the browser.
 */
const DOTCMS = (process.env.NEXT_PUBLIC_DOTCMS_HOST || "").replace(/\/$/, "");
const TOKEN = process.env.NEXT_PUBLIC_DOTCMS_AUTH_TOKEN;
const SITE_ID = process.env.NEXT_PUBLIC_DOTCMS_SITE_ID;

const LIMITS = { name: 120, city: 80, region: 80, email: 200, headline: 120, quote: 2000 } as const;

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function dotcms(path: string, init: RequestInit) {
  const res = await fetch(`${DOTCMS}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`dotCMS ${path} → ${res.status}`);
  return body;
}

export async function POST(request: Request) {
  const input = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!input) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  // Bots tend to fill every field, including the hidden one.
  if (clean(input.website, 200)) return NextResponse.json({ ok: true });

  const review = {
    name: clean(input.name, LIMITS.name),
    city: clean(input.city, LIMITS.city),
    region: clean(input.region, LIMITS.region),
    email: clean(input.email, LIMITS.email),
    headline: clean(input.headline, LIMITS.headline),
    quote: clean(input.quote, LIMITS.quote),
  };
  const rating = Number(input.rating);
  const centerSlug = clean(input.center, 80);
  if (!review.name || !review.headline || !review.quote || !/^[a-z0-9-]+$/.test(centerSlug)) {
    return NextResponse.json({ error: "Please fill in your name, a title and your review." }, { status: 400 });
  }
  if (review.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(review.email)) {
    return NextResponse.json({ error: "Please check your email address." }, { status: 400 });
  }

  try {
    const found = await dotcms("/api/content/_search", {
      method: "POST",
      body: JSON.stringify({
        query: `+contentType:TrainingCenter +conHost:${SITE_ID} +TrainingCenter.urlTitle:${centerSlug} +live:true`,
        limit: 1,
      }),
    });
    const center = found.entity?.jsonObjectView?.contentlets?.[0];
    if (!center) return NextResponse.json({ error: "Unknown training center." }, { status: 400 });

    // "NEW" is the System Workflow's Save: stored as a draft, not published.
    await dotcms("/api/v1/workflow/actions/default/fire/NEW", {
      method: "PUT",
      body: JSON.stringify({
        contentlet: {
          contentType: "SandlerTestimonial",
          site: SITE_ID,
          languageId: 1,
          title: `${review.name} — ${centerSlug} (submitted)`,
          center: center.identifier,
          quote: review.quote,
          name: review.name,
          headline: review.headline,
          rating: rating >= 1 && rating <= 5 ? String(Math.round(rating)) : "",
          location: [review.city, review.region].filter(Boolean).join(", "),
          email: review.email,
          source: "submitted",
        },
      }),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Review submission failed:", (e as Error).message);
    return NextResponse.json({ error: "Your review couldn't be saved. Please try again later." }, { status: 502 });
  }
}
