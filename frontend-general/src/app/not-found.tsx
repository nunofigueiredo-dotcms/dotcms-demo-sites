import Link from "next/link";
import { headers } from "next/headers";
import { Logo } from "@/components/Logo";
import { localizePath, t } from "@/utils/i18n";

export default async function NotFound() {
  const locale = (await headers()).get("x-locale") === "ar" ? "ar" : "en";
  return (
    <main className="not-found">
      <Logo locale={locale} />
      <h1>{t("notFoundTitle", locale)}</h1>
      <p>{t("notFoundText", locale)}</p>
      <Link href={localizePath("/", locale)} className="btn btn--primary">
        {t("backHome", locale)}
      </Link>
    </main>
  );
}
