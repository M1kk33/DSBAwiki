"use client";
import { useI18n } from "@/components/wiki-locale";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Layers3,
  Link2,
  Search,
  Sprout,
  Library,
} from "lucide-react";
import { useCatalog, ResourceRow } from "./catalog-browser";
import { seedCourses, moduleLabel } from "@/lib/catalog";
export function WikiHome() {
  const { t, locale } = useI18n();
  const { data, error } = useCatalog("limit=4");
  const courses = data?.courses || seedCourses;
  const recent = data?.resources || [];
  return (
    <>
      <div className="page-eyebrow">
        <Sprout size={16} /> {t("ТВОЁ МЕСТО ДЛЯ ЗНАНИЙ")}
      </div>
      <section className="welcome">
        <div className="welcome-copy">
          <h1>
            {t("Учиться проще,")}
            <br />
            {t("когда мы")} <em>{t("вместе.")}</em>
          </h1>
          <p>
            {t("Курсы, конспекты и полезные материалы DSBA.")}
            <br className="desktop-break" />{" "}
            {t("Всё, что помогает разобраться и двигаться дальше.")}
          </p>
          <form action="/resources" className="hero-search">
            <Search size={21} />
            <input
              aria-label={t("Поиск курсов и материалов")}
              name="q"
              placeholder={t("Что будем изучать сегодня?")}
            />
            <button aria-label={t("Найти")}>
              <ArrowRight size={21} />
            </button>
          </form>
          <div className="search-hint">
            {t("Например:")} <a href="/courses?q=Calculus">Calculus</a>
            <span>·</span>
            <a href="/courses?q=Python">Python</a>
            <span>·</span>
            <a href="/resources?kind=exam">{t("подготовка к экзамену")}</a>
          </div>
        </div>
        <div className="welcome-art">
          <img
            src="/panda-study.png"
            alt={t("Панда читает книгу в бамбуковой роще")}
            width="540"
            height="360"
          />
          <span className="art-caption">{t("По одному открытию за раз.")}</span>
        </div>
      </section>
      <div className="facts">
        <span>
          <BookOpen size={18} />
          <strong>{courses.length}</strong> {t("дисциплин в каталоге")}
        </span>
        <span>
          <Layers3 size={18} />
          <strong>4</strong> {t("года обучения")}
        </span>
        <span>
          <Link2 size={18} />
          <strong>{courses.filter((c) => c.source_exists).length}</strong>{" "}
          {t("ссылок на Wiki ФКН")}
        </span>
        <a href="/about#sources">
          {t("Об источниках")} <ArrowUpRight size={15} />
        </a>
      </div>
      {error && (
        <p className="notice">
          {t(
            "Показан исходный каталог. Обновления библиотеки временно недоступны.",
          )}
        </p>
      )}
      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{t("С ЧЕГО НАЧНЁМ?")}</span>
            <h2>{t("Твой год обучения")}</h2>
          </div>
          <a href="/courses" className="text-link">
            {t("Все курсы")} <ArrowRight size={17} />
          </a>
        </div>
        <div className="year-grid">
          {[1, 2, 3, 4].map((year) => (
            <a
              className={`year-card year-card-${year}`}
              href={`/courses?year=${year}`}
              key={year}
            >
              <div className="year-card-top">
                <span className="year-index">0{year}</span>
                <ArrowUpRight size={20} />
              </div>
              <h3>{t`${year} курс`}</h3>
              <p>
                {
                  [
                    t("Начинаем с основ"),
                    t("Углубляем знания"),
                    t("Соединяем идеи"),
                    t("Собираем всё вместе"),
                  ][year - 1]
                }
              </p>
              <div className="year-card-bottom">
                <span>
                  {courses.filter((c) => c.study_year === year).length}{" "}
                  {t("дисциплин")}
                </span>
                <span>{t("Модули 1–4")}</span>
              </div>
            </a>
          ))}
        </div>
      </section>
      <div className="home-bottom">
        <section>
          <div className="section-heading">
            <div>
              <span className="section-kicker">
                {recent.length
                  ? t("ОБНОВЛЕНИЯ БИБЛИОТЕКИ")
                  : t("ИЗ КАТАЛОГА ФКН")}
              </span>
              <h2>
                {recent.length
                  ? t("Недавно добавлено")
                  : t("Открывай новые темы")}
              </h2>
            </div>
            <a className="text-link" href="/courses">
              {t("В каталог")} <ArrowRight size={16} />
            </a>
          </div>
          <div className="course-list">
            {recent.length
              ? recent.map((r) => <ResourceRow key={r.id} resource={r} />)
              : courses
                  .filter((c) => c.source_exists)
                  .slice(0, 4)
                  .map((c, i) => (
                    <a
                      href={`/courses/${c.id}`}
                      className="course-row"
                      key={c.id}
                    >
                      <span className={`subject-symbol subject-${i}`}>
                        {["∫", "Aa", "∑", "{ }"][i]}
                      </span>
                      <span className="course-row-name">
                        <strong>{c.title}</strong>
                        <small>
                          {t`${c.study_year} курс`} <span>·</span>{" "}
                          {moduleLabel(c.modules, locale)}
                        </small>
                      </span>
                      <span className="source-tag">{t("Источник ФКН")}</span>
                      <ArrowUpRight size={17} />
                    </a>
                  ))}
          </div>
        </section>
        <aside className="library-note">
          <span className="note-icon">
            <Library size={25} />
          </span>
          <h2>
            {t("Библиотека,")}
            <br />
            {t("которую мы создаём")}
          </h2>
          <p>
            {data?.resourceTotal
              ? t`В библиотеке уже ${data.resourceTotal} материалов. Находи нужное по курсу, теме и типу документа.`
              : t(
                  "Здесь будут жить лекции, задачи и ваши лучшие конспекты. Первые материалы ещё ждут загрузки.",
                )}
          </p>
          <a className="button primary" href="/resources">
            {t("Открыть библиотеку")} <ArrowRight size={17} />
          </a>
          <a className="note-link" href="/about#contribute">
            {t("Хочу поделиться материалами")} <ArrowUpRight size={15} />
          </a>
        </aside>
      </div>
    </>
  );
}
