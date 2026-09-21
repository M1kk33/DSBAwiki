"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  ArrowUpRight,
  FileText,
  Link2,
  BookOpen,
  RotateCcw,
} from "lucide-react";
import { type Course, type Resource, kinds, moduleLabel } from "@/lib/catalog";
import {
  Picker,
  EmptyState,
  LoadingState,
  Breadcrumbs,
  PageControls,
} from "./wiki-controls";
export type CatalogData = {
  courses: Course[];
  resources: Resource[];
  resourceTotal: number;
  page: number;
  pages: number;
};
export function useCatalog(search = "") {
  const [data, setData] = useState<CatalogData | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/catalog?" + search, { signal: controller.signal })
      .then(async (r) => {
        const d = (await r.json()) as CatalogData & { error?: string };
        if (!r.ok) throw new Error(d.error);
        setData(d);
        setError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [search]);
  return { data, error };
}
const normalize = (s: string) => s.normalize("NFKC").toLocaleLowerCase();
export function CourseCard({ course: c }: { course: Course }) {
  return (
    <a className="catalog-card" href={`/courses/${c.id}`}>
      <div className="catalog-card-meta">
        <span>{c.study_year} курс</span>
        <span>{c.academic_year}</span>
        <ArrowUpRight size={18} />
      </div>
      <BookOpen className="catalog-icon" size={26} />
      <h2>{c.title}</h2>
      <p>{c.category === "Core" ? "Основная дисциплина" : c.category}</p>
      <div className="catalog-card-foot">
        <span>{moduleLabel(c.modules)}</span>
        <span>
          {c.resource_count
            ? `${c.resource_count} материалов`
            : c.source_exists
              ? "Источник ФКН"
              : "Ждёт материалов"}
        </span>
      </div>
    </a>
  );
}
export function ResourceRow({ resource: r }: { resource: Resource }) {
  return (
    <a className="resource-row" href={`/resources/${r.id}`}>
      <span className={`file-badge ${r.format}`}>
        {r.format === "file" ? (
          r.filename.split(".").pop()?.toUpperCase()
        ) : r.format === "markdown" ? (
          "MD"
        ) : (
          <Link2 size={21} />
        )}
      </span>
      <span className="resource-row-title">
        <strong>{r.title}</strong>
        <small>
          {r.course_title} {r.topic && ` · ${r.topic}`}
        </small>
        <span className="resource-description">{r.description}</span>
      </span>
      <span className="resource-kind">{kinds[r.kind]}</span>
      <ArrowUpRight size={18} />
    </a>
  );
}
export function CatalogBrowser({ mode }: { mode: "courses" | "resources" }) {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") || ""),
    [year, setYear] = useState(params.get("year") || ""),
    [semester, setSemester] = useState(params.get("semester") || ""),
    [module, setModule] = useState(params.get("module") || ""),
    [kind, setKind] = useState(params.get("kind") || ""),
    [course, setCourse] = useState(params.get("course") || ""),
    [academic, setAcademic] = useState(params.get("academic") || ""),
    [category, setCategory] = useState(params.get("category") || ""),
    [page, setPage] = useState(1);
  const filterKey = new URLSearchParams({
    q,
    year,
    semester,
    module,
    kind,
    course,
    academic,
    category,
  }).toString();
  const [debounced, setDebounced] = useState(filterKey);
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setDebounced(filterKey);
    }, 180);
    return () => clearTimeout(timer);
  }, [filterKey]);
  const { data, error } = useCatalog(
    mode === "resources" ? debounced + "&page=" + page : "",
  );
  useEffect(() => {
    const p = new URLSearchParams();
    Object.entries({
      q,
      year,
      semester,
      module,
      kind,
      course,
      academic,
      category,
    }).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${p.size ? "?" + p : ""}`,
    );
  }, [q, year, semester, module, kind, course, academic, category]);
  const includes = (s: string) => normalize(s).includes(normalize(q.trim()));
  const periodMatch = (c: Course) => {
    const mods = c.modules.split(",");
    return (
      (!year || c.study_year === +year) &&
      (!academic || c.academic_year === academic) &&
      (!category || c.category === category) &&
      (!module || mods.includes(module)) &&
      (!semester ||
        mods.some((m) =>
          semester === "1" ? ["1", "2"].includes(m) : ["3", "4"].includes(m),
        ))
    );
  };
  const selectedCourses = data?.courses.filter(periodMatch) || [];
  const visibleCourses = selectedCourses.filter((c) =>
    includes([c.title, c.category, c.description].join(" ")),
  );
  const resources = data?.resources || [];
  return (
    <>
      <Breadcrumbs
        items={[
          { label: mode === "courses" ? "Каталог курсов" : "Библиотека" },
        ]}
      />
      <div className="page-heading">
        <span className="page-eyebrow">
          {mode === "courses" ? "УЧЕБНЫЙ МАРШРУТ" : "МАТЕРИАЛЫ ДЛЯ УЧЁБЫ"}
        </span>
        <h1>
          {mode === "courses"
            ? "Каждый курс — новая глава."
            : "Всё нужное под рукой."}
        </h1>
        <p>
          {mode === "courses"
            ? "Найди свою дисциплину, открой темы и переходи к материалам."
            : "Лекции, задачи, конспекты и полезные ссылки в одном месте."}
        </p>
      </div>
      <div className="filter-panel">
        <label className="catalog-search">
          <Search size={20} />
          <input
            aria-label="Поиск"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              mode === "courses"
                ? "Название курса или направление"
                : "Название, тема, автор или текст материала"
            }
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="Очистить поиск">
              ×
            </button>
          )}
        </label>
        <div className="filter-row">
          <Picker
            label="Год обучения"
            value={year}
            onChange={setYear}
            options={[
              { value: "", label: "Все годы обучения" },
              ...[1, 2, 3, 4].map((y) => ({
                value: String(y),
                label: `${y} курс`,
              })),
            ]}
          />
          <Picker
            label="Учебный год"
            value={academic}
            onChange={setAcademic}
            options={[
              { value: "", label: "Все учебные годы" },
              ...Array.from(
                new Set(data?.courses.map((c) => c.academic_year)),
              ).map((y) => ({ value: y, label: y })),
            ]}
          />
          <Picker
            label="Семестр"
            value={semester}
            onChange={setSemester}
            options={[
              { value: "", label: "Оба семестра" },
              { value: "1", label: "1 семестр · модули 1–2" },
              { value: "2", label: "2 семестр · модули 3–4" },
            ]}
          />
          <Picker
            label="Модуль"
            value={module}
            onChange={setModule}
            options={[
              { value: "", label: "Все модули" },
              ...[1, 2, 3, 4].map((m) => ({
                value: String(m),
                label: `Модуль ${m}`,
              })),
            ]}
          />
          {mode === "resources" ? (
            <>
              <Picker
                label="Тип материала"
                value={kind}
                onChange={setKind}
                options={[
                  { value: "", label: "Все типы" },
                  ...Object.entries(kinds).map(([value, label]) => ({
                    value,
                    label,
                  })),
                ]}
              />
              <Picker
                label="Курс"
                value={course}
                onChange={setCourse}
                options={[
                  { value: "", label: "Все дисциплины" },
                  ...(data?.courses || []).map((c) => ({
                    value: c.id,
                    label: `${c.title} · ${c.study_year} курс`,
                  })),
                ]}
              />
            </>
          ) : (
            <Picker
              label="Направление"
              value={category}
              onChange={setCategory}
              options={[
                { value: "", label: "Все направления" },
                ...Array.from(
                  new Set(data?.courses.map((c) => c.category)),
                ).map((v) => ({
                  value: v,
                  label: v === "Core" ? "Основные дисциплины" : v,
                })),
              ]}
            />
          )}
          {(q ||
            year ||
            academic ||
            module ||
            semester ||
            kind ||
            course ||
            category) && (
            <button
              className="reset-filters"
              onClick={() => {
                setQ("");
                setYear("");
                setAcademic("");
                setModule("");
                setSemester("");
                setKind("");
                setCourse("");
                setCategory("");
              }}
            >
              <RotateCcw size={14} /> Сбросить
            </button>
          )}
        </div>
      </div>
      <p className="filter-note">
        В источнике используются модули. Семестры здесь — навигационная
        группировка модулей 1–2 и 3–4.
      </p>
      {error ? (
        <div className="error-banner" role="alert">
          {error}
          <button className="button" onClick={() => window.location.reload()}>
            Попробовать снова
          </button>
        </div>
      ) : !data ? (
        <LoadingState />
      ) : (
        <>
          {mode === "courses" ? (
            <>
              <div className="results-count" role="status">
                Найдено дисциплин: {visibleCourses.length}
              </div>
              {visibleCourses.length ? (
                <div className="catalog-grid">
                  {visibleCourses.map((c) => (
                    <CourseCard course={c} key={c.id} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Таких курсов пока нет"
                  description="Попробуйте другое название или сбросьте фильтры."
                />
              )}
            </>
          ) : (
            <>
              <div className="results-count" role="status">
                Материалов: {data.resourceTotal}
              </div>
              {resources.length ? (
                <div className="resource-list">
                  {resources.map((r) => (
                    <ResourceRow resource={r} key={r.id} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={
                    q || kind || course
                      ? "Материалы не найдены"
                      : "Библиотека готова к первым материалам"
                  }
                  description="В исходном HTML были только ссылки на курсы. Документы появятся после загрузки и проверки администратором."
                />
              )}
              <PageControls
                page={data.page}
                pages={data.pages}
                onChange={setPage}
              />
              {q && visibleCourses.length > 0 && (
                <section className="section-block">
                  <div className="section-heading">
                    <h2>Подходящие курсы</h2>
                  </div>
                  <div className="catalog-grid">
                    {visibleCourses.map((c) => (
                      <CourseCard course={c} key={c.id} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
