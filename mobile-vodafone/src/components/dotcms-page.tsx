import { useCallback } from "react";
import { useDotCMS } from "@/hooks/use-dotcms";
import { fetchPage } from "@/lib/queries";
import { Header } from "./header";
import { Screen } from "./screen";
import { PageSections } from "./sections/page-sections";

/**
 * A tab that shows one dotCMS page, built from whatever sections editors
 * placed on it. Pull down to reload after changing the page in dotCMS.
 */
export function DotCMSPage({ url, title }: { url: string; title: string }) {
  const load = useCallback(() => fetchPage(url), [url]);
  const { data, error, loading, refreshing, refresh } = useDotCMS(load);
  return (
    <Screen loading={loading} error={error} refreshing={refreshing} onRefresh={refresh}>
      <Header title={title} />
      {/* Remount on refresh so sections with their own queries reload too. */}
      {data ? <PageSections key={String(refreshing)} sections={data.sections} /> : null}
    </Screen>
  );
}
