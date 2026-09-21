import { Suspense } from "react";
import { CatalogBrowser } from "@/components/catalog-browser";
import { LoadingState } from "@/components/wiki-controls";
export const metadata = { title: "Библиотека" };
export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CatalogBrowser mode="resources" />
    </Suspense>
  );
}
