import type { Metadata } from "next";
import { WikiShell } from "@/components/wiki-shell";
import { WikiTools } from "@/components/wiki-tools";
import { WikiThemeProvider } from "@/components/wiki-theme";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "DSBA Wiki — знания растут вместе",
    template: "%s · DSBA Wiki",
  },
  description:
    "Независимая база знаний студентов Data Science and Business Analytics: курсы, учебные материалы и полезные источники.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <WikiThemeProvider>
          <WikiShell>{children}</WikiShell>
          <WikiTools />
        </WikiThemeProvider>
      </body>
    </html>
  );
}
