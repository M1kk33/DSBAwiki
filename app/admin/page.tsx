import { getServerI18n } from "@/lib/i18n-server";
import { AdminPanel } from "@/components/admin-panel";
export async function generateMetadata() {
  const { t } = await getServerI18n();
  return {
    title: t("Управление материалами"),
    robots: { index: false, follow: false },
  };
}
export default function Page() {
  return <AdminPanel />;
}
