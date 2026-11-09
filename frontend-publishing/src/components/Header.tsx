import Image from "next/image";
import Link from "next/link";

const NAV = [
  { href: "/", label: "Insights" },
  { href: "/topics/open-access", label: "Topics" },
  { href: "/hub", label: "Messaging Hub" },
];

export default function Header({ path, userName }: { path: string; userName?: string }) {
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href.split("/").slice(0, 2).join("/")));
  return (
    <header className="border-b border-line bg-white">
      <div className="bg-ink text-white text-[13px]">
        <div className="container-page flex h-9 items-center justify-between">
          <span>Academic &amp; Government</span>
          <span className="hidden sm:inline text-white/80">dotCMS demo environment · fictional content</span>
        </div>
      </div>
      <div className="container-page flex h-[72px] items-center gap-8">
        <Link href="/" aria-label="Elsevier insights home" className="shrink-0">
          <Image src="/brand/elsevier-logo-orange.svg" alt="Elsevier" width={128} height={36} priority />
        </Link>
        <nav aria-label="Main" className="flex flex-1 items-center gap-1 overflow-x-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item.href) ? "page" : undefined}
              className={`whitespace-nowrap rounded px-3 py-2 text-[15px] font-medium no-underline hover:bg-warm ${
                active(item.href) ? "text-ink shadow-[inset_0_-3px_0_var(--color-orange)]" : "text-ink-soft"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:block text-sm">
          {userName ? (
            <span className="text-muted">
              Signed in as <strong className="text-ink">{userName}</strong>
            </span>
          ) : (
            <Link href="/hub#sign-in" className="font-semibold text-ink">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
