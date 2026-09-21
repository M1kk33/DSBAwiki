import { getServerI18n } from "@/lib/i18n-server";
export default async function NotFound() {
  const { t } = await getServerI18n();
  return (
    <div className="prose-card">
      <span className="page-eyebrow">404</span>
      <h1>{t("Эта страница пока не найдена")}</h1>
      <p>{t("Возможно, ссылка устарела или материал ещё не опубликован.")}</p>
      <a className="button primary" href="/courses">
        {t("Вернуться к курсам")}
      </a>
    </div>
  );
}
