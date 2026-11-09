import Image from "next/image";
import Link from "next/link";

const COLUMNS = [
  { title: "Insights", links: [["Research integrity", "/topics/research-integrity"], ["Open access", "/topics/open-access"], ["AI in research", "/topics/ai-in-research"], ["Research funding impact", "/topics/research-funding-impact"]] },
  { title: "For A&G teams", links: [["Messaging Hub", "/hub"], ["Approved sources of truth", "/hub#sources"], ["My items in review", "/hub#my-items"]] },
  { title: "About this demo", links: [["Content managed in dotCMS", "/hub#about"], ["Governed workflow", "/hub#about"]] },
];

export default function Footer() {
  return (
    <footer className="mt-24 bg-warm border-t border-line">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div>
          <Image src="/brand/elsevier-logo-orange.svg" alt="Elsevier" width={112} height={32} />
          <p className="mt-4 text-sm text-muted">Helping researchers and research leaders advance science and improve outcomes.</p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="text-sm font-semibold">{col.title}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-ink-soft no-underline hover:underline">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-3 py-6 text-[13px] text-muted md:flex-row md:items-center md:justify-between">
          <p>
            <strong className="text-ink">Demo environment.</strong> Content, people and figures are fictional. Built with dotCMS
            for a prospect demonstration; not an official Elsevier website.
          </p>
        </div>
      </div>
    </footer>
  );
}
