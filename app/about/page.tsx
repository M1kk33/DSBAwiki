import { Breadcrumbs } from "@/components/wiki-controls";
import { sourceUrl } from "@/lib/catalog";
import { Sprout, ArrowUpRight } from "lucide-react";
export const metadata = { title: "О проекте" };
export default function Page() {
  return (
    <>
      <Breadcrumbs items={[{ label: "О проекте" }]} />
      <div className="about-intro">
        <div>
          <span className="page-eyebrow">
            <Sprout size={17} /> СТУДЕНТЫ — СТУДЕНТАМ
          </span>
          <h1>
            Знания становятся больше,
            <br />
            когда ими делятся.
          </h1>
          <p>
            DSBA Wiki — независимая база знаний для студентов программы Data
            Science and Business Analytics факультета компьютерных наук НИУ ВШЭ.
          </p>
        </div>
        <img
          src="/panda-study.png"
          alt="Панда с книгой среди бамбука"
          width="420"
          height="280"
        />
      </div>
      <div className="about-grid">
        <section className="prose-card" id="sources">
          <h2>На что мы опираемся</h2>
          <p>
            Каталог перенесён из предоставленного HTML-снимка Wiki ФКН: раздел
            «ПАД / DSBA», учебный год 2026/2027, редакция 97638. В нём 58
            дисциплин, распределённых по четырём годам обучения и модулям 1–4.
          </p>
          <p>
            В снимке 14 страниц отмечены как существующие, 44 ещё не созданы.
            Это состояние исходного файла, а не проверка текущей доступности.
            Документов, лекций и экзаменационных заданий в загрузке не было.
          </p>
          <p>
            Группировка «1 семестр — модули 1–2, 2 семестр — модули 3–4» принята
            для удобства навигации. Сам источник использует модули. Wiki не
            заменяет официальный учебный план.
          </p>
          <a
            className="text-link"
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Исходная Wiki ФКН <ArrowUpRight size={17} />
          </a>
        </section>
        <section className="prose-card" id="contribute">
          <h2>Как помочь проекту</h2>
          <ol>
            <li>
              Подготовьте свой конспект, задачи, полезную ссылку или документ,
              которым разрешено делиться.
            </li>
            <li>
              Укажите дисциплину, модули, тему, автора и источник. Для чужих
              материалов нужно разрешение автора или подходящая лицензия.
            </li>
            <li>
              Передайте материал администратору проекта. Публичная форма
              отправки и контакты пока не настроены.
            </li>
          </ol>
          <p>
            Администратор загружает файлы через панель управления, проверяет
            описание и права, затем публикует материал. Черновики и архивные
            записи недоступны обычным посетителям.
          </p>
          <a className="button primary" href="/admin">
            Управление материалами <ArrowUpRight size={17} />
          </a>
        </section>
      </div>
    </>
  );
}
