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
export function CourseDetail({ id }: { id: string }) {
  const { t, locale, errorText } = useI18n();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const { data, error } = useCatalog(
    `course=${id}&page=${page}${activeTab === "exam" ? "&assessment=1" : ""}`,
  );
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
  const resources = data.resources.filter((r) => r.course_id === id);
  const original = seedCourses.find((item) => item.id === c.id);
  const importedDescription = courseDescriptions.find((item) => item.id === c.id);
  const descriptionIsPlaceholder =
    (c.id === "ref-001" || c.id === "ref-026") &&
    c.description.includes("Full information on the course can be found") ||
    c.id === "ref-015" &&
    c.description.includes("This page contains basic information for the course Calculus-2");
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
            <TabsList className="content-tabs">
              <TabsTrigger value="all">{t("Все материалы")}</TabsTrigger>
              <TabsTrigger value="exam">{t("К экзамену")}</TabsTrigger>
              <TabsTrigger value="about">{t("О дисциплине")}</TabsTrigger>
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
                            {t(label)} <span>{items.length}</span>
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
            <TabsContent value="about">
              <div className="prose-card">
                <h2>{t("О дисциплине")}</h2>
                <Markdown
                  text={
                    descriptionIsPlaceholder && importedDescription
                      ? importedDescription.description
                      : c.description ||
                    (original
                      ? t(
                          "Описание ещё не добавлено. Исходная запись дисциплины взята из каталога Wiki ФКН; администратор может уточнять её данные.",
                        )
                      : t(
                          "Описание ещё не добавлено. Курс создан администратором проекта.",
                        ))
                  }
                />
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
