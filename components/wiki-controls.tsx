"use client";
import { useI18n } from "@/components/wiki-locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, FolderOpen } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
export function PageControls({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}) {
  const { t } = useI18n();
  if (pages < 2) return null;
  return (
    <Pagination className="mt-6" aria-label={t("Страницы результатов")}>
      <PaginationContent>
        <PaginationItem>
          <button
            className="button"
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
          >
            {t("Назад")}
          </button>
        </PaginationItem>
        <PaginationItem>
          <span className="px-4 text-sm">
            {page} / {pages}
          </span>
        </PaginationItem>
        <PaginationItem>
          <button
            className="button"
            disabled={page >= pages}
            onClick={() => onChange(page + 1)}
          >
            {t("Далее")}
          </button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
export function Picker({
  label,
  value,
  onChange,
  options,
  name,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  name?: string;
}) {
  return (
    <Select
      name={name}
      value={value || "__empty"}
      onValueChange={(v) => onChange(v === "__empty" ? "" : v)}
    >
      <SelectTrigger aria-label={label} className="wiki-select">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value || "__empty"} value={o.value || "__empty"}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Empty className="empty-state">
      <EmptyHeader>
        <FolderOpen size={32} />
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
export function LoadingState() {
  const { t } = useI18n();
  return (
    <div aria-label={t("Загрузка")} role="status" className="loading-cards">
      {[0, 1, 2].map((i) => (
        <Skeleton className="h-36 w-full rounded-xl" key={i} />
      ))}
    </div>
  );
}
export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  const { t } = useI18n();
  return (
    <nav aria-label={t("Хлебные крошки")} className="breadcrumbs">
      <a href="/">{t("Главная")}</a>
      {items.map((item, i) => (
        <span key={i}>
          <ArrowRight size={12} />
          {item.href ? (
            <a href={item.href}>{item.label}</a>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
