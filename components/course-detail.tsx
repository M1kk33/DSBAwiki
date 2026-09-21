"use client";
import { useState } from "react";
import { ArrowUpRight, BookOpen, Info } from "lucide-react";
import { useCatalog, ResourceRow } from "./catalog-browser";
import {
  Breadcrumbs,
  EmptyState,
  LoadingState,
  PageControls,
} from "./wiki-controls";
import { moduleLabel, kinds, seedCourses } from "@/lib/catalog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
export function CourseDetail({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const { data, error } = useCatalog(
    `course=${id}&page=${page}${activeTab === "exam" ? "&assessment=1" : ""}`,
  );
  if (error)
    return (
      <div className="error-banner" role="alert">
        {error}
      </div>
    );
  if (!data) return <LoadingState />;
  const c = data.courses.find((c) => c.id === id);
  if (!c)
    return (
      <EmptyState
        title="Курс не найден"
        description="Вернитесь в каталог и выберите существующую дисциплину."
      />
    );
  const resources = data.resources.filter((r) => r.course_id === id);
  const original = seedCourses.find((item) => item.id === c.id);
  const originalSource =
    original?.source_url && original.source_url === c.source_url;
  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Курсы", href: "/courses" },
          {
            label: `${c.study_year} курс`,
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
          {c.category === "Core" ? "Основная дисциплина" : c.category}
        </span>
        <h1>{c.title}</h1>
        <div className="detail-meta">
          <a href={`/courses?year=${c.study_year}`}>{c.study_year} курс</a>
          <span>{moduleLabel(c.modules)}</span>
          <span>{c.resource_count} материалов</span>
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
            <TabsList className="content-tabs">
              <TabsTrigger value="all">Все материалы</TabsTrigger>
              <TabsTrigger value="exam">К экзамену</TabsTrigger>
              <TabsTrigger value="about">О дисциплине</TabsTrigger>
            </TabsList>
            {["all", "exam"].map((tab) => (
              <TabsContent value={tab} key={tab}>
                {(tab === "exam"
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
                            {label} <span>{items.length}</span>
                          </h2>
                          {items.map((r) => (
                            <ResourceRow key={r.id} resource={r} />
                          ))}
                        </section>
                      ) : null;
                    })
                ) : (
                  <EmptyState
                    title="Здесь появятся материалы курса"
                    description="Лекции, задачи и конспекты ещё не загружены. Пока можно обратиться к странице курса в исходной wiki, если она указана."
                  />
                )}
              </TabsContent>
            ))}
            <TabsContent value="about">
              <div className="prose-card">
                <h2>О дисциплине</h2>
                <p className="preserve-text">
                  {c.description ||
                    (original
                      ? "Описание ещё не добавлено. Исходная запись дисциплины взята из каталога Wiki ФКН; администратор может уточнять её данные."
                      : "Описание ещё не добавлено. Курс создан администратором проекта.")}
                </p>
                {original && (
                  <p>
                    Оценивание, преподаватели и содержание занятий в исходном
                    файле не указаны.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
          {activeTab !== "about" && (
            <PageControls
              page={data.page}
              pages={data.pages}
              onChange={setPage}
            />
          )}
        </section>
        <aside>
          <div className="info-card">
            <Info size={22} />
            <h2>Источник курса</h2>
            {c.source_url ? (
              <>
                <p>
                  {originalSource
                    ? "Страница была отмечена как существующая в предоставленном снимке Wiki ФКН. Её актуальность может измениться."
                    : "Источник указан администратором. Содержание и актуальность проверяйте на странице источника."}
                </p>
                <a
                  className="button"
                  href={c.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {originalSource ? "Открыть Wiki ФКН" : "Открыть источник"}{" "}
                  <ArrowUpRight size={16} />
                </a>
              </>
            ) : (
              <p>
                {original && !original.source_exists
                  ? "В исходном снимке страница этой дисциплины ещё не была создана. Здесь можно собрать новые материалы."
                  : "Ссылка на источник пока не добавлена."}
              </p>
            )}
          </div>
          <div className="info-card plain">
            <h2>Есть хороший конспект?</h2>
            <p>Помоги следующим студентам разобраться в теме.</p>
            <a className="text-link" href="/about#contribute">
              Как поделиться <ArrowUpRight size={16} />
            </a>
          </div>
        </aside>
      </div>
    </>
  );
}
