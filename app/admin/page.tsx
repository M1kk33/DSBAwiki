import { AdminPanel } from "@/components/admin-panel";
export const metadata = {
  title: "Управление материалами",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <AdminPanel />;
}
