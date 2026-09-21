export default function NotFound() {
  return (
    <div className="prose-card">
      <span className="page-eyebrow">404</span>
      <h1>Эта страница пока не найдена</h1>
      <p>Возможно, ссылка устарела или материал ещё не опубликован.</p>
      <a className="button primary" href="/courses">
        Вернуться к курсам
      </a>
    </div>
  );
}
