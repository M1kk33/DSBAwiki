"use client";
import { useI18n, LanguageToggle } from "@/components/wiki-locale";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Library,
  Home,
  ArrowUpRight,
  Info,
  Search,
  Sprout,
  Shield,
  ChevronRight,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeToggle } from "@/components/wiki-theme";
const links = [
  { href: "/", text: "Главная", icon: Home },
  { href: "/courses", text: "Каталог курсов", icon: BookOpen },
  { href: "/resources", text: "Библиотека", icon: Library },
  { href: "/about", text: "О проекте", icon: Info },
];
export function WikiShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  return (
    <SidebarProvider>
      <a href="#main" className="skip-link">
        {t("К содержимому")}
      </a>
      <Sidebar className="wiki-sidebar">
        <SidebarHeader>
          <a className="brand" href="/">
            <img src="/favicon.svg" alt="" width="44" height="44" />
            <span>
              DSBA<span className="brand-wiki"> wiki</span>
              <small>{t("ЗНАНИЯ РАСТУТ ВМЕСТЕ")}</small>
            </span>
          </a>
          <div className="program-label">
            Data Science &<br />
            Business Analytics
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t("ПРОСТРАНСТВО ЗНАНИЙ")}</SidebarGroupLabel>
            <SidebarMenu>
              {links.map(({ href, text, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === href ||
                      (href !== "/" && pathname.startsWith(href))
                    }
                  >
                    <a href={href}>
                      <Icon />
                      <span>{t(text)}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>{t("ПО ГОДАМ ОБУЧЕНИЯ")}</SidebarGroupLabel>
            <SidebarMenu>
              {[1, 2, 3, 4].map((year) => (
                <SidebarMenuItem key={year}>
                  <SidebarMenuButton asChild>
                    <a href={`/courses?year=${year}`}>
                      <span className="year-number">0{year}</span>
                      <span>{t`${year} курс`}</span>
                      <ChevronRight className="ml-auto" />
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
          <div className="sidebar-note">
            <Sprout size={22} />
            <strong>
              {t("Маленький вклад.")}
              <br />
              {t("Большая польза.")}
            </strong>
            <p>{t("Хорошие конспекты заслуживают быть найденными.")}</p>
            <a href="/about#contribute">
              {t("Как помочь проекту")} <ArrowUpRight size={15} />
            </a>
          </div>
        </SidebarContent>
        <SidebarFooter>
          <a className="admin-link" href="/admin">
            <Shield size={16} /> {t("Управление материалами")}
          </a>
          <div className="sidebar-bottom">
            {t("Независимый студенческий проект")}
            <br />
            {t("ФКН · НИУ ВШЭ")}
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="topbar">
          <div className="topbar-context">
            <SidebarTrigger aria-label={t("Открыть навигацию")} />
            <span>{t("Студенческая база знаний")}</span>
          </div>
          <a href="/resources" className="top-search">
            <Search size={16} /> {t("Поиск по wiki")}
          </a>
          <LanguageToggle />
          <ThemeToggle />
          <span className="academic-pill">2026 / 2027</span>
        </header>
        <main id="main" className="main-content">
          {children}
        </main>
        <footer className="site-footer">
          <span>
            DSBA wiki <span className="footer-dot">·</span>{" "}
            {t("Создаём знания вместе")}
          </span>
          <a href="/about">
            {t("Открыто для любопытства")} <Sprout size={15} />
          </a>
        </footer>
      </SidebarInset>
      <Toaster richColors />
    </SidebarProvider>
  );
}
