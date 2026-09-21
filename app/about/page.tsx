import { getServerI18n } from "@/lib/i18n-server";
import { Breadcrumbs } from "@/components/wiki-controls";
import { sourceUrl } from "@/lib/catalog";
import { Sprout, ArrowUpRight } from "lucide-react";
export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t("О проекте") };
}
export default async function Page() {
  const { t } = await getServerI18n();
  return (
    <>
      <Breadcrumbs items={[{ label: t("О проекте") }]} />
      <div className="about-intro">
        <div>
          <span className="page-eyebrow">
            <Sprout size={17} /> {t("СТУДЕНТЫ — СТУДЕНТАМ")}
          </span>
          <h1>
            {t("Знания становятся больше,")}
            <br />
            {t("когда ими делятся.")}
          </h1>
          <p>
            {t(
              "DSBA Wiki — независимая база знаний для студентов программы Data Science and Business Analytics факультета компьютерных наук НИУ ВШЭ.",
            )}
          </p>
        </div>
        <img
          src="/panda-study.png"
          alt={t("Панда с книгой среди бамбука")}
          width="420"
          height="280"
        />
      </div>
      <div className="about-grid">
        <section className="prose-card" id="sources">
          <h2>{t("На что мы опираемся")}</h2>
          <p>
            {t(
              "Каталог перенесён из предоставленного HTML-снимка Wiki ФКН: раздел «ПАД / DSBA», учебный год 2026/2027, редакция 97638. В нём 58 дисциплин, распределённых по четырём годам обучения и модулям 1–4.",
            )}
          </p>
          <p>
            {t(
              "В снимке 14 страниц отмечены как существующие, 44 ещё не созданы. Это состояние исходного файла, а не проверка текущей доступности. Документов, лекций и экзаменационных заданий в загрузке не было.",
            )}
          </p>
          <p>
            {t(
              "Группировка «1 семестр — модули 1–2, 2 семестр — модули 3–4» принята для удобства навигации. Сам источник использует модули. Wiki не заменяет официальный учебный план.",
            )}
          </p>
          <a
            className="text-link"
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("Исходная Wiki ФКН")} <ArrowUpRight size={17} />
          </a>
        </section>
        <section className="prose-card" id="contribute">
          <h2>{t("Как помочь проекту")}</h2>
          <ol>
            <li>
              {t(
                "Подготовьте свой конспект, задачи, полезную ссылку или документ, которым разрешено делиться.",
              )}
            </li>
            <li>
              {t(
                "Укажите дисциплину, модули, тему, автора и источник. Для чужих материалов нужно разрешение автора или подходящая лицензия.",
              )}
            </li>
            <li>
              {t(
                "Передайте материал администратору проекта. Публичная форма отправки и контакты пока не настроены.",
              )}
            </li>
          </ol>
          <p>
            {t(
              "Администратор загружает файлы через панель управления, проверяет описание и права, затем публикует материал. Черновики и архивные записи недоступны обычным посетителям.",
            )}
          </p>
          <a className="button primary" href="/admin">
            {t("Управление материалами")} <ArrowUpRight size={17} />
          </a>
        </section>
      </div>
    </>
  );
}
