import type { Metadata } from "next";
import { WikiShell } from "@/components/wiki-shell";
import { WikiTools } from "@/components/wiki-tools";
import { WikiThemeProvider } from "@/components/wiki-theme";
import { WikiLocaleProvider } from "@/components/wiki-locale";
import { getServerI18n } from "@/lib/i18n-server";
import "./globals.css";
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    title: {
      default: t("DSBA Wiki — знания растут вместе"),
      template: "%s · DSBA Wiki",
    },
    description: t(
      "Независимая база знаний студентов Data Science and Business Analytics: курсы, учебные материалы и полезные источники.",
    ),
    icons: { icon: "/favicon.svg" },
  };
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale } = await getServerI18n();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <WikiLocaleProvider initialLocale={locale}>
          <WikiThemeProvider>
            <WikiShell>{children}</WikiShell>
            <WikiTools />
          </WikiThemeProvider>
        </WikiLocaleProvider>
      </body>
    </html>
  );
}
