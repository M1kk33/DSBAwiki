"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="prose-card" role="alert">
      <h1>Не удалось загрузить страницу</h1>
      <p>Сервис временно недоступен. Попробуйте ещё раз.</p>
      <button className="button primary" onClick={reset}>
        Повторить загрузку
      </button>
    </div>
  );
}
