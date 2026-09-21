"use client";
import { useI18n } from "@/components/wiki-locale";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="prose-card" role="alert">
      <h1>{t("Не удалось загрузить страницу")}</h1>
      <p>{t("Сервис временно недоступен. Попробуйте ещё раз.")}</p>
      <button className="button primary" onClick={reset}>
        {t("Повторить загрузку")}
      </button>
    </div>
  );
}
