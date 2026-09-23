"use client";
import { useI18n } from "@/components/wiki-locale";
import { useState } from "react";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { useCatalog, ResourceRow } from "./catalog-browser";
import {
  Breadcrumbs,
  EmptyState,
  LoadingState,
  PageControls,
} from "./wiki-controls";
import { moduleLabel, kinds, seedCourses } from "@/lib/catalog";
import { Markdown } from "./markdown";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import courseDescriptions from "@/content/course-descriptions.json";
import courseWikiSections from "@/content/course-wiki-sections.json";
export function CourseDetail({ id }: { id: string }) {
  const { t, locale, errorText } = useI18n();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const [kind, setKind] = useState("");
  const baseQuery = `course=${encodeURIComponent(id)}&facets=1&limit=100&page=1`;
  const base = useCatalog(baseQuery);
  const needsFiltered = !!base.data && base.data.resourceTotal > 100 &&
    activeTab !== "about" && (activeTab === "exam" || !!kind || page > 1);
  const filteredQuery = `course=${encodeURIComponent(id)}&facets=1&limit=100&page=${page}${activeTab === "exam" ? "&assessment=1" : ""}${kind && activeTab === "all" ? `&kind=${encodeURIComponent(kind)}` : ""}`;
  const filtered = useCatalog(filteredQuery, { enabled: needsFiltered, cache: true });
  const data = needsFiltered && !filtered.loading && filtered.data ? filtered.data : base.data;
  const error = needsFiltered ? filtered.error : base.error;
  const loading = needsFiltered ? filtered.loading : base.loading;
  if (error)
    return (
      <div className="error-banner" role="alert">
        {errorText(error)}
      </div>
    );
  if (!data) return <LoadingState />;
  const c = data.courses.find((c) => c.id === id);
  if (!c)
    return (
      <EmptyState
        title={t("Курс не найден")}
        description={t(
          "Вернитесь в каталог и выберите существующую дисциплину.",
        )}
      />
    );
  const resources = data.resources.filter((r) =>
    r.course_id === id && (needsFiltered || activeTab !== "all" || !kind || r.kind === kind)
  );
  const original = seedCourses.find((item) => item.id === c.id);
  const importedDescription = courseDescriptions.find((item) => item.id === c.id);
  const wikiPage = courseWikiSections.find((item) => item.id === c.id);
  const descriptionIsPlaceholder =
    ((c.id === "ref-001" || c.id === "ref-026") &&
      c.description.includes("Full information on the course can be found")) ||
    (c.id === "ref-015" &&
      c.description.includes("This page contains basic information for the course Calculus-2"));
  const courseDescription = descriptionIsPlaceholder && importedDescription
    ? importedDescription.description
    : c.description;
  return (
    <>
      <Breadcrumbs
        items={[
          { label: t("Курсы"), href: "/courses" },
          {
            label: t`${c.study_year} курс`,
            href: `/courses?year=${c.study_year}`,
          },
          { label: c.title },
        ]}
      />
      <div className="detail-hero">
        <span className="detail-icon">
          <BookOpen size={32} />
        </span>
        <span className="page-eyebrow">
          {c.academic_year} ·{" "}
          {c.category === "Core" ? t("Основная дисциплина") : c.category}
        </span>
        <h1>{c.title}</h1>
        <div className="detail-meta">
          <a
            href={`/courses?year=${c.study_year}`}
          >{t`${c.study_year} курс`}</a>
          <span>{moduleLabel(c.modules, locale)}</span>
          <span>{t`${c.resource_count} материалов`}</span>
        </div>
      </div>
      <div className="detail-layout">
        <section>
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value);
              setPage(1);
            }}
          >
            <TabsList variant="line" className="content-tabs">
              <TabsTrigger className="content-tab" value="all">{t("Материалы")}</TabsTrigger>
              <TabsTrigger className="content-tab" value="exam">{t("К экзамену")}</TabsTrigger>
              <TabsTrigger className="content-tab" value="about">{t("О курсе")}</TabsTrigger>
            </TabsList>
            {["all", "exam"].map((tab) => (
              <TabsContent value={tab} key={tab}>
                {tab === "all" && (
                  <div className="material-filters" role="group" aria-label={t("Категории материалов")}>
                    {[["", t("Все")], ...Object.entries(kinds)].filter(([key]) =>
                      !key || (data.kindCounts?.[key] || 0) > 0 || key === kind
                    ).map(([key, label]) => (
                      <button type="button" key={key} className="material-filter"
                        aria-pressed={kind === key}
                        onClick={() => { setKind(key); setPage(1); }}>
                        {t(label)}
                        <span>{key ? (data.kindCounts?.[key] || 0) : Object.values(data.kindCounts || {}).reduce((sum, count) => sum + count, 0)}</span>
                      </button>
                    ))}
                  </div>
                )}
                {loading ? <LoadingState /> : (tab === "exam"
                  ? resources.filter(
                      (r) => r.kind === "exam" || r.kind === "solution",
                    )
                  : resources
                ).length ? (
                  Object.entries(kinds)
                    .filter(
                      ([key]) =>
                        tab === "all" || key === "exam" || key === "solution",
                    )
                    .map(([key, label]) => {
                      const items = resources.filter((r) => r.kind === key);
                      return items.length ? (
                        <section className="material-group" key={key}>
                          <h2>
                            {t(label)} <span>{data.kindCounts?.[key] ?? items.length}</span>
                          </h2>
                          {items.map((r) => (
                            <ResourceRow key={r.id} resource={r} />
                          ))}
                        </section>
                      ) : null;
                    })
                ) : (
                  <EmptyState
                    title={t("Здесь появятся материалы курса")}
                    description={t(
                      "Лекции, задачи и конспекты ещё не добавлены. Новые материалы появятся здесь.",
                    )}
                  />
                )}
              </TabsContent>
            ))}
            <TabsContent value="about" forceMount hidden={activeTab !== "about"}>
              <div className="prose-card">
                <h2>{t("О дисциплине")}</h2>
                {courseDescription ? <Markdown text={courseDescription} /> : !wikiPage && (
                  <Markdown
                    text={original
                      ? t("Описание ещё не добавлено. Исходная запись дисциплины взята из каталога Wiki ФКН; администратор может уточнять её данные.")
                      : t("Описание ещё не добавлено. Курс создан администратором проекта.")}
                  />
                )}
                {wikiPage?.sections.map((section) => (
                  <section className="wiki-course-section" key={section.title}>
                    <h3>{section.title}</h3>
                    <Markdown text={section.content} />
                  </section>
                ))}
                {wikiPage && (
                  <small className="markdown-attribution">
                    Source: <a href={wikiPage.sourceUrl} target="_blank" rel="noopener noreferrer">FCS Wiki — {wikiPage.sourcePageTitle}, revision {wikiPage.sourceRevision}</a>; adapted under the Wiki’s <a href="https://wiki.cs.hse.ru/Wiki_-_%D0%A4%D0%B0%D0%BA%D1%83%D0%BB%D1%8C%D1%82%D0%B5%D1%82_%D0%BA%D0%BE%D0%BC%D0%BF%D1%8C%D1%8E%D1%82%D0%B5%D1%80%D0%BD%D1%8B%D1%85_%D0%BD%D0%B0%D1%83%D0%BA:%D0%9E%D0%BF%D0%B8%D1%81%D0%B0%D0%BD%D0%B8%D0%B5" target="_blank" rel="noopener noreferrer">CC-BY-SA terms</a>. Linked files remain with their original providers.
                  </small>
                )}
              </div>
            </TabsContent>
          </Tabs>
          {activeTab !== "about" && !loading && (
            <PageControls
              page={data.page}
              pages={data.pages}
              onChange={setPage}
            />
          )}
        </section>
        <aside>
          <div className="info-card plain">
            <h2>{t("Есть хороший конспект?")}</h2>
            <p>{t("Помоги следующим студентам разобраться в теме.")}</p>
            <a className="text-link" href="/about#contribute">
              {t("Как поделиться")} <ArrowUpRight size={16} />
            </a>
          </div>
        </aside>
      </div>
    </>
  );
}
