import { Link } from "@/components/site/Locale";
import { Logo } from "@/components/Logo";
import { getLocale } from "@/utils/languages";
import { translate } from "@/utils/strings";

export default async function NotFound() {
  // Rendered outside the site's providers, so labels come straight from
  // src/i18n/ui-strings.json in the request's language.
  const locale = await getLocale();
  const t = (key: string) => translate(key, locale);
  return (
    <main className="not-found">
      <Logo />
      <h1>404</h1>
      <p>{t("notFound.title")}</p>
      <p>{t("notFound.text")}</p>
      <Link href="/" className="btn btn--primary">
        {t("notFound.home")}
      </Link>
    </main>
  );
}
