import { getServerI18n } from "@/lib/i18n-server";
import { dateLocale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { database, getAdmin } from "@/lib/server";
import { type Resource, kinds, moduleLabel } from "@/lib/catalog";
import { Breadcrumbs } from "@/components/wiki-controls";
import { Markdown } from "@/components/markdown";
import { Download, ArrowUpRight } from "lucide-react";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t, locale } = await getServerI18n();
  const { id } = await params;
  const r = await database()
    .prepare(
      "SELECT r.*,c.title AS course_title FROM resources r JOIN courses c ON c.id=r.course_id WHERE r.id=?",
    )
    .bind(id)
    .first<Resource>();
  if (!r || (r.status !== "published" && !(await getAdmin()))) notFound();
  return (
    <>
      <Breadcrumbs
        items={[
          { label: t("Библиотека"), href: "/resources" },
          {
            label: r.course_title || t("Курс"),
            href: `/courses/${r.course_id}`,
          },
          { label: r.title },
        ]}
      />
      <div className="page-heading">
        <span className="page-eyebrow">
          {t(kinds[r.kind])} ·{" "}
          {r.format === "file"
            ? r.filename.split(".").pop()?.toUpperCase()
            : r.format === "markdown"
              ? "Markdown"
              : t("Внешняя ссылка")}
        </span>
        <h1>{r.title}</h1>
        <p>{r.description}</p>
      </div>
      {r.status !== "published" && (
        <p className="notice">{t("Предпросмотр: материал не опубликован.")}</p>
      )}
      <div className="resource-meta">
        <span>{r.topic || t("Без темы")}</span>
        {r.modules && <span>{moduleLabel(r.modules, locale)}</span>}
        <span>
          {t("Версия")} {r.version}
        </span>
        <span>
          {t("Обновлено")}{" "}
          {new Date(r.updated_at).toLocaleDateString(dateLocale[locale], {
            timeZone: "Europe/Moscow",
          })}
        </span>
      </div>
      {r.format === "markdown" ? (
        <div className="prose-card">
          <Markdown text={r.body} />
        </div>
      ) : r.format === "link" ? (
        <div className="prose-card">
          <p className="external-url">{r.url}</p>
          <a
            className="button primary"
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("Открыть источник")} <ArrowUpRight size={18} />
          </a>
        </div>
      ) : (
        <>
          <div className="download-bar">
            <span>
              {r.filename} ·{" "}
              {(r.size / 1024 / 1024).toLocaleString(dateLocale[locale], {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              {t("МБ")}
            </span>
            <a
              className="button primary"
              href={`/api/files/${r.id}?download=1`}
            >
              <Download size={17} /> {t("Скачать файл")}
            </a>
          </div>
          {r.mime === "application/pdf" ? (
            <iframe
              className="pdf-preview"
              title={t`Предпросмотр PDF: ${r.title}`}
              src={`/api/files/${r.id}`}
            />
          ) : r.body &&
            ["text/plain", "text/markdown", "text/csv"].includes(r.mime) ? (
            <div className="prose-card">
              <pre className="text-preview">{r.body}</pre>
            </div>
          ) : (
            <p className="notice">
              {t(
                "Этот формат открывается в соответствующем приложении после скачивания.",
              )}
            </p>
          )}
        </>
      )}
      <div className="attribution">
        <strong>{t("Автор / источник")}</strong>
        <p>{r.attribution || t("Не указан")}</p>
      </div>
    </>
  );
}
