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
          { label: "Библиотека", href: "/resources" },
          { label: r.course_title || "Курс", href: `/courses/${r.course_id}` },
          { label: r.title },
        ]}
      />
      <div className="page-heading">
        <span className="page-eyebrow">
          {kinds[r.kind]} ·{" "}
          {r.format === "file"
            ? r.filename.split(".").pop()?.toUpperCase()
            : r.format === "markdown"
              ? "Markdown"
              : "Внешняя ссылка"}
        </span>
        <h1>{r.title}</h1>
        <p>{r.description}</p>
      </div>
      {r.status !== "published" && (
        <p className="notice">Предпросмотр: материал не опубликован.</p>
      )}
      <div className="resource-meta">
        <span>{r.topic || "Без темы"}</span>
        {r.modules && <span>{moduleLabel(r.modules)}</span>}
        <span>Версия {r.version}</span>
        <span>
          Обновлено{" "}
          {new Date(r.updated_at).toLocaleDateString("ru-RU", {
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
            Открыть источник <ArrowUpRight size={18} />
          </a>
        </div>
      ) : (
        <>
          <div className="download-bar">
            <span>
              {r.filename} · {(r.size / 1024 / 1024).toFixed(2)} МБ
            </span>
            <a
              className="button primary"
              href={`/api/files/${r.id}?download=1`}
            >
              <Download size={17} /> Скачать файл
            </a>
          </div>
          {r.mime === "application/pdf" ? (
            <iframe
              className="pdf-preview"
              title={`Предпросмотр PDF: ${r.title}`}
              src={`/api/files/${r.id}`}
              sandbox="allow-same-origin allow-scripts"
            />
          ) : r.body &&
            ["text/plain", "text/markdown", "text/csv"].includes(r.mime) ? (
            <div className="prose-card">
              <pre className="text-preview">{r.body}</pre>
            </div>
          ) : (
            <p className="notice">
              Этот формат открывается в соответствующем приложении после
              скачивания.
            </p>
          )}
        </>
      )}
      <div className="attribution">
        <strong>Автор / источник</strong>
        <p>{r.attribution || "Не указан"}</p>
      </div>
    </>
  );
}
