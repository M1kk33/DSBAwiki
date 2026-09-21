"use client";
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
const links = [
  { href: "/", text: "Главная", icon: Home },
  { href: "/courses", text: "Каталог курсов", icon: BookOpen },
  { href: "/resources", text: "Библиотека", icon: Library },
  { href: "/about", text: "О проекте", icon: Info },
];
export function WikiShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <SidebarProvider>
      <a href="#main" className="skip-link">
        К содержимому
      </a>
      <Sidebar className="wiki-sidebar">
        <SidebarHeader>
          <a className="brand" href="/">
            <img src="/favicon.svg" alt="" width="44" height="44" />
            <span>
              DSBA<span className="brand-wiki"> wiki</span>
              <small>ЗНАНИЯ РАСТУТ ВМЕСТЕ</small>
            </span>
          </a>
          <div className="program-label">
            Data Science &<br />
            Business Analytics
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>ПРОСТРАНСТВО ЗНАНИЙ</SidebarGroupLabel>
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
                      <span>{text}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>ПО ГОДАМ ОБУЧЕНИЯ</SidebarGroupLabel>
            <SidebarMenu>
              {[1, 2, 3, 4].map((year) => (
                <SidebarMenuItem key={year}>
                  <SidebarMenuButton asChild>
                    <a href={`/courses?year=${year}`}>
                      <span className="year-number">0{year}</span>
                      <span>{year} курс</span>
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
              Маленький вклад.
              <br />
              Большая польза.
            </strong>
            <p>Хорошие конспекты заслуживают быть найденными.</p>
            <a href="/about#contribute">
              Как помочь проекту <ArrowUpRight size={15} />
            </a>
          </div>
        </SidebarContent>
        <SidebarFooter>
          <a className="admin-link" href="/admin">
            <Shield size={16} /> Управление материалами
          </a>
          <div className="sidebar-bottom">
            Независимый студенческий проект
            <br />
            ФКН · НИУ ВШЭ
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="topbar">
          <div className="topbar-context">
            <SidebarTrigger aria-label="Открыть навигацию" />
            <span>Студенческая база знаний</span>
          </div>
          <a href="/resources" className="top-search">
            <Search size={16} /> Поиск по wiki
          </a>
          <span className="academic-pill">2026 / 2027</span>
        </header>
        <main id="main" className="main-content">
          {children}
        </main>
        <footer className="site-footer">
          <span>
            DSBA wiki <span className="footer-dot">·</span> Создаём знания
            вместе
          </span>
          <a href="/about">
            Открыто для любопытства <Sprout size={15} />
          </a>
        </footer>
      </SidebarInset>
      <Toaster richColors />
    </SidebarProvider>
  );
}
