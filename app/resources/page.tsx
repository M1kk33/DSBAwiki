import { getServerI18n } from "@/lib/i18n-server";
import { Suspense } from "react";
import { CatalogBrowser } from "@/components/catalog-browser";
import { LoadingState } from "@/components/wiki-controls";
export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t("Библиотека") };
}
export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CatalogBrowser mode="resources" />
    </Suspense>
  );
}
