import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Header path="" />
      <main id="main" className="container-page py-24">
        <p className="eyebrow">404</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold">We couldn&apos;t find that page</h1>
        <p className="mt-4 text-ink-soft">
          Try the <Link href="/">latest insights</Link> or the <Link href="/hub">Messaging Hub</Link>.
        </p>
      </main>
      <Footer />
    </>
  );
}
