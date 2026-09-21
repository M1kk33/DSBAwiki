"use client";
import { readResponse } from "@/lib/client";
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Upload,
  Shield,
  Save,
  ArrowUpRight,
  LogOut,
  FileText,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { type Course, type Resource, kinds } from "@/lib/catalog";
import {
  Breadcrumbs,
  LoadingState,
  Picker,
  EmptyState,
  PageControls,
} from "./wiki-controls";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Markdown } from "./markdown";
type AdminData = {
  admin: boolean;
  configured: boolean;
  user: { displayName: string; userId: string } | null;
  courses?: Course[];
  resources?: Resource[];
  resourceTotal?: number;
  page?: number;
  pages?: number;
};
type ResourceDraft = Partial<Resource> &
  Pick<
    Resource,
    | "title"
    | "course_id"
    | "format"
    | "kind"
    | "status"
    | "attribution"
    | "rights_confirmed"
    | "modules"
    | "topic"
    | "description"
    | "url"
    | "body"
    | "version"
  >;
const blankResource: ResourceDraft = {
  title: "",
  course_id: "",
  format: "file",
  kind: "lecture",
  status: "draft",
  attribution: "",
  rights_confirmed: 0,
  modules: "",
  topic: "",
  description: "",
  url: "",
  body: "",
  version: 0,
};
const blankCourse = {
  id: "",
  title: "",
  study_year: 1,
  academic_year: "2026/2027",
  modules: "1,2",
  category: "Core",
  description: "",
  source_url: "",
};
const statuses: Record<string, string> = {
  draft: "Черновик",
  published: "Опубликован",
  archived: "Архив",
};
export function AdminPanel() {
  const [data, setData] = useState<AdminData | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [activation, setActivation] = useState(""),
    [draft, setDraft] = useState<ResourceDraft>(blankResource),
    [files, setFiles] = useState<File[]>([]),
    [editorOpen, setEditorOpen] = useState(false),
    [courseOpen, setCourseOpen] = useState(false),
    [courseDraft, setCourseDraft] = useState(blankCourse),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1);
  const fileInput = useRef<HTMLInputElement>(null);
  const listRequest = useRef<AbortController | null>(null);
  const editorRequest = useRef(0);
  const update = (key: string, value: unknown) =>
    setDraft((d) => ({ ...d, [key]: value }));
  async function load() {
    listRequest.current?.abort();
    const controller = new AbortController();
    listRequest.current = controller;
    const response = await fetch(
      "/api/admin?" +
        new URLSearchParams({ q: query, status, page: String(page) }),
      { signal: controller.signal },
    );
    const next = (await readResponse(response)) as AdminData & {
      error?: string;
    };
    if (!response.ok) throw new Error(next.error);
    setData(next);
    if (!editorOpen && !courseOpen) setError("");
  }
  useEffect(() => {
    const timer = setTimeout(
      () =>
        load().catch((e) => {
          if (e.name !== "AbortError") setError(e.message);
        }),
      180,
    );
    return () => {
      clearTimeout(timer);
      listRequest.current?.abort();
    };
  }, [query, status, page]);
  async function activate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: activation }),
      });
      const result = (await readResponse(response)) as {
        id: string;
        version: number;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error);
      setActivation("");
      await load();
      toast.success("Доступ администратора активирован");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function editResource(r?: Resource) {
    const requestId = ++editorRequest.current;
    setError("");
    try {
      if (r) {
        const response = await fetch(
          "/api/admin?id=" + encodeURIComponent(r.id),
        );
        const result = (await readResponse(response)) as {
          resource: Resource;
          error?: string;
        };
        if (!response.ok) throw new Error(result.error);
        if (requestId !== editorRequest.current) return;
        setDraft(result.resource);
      } else {
        setDraft({
          ...blankResource,
          id: crypto.randomUUID(),
          course_id: data?.courses?.[0]?.id || "",
        });
      }
      setFiles([]);
      setEditorOpen(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function saveResource(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    let saved = 0;
    try {
      const pending = draft.format === "file" && files.length ? files : [null];
      for (let i = 0; i < pending.length; i++) {
        const file = pending[i];
        const form = new FormData();
        Object.entries(draft).forEach(([key, value]) =>
          form.set(key, String(value ?? "")),
        );
        if (file) {
          form.set("file", file);
          if (pending.length > 1) {
            form.set("title", file.name.replace(/\.[^.]+$/, ""));
            form.set("id", crypto.randomUUID());
          }
        }
        const response = await fetch("/api/admin/resources", {
          method: "PUT",
          body: form,
        });
        const result = (await readResponse(response)) as {
          id: string;
          version: number;
          error?: string;
        };
        if (!response.ok) throw new Error(result.error);
        saved++;
      }
      setEditorOpen(false);
      setFiles([]);
      setDraft(blankResource);
      await load().catch(() =>
        toast.info(
          "Материал сохранён. Обновите страницу, чтобы перечитать список.",
        ),
      );
      toast.success(
        saved > 1 ? `Загружено материалов: ${saved}` : "Материал сохранён",
      );
    } catch (e) {
      if (saved) {
        setFiles(files.slice(saved));
        toast.info(
          `Уже сохранено: ${saved}. Остальные файлы остались в форме.`,
        );
        await load().catch(() => {});
      }
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveCourse(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseDraft),
      });
      const result = (await readResponse(response)) as {
        id: string;
        version: number;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error);
      setCourseOpen(false);
      await load().catch(() => toast.info("Курс сохранён. Обновите список."));
      toast.success("Курс сохранён");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const courseOptions =
    data?.courses?.map((c) => ({
      value: c.id,
      label: `${c.title} · ${c.study_year} курс · ${c.academic_year}`,
    })) || [];
  return (
    <>
      <Breadcrumbs items={[{ label: "Управление" }]} />
      <div className="page-heading">
        <span className="page-eyebrow">
          <Shield size={16} /> РЕДАКТОРСКАЯ
        </span>
        <h1>Знания в хороших руках.</h1>
        <p>Курсы, учебные файлы и публикации.</p>
      </div>
      {error && !editorOpen && !courseOpen && (
        <div className="error-banner" role="alert">
          {error}
          <button
            className="button"
            onClick={() => load().catch((e) => setError(e.message))}
          >
            Повторить загрузку
          </button>
        </div>
      )}
      {!data && !error ? (
        <LoadingState />
      ) : !data ? null : !data.user ? (
        <div className="prose-card auth-card">
          <Shield size={34} />
          <h2>Вход для администратора</h2>
          <p>
            Просматривать опубликованные материалы можно без прав редактора. Для
            управления войдите в аккаунт.
          </p>
          <a
            className="button primary"
            href="/signin-with-chatgpt?return_to=%2Fadmin"
            target="_top"
          >
            Войти через ChatGPT <ArrowUpRight size={16} />
          </a>
        </div>
      ) : !data.admin ? (
        <div className="prose-card auth-card">
          <h2>
            {data.configured
              ? "Нет доступа к управлению"
              : "Первичная настройка"}
          </h2>
          <p>Вы вошли как {data.user.displayName}.</p>
          {data.configured ? (
            <p>Этот аккаунт не назначен администратором.</p>
          ) : (
            <form onSubmit={activate}>
              <p>
                Введите одноразовый ключ из серверной конфигурации. Он закрепит
                роль администратора за вашим аккаунтом.
              </p>
              <label className="field">
                Ключ активации
                <input
                  type="password"
                  autoComplete="off"
                  value={activation}
                  onChange={(e) => setActivation(e.target.value)}
                  required
                />
              </label>
              <button className="button primary" disabled={busy}>
                Активировать доступ
              </button>
            </form>
          )}
          <a
            className="text-link"
            href="/signout-with-chatgpt?return_to=%2Fadmin"
            target="_top"
          >
            Выйти из аккаунта
          </a>
        </div>
      ) : (
        <>
          <div className="admin-toolbar">
            <span>
              <Shield size={16} />
              {data.user.displayName}
            </span>
            <a href="/signout-with-chatgpt?return_to=%2Fadmin" target="_top">
              <LogOut size={15} /> Выйти
            </a>
          </div>
          <Tabs defaultValue="resources">
            <div className="admin-tabs-row">
              <TabsList>
                <TabsTrigger value="resources">
                  Материалы ({data.resourceTotal || 0})
                </TabsTrigger>
                <TabsTrigger value="courses">
                  Курсы ({data.courses?.length || 0})
                </TabsTrigger>
              </TabsList>
              <button className="button primary" onClick={() => editResource()}>
                <Plus size={17} /> Добавить материал
              </button>
            </div>
            <TabsContent value="resources">
              <div className="filter-row admin-filters">
                <label className="catalog-search">
                  <Search size={18} />
                  <input
                    aria-label="Поиск в управлении"
                    placeholder="Найти материал"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(1);
                    }}
                  />
                </label>
                <Picker
                  label="Статус"
                  value={status}
                  onChange={(v) => {
                    setStatus(v);
                    setPage(1);
                  }}
                  options={[
                    { value: "", label: "Все статусы" },
                    ...Object.entries(statuses).map(([value, label]) => ({
                      value,
                      label,
                    })),
                  ]}
                />
              </div>
              {data.resources?.length ? (
                <div className="admin-resource-list">
                  {data.resources.map((r) => (
                    <button
                      className="admin-resource"
                      onClick={() => editResource(r)}
                      key={r.id}
                    >
                      <FileText size={23} />
                      <span>
                        <strong>{r.title}</strong>
                        <small>
                          {r.course_title} · {kinds[r.kind]}
                        </small>
                      </span>
                      <span className={`status-badge status-${r.status}`}>
                        {statuses[r.status]}
                      </span>
                      <span>Изменить</span>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Материалы не найдены"
                  description="Выберите файл, напишите заметку в Markdown или добавьте полезную ссылку. Новые записи сохраняются как черновики."
                />
              )}
              <PageControls
                page={data.page || 1}
                pages={data.pages || 1}
                onChange={setPage}
              />
            </TabsContent>
            <TabsContent value="courses">
              <div className="section-heading">
                <p className="filter-note">
                  Названия и периоды можно дополнять по мере обновления
                  программы.
                </p>
                <button
                  className="button"
                  onClick={() => {
                    setCourseDraft({ ...blankCourse, id: crypto.randomUUID() });
                    setError("");
                    setCourseOpen(true);
                  }}
                >
                  <Plus size={16} /> Новый курс
                </button>
              </div>
              <div className="admin-resource-list">
                {data.courses?.map((c) => (
                  <button
                    className="admin-resource"
                    key={c.id}
                    onClick={() => {
                      setCourseDraft(c);
                      setError("");
                      setCourseOpen(true);
                    }}
                  >
                    <span className="year-number">0{c.study_year}</span>
                    <span>
                      <strong>{c.title}</strong>
                      <small>
                        {c.academic_year} · Модули {c.modules || "не указаны"}
                      </small>
                    </span>
                    <span>Изменить</span>
                  </button>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
      <Dialog
        open={editorOpen}
        onOpenChange={(open) => {
          if (!busy) setEditorOpen(open);
        }}
      >
        <DialogContent className="editor-dialog">
          <DialogHeader>
            <DialogTitle>
              {draft.version ? "Редактирование материала" : "Новый материал"}
            </DialogTitle>
            <DialogDescription>
              Файл, ссылка или заметка — всё будет связано с выбранным курсом.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveResource} className="editor-form">
            <div className="form-grid">
              <label className="field full">
                Дисциплина
                <Picker
                  label="Дисциплина"
                  value={draft.course_id}
                  onChange={(v) => {
                    update("course_id", v);
                    update("modules", "");
                  }}
                  options={courseOptions}
                />
              </label>
              <label className="field">
                Формат
                <Picker
                  label="Формат"
                  value={draft.format}
                  onChange={(v) => {
                    update("format", v);
                    update("body", "");
                    update("url", "");
                    setFiles([]);
                  }}
                  options={[
                    { value: "file", label: "Загрузить файл" },
                    { value: "markdown", label: "Текст Markdown" },
                    { value: "link", label: "Внешняя ссылка" },
                  ]}
                />
              </label>
              <label className="field">
                Тип материала
                <Picker
                  label="Тип материала"
                  value={draft.kind}
                  onChange={(v) => update("kind", v)}
                  options={Object.entries(kinds).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </label>
              {draft.format === "file" && (
                <div className="upload-field full">
                  <Upload size={25} />
                  <label htmlFor="resource-file">
                    {draft.filename ? "Заменить текущий файл" : "Выбрать файлы"}
                  </label>
                  <input
                    id="resource-file"
                    ref={fileInput}
                    type="file"
                    multiple={!draft.version}
                    accept=".pdf,.docx,.pptx,.xlsx,.md,.txt,.csv,.ipynb"
                    onChange={(e) => {
                      const chosen = Array.from(e.target.files || []);
                      setFiles(chosen);
                      if (!draft.title && chosen[0])
                        update("title", chosen[0].name.replace(/\.[^.]+$/, ""));
                    }}
                  />
                  <p>
                    PDF, Office, Markdown, TXT, CSV, IPYNB · до 16 МБ на файл
                  </p>
                  {draft.filename && (
                    <small>
                      Текущий: {draft.filename}. При замене ссылка сохранится.
                    </small>
                  )}
                  {files.length > 0 && (
                    <small>
                      Выбрано: {files.map((f) => f.name).join(", ")}
                    </small>
                  )}
                  {files.length > 1 && (
                    <p>
                      Каждый файл станет отдельным материалом. Названия берутся
                      из имён файлов, остальные поля общие.
                    </p>
                  )}
                </div>
              )}
              <label className="field full">
                Название
                <input
                  required
                  maxLength={200}
                  value={draft.title}
                  onChange={(e) => update("title", e.target.value)}
                />
              </label>
              <label className="field">
                Тема
                <input
                  maxLength={200}
                  placeholder="Например: пределы и непрерывность"
                  value={draft.topic}
                  onChange={(e) => update("topic", e.target.value)}
                />
              </label>
              <label className="field">
                Модули
                <input
                  placeholder="1,2 — или оставьте пустым"
                  value={draft.modules}
                  onChange={(e) => update("modules", e.target.value)}
                />
              </label>
              <label className="field full">
                Описание
                <textarea
                  rows={3}
                  maxLength={5000}
                  value={draft.description}
                  onChange={(e) => update("description", e.target.value)}
                />
              </label>
              {draft.format === "link" && (
                <label className="field full">
                  Ссылка
                  <input
                    type="url"
                    required
                    placeholder="https://"
                    value={draft.url}
                    onChange={(e) => update("url", e.target.value)}
                  />
                </label>
              )}
              {draft.format === "markdown" && (
                <div className="field full">
                  <Tabs defaultValue="write">
                    <TabsList>
                      <TabsTrigger value="write">Текст</TabsTrigger>
                      <TabsTrigger value="preview">Предпросмотр</TabsTrigger>
                    </TabsList>
                    <TabsContent value="write">
                      <textarea
                        aria-label="Текст Markdown"
                        className="markdown-editor"
                        rows={12}
                        maxLength={200000}
                        value={draft.body}
                        onChange={(e) => update("body", e.target.value)}
                        placeholder="# Тема занятия&#10;&#10;Ваши заметки..."
                      />
                    </TabsContent>
                    <TabsContent value="preview">
                      <div className="markdown-preview">
                        <Markdown text={draft.body} />
                      </div>
                    </TabsContent>
                  </Tabs>
                  <small>
                    Заголовки, списки, **жирный**, `код`, блоки кода и ссылки.
                    HTML отображается текстом.
                  </small>
                </div>
              )}
              <label className="field full">
                Автор / источник и основание для публикации
                <input
                  maxLength={1000}
                  placeholder="Автор, ссылка и лицензия / разрешение / собственная работа"
                  value={draft.attribution}
                  onChange={(e) => update("attribution", e.target.value)}
                />
              </label>
              <label className="checkbox-field full">
                <Checkbox
                  checked={!!draft.rights_confirmed}
                  onCheckedChange={(v) =>
                    update("rights_confirmed", v === true ? 1 : 0)
                  }
                />{" "}
                Я подтверждаю право размещать этот материал
              </label>
              <label className="field">
                Статус
                <Picker
                  label="Статус материала"
                  value={draft.status}
                  onChange={(v) => update("status", v)}
                  options={Object.entries(statuses).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </label>
              <div className="field status-explanation">
                {draft.status === "published"
                  ? "Материал будет виден всем посетителям."
                  : "Материал доступен только администратору."}
              </div>
            </div>
            {error && (
              <div className="error-banner" role="alert">
                {error}
              </div>
            )}
            <div className="form-actions">
              {draft.version > 0 && (
                <a
                  className="text-link"
                  href={`/resources/${draft.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Открыть страницу <ArrowUpRight size={15} />
                </a>
              )}
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => setEditorOpen(false)}
              >
                Отмена
              </button>
              <button className="button primary" disabled={busy}>
                <Save size={17} />
                {busy ? "Сохраняем…" : "Сохранить"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={courseOpen}
        onOpenChange={(open) => {
          if (!busy) setCourseOpen(open);
        }}
      >
        <DialogContent className="editor-dialog">
          <DialogHeader>
            <DialogTitle>
              {courseDraft.id ? "Редактирование курса" : "Новый курс"}
            </DialogTitle>
            <DialogDescription>
              Добавляйте только подтверждённые сведения об учебной программе.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveCourse} className="editor-form">
            <div className="form-grid">
              <label className="field full">
                Название
                <input
                  required
                  maxLength={180}
                  value={courseDraft.title}
                  onChange={(e) =>
                    setCourseDraft({ ...courseDraft, title: e.target.value })
                  }
                />
              </label>
              <label className="field">
                Год обучения
                <Picker
                  label="Год обучения"
                  value={String(courseDraft.study_year)}
                  onChange={(v) =>
                    setCourseDraft({ ...courseDraft, study_year: +v })
                  }
                  options={[1, 2, 3, 4].map((y) => ({
                    value: String(y),
                    label: `${y} курс`,
                  }))}
                />
              </label>
              <label className="field">
                Учебный год
                <input
                  required
                  placeholder="2026/2027"
                  value={courseDraft.academic_year}
                  onChange={(e) =>
                    setCourseDraft({
                      ...courseDraft,
                      academic_year: e.target.value,
                    })
                  }
                />
              </label>
              <label className="field">
                Модули
                <input
                  placeholder="1,2,3,4"
                  value={courseDraft.modules}
                  onChange={(e) =>
                    setCourseDraft({ ...courseDraft, modules: e.target.value })
                  }
                />
              </label>
              <label className="field">
                Группа / специализация
                <input
                  value={courseDraft.category}
                  onChange={(e) =>
                    setCourseDraft({ ...courseDraft, category: e.target.value })
                  }
                />
              </label>
              <label className="field full">
                Описание
                <textarea
                  rows={5}
                  value={courseDraft.description}
                  onChange={(e) =>
                    setCourseDraft({
                      ...courseDraft,
                      description: e.target.value,
                    })
                  }
                />
              </label>
              <label className="field full">
                Страница источника
                <input
                  type="url"
                  value={courseDraft.source_url}
                  onChange={(e) =>
                    setCourseDraft({
                      ...courseDraft,
                      source_url: e.target.value,
                    })
                  }
                />
              </label>
            </div>
            {error && (
              <div className="error-banner" role="alert">
                {error}
              </div>
            )}
            <div className="form-actions">
              <button className="button primary" disabled={busy}>
                {busy ? "Сохраняем…" : "Сохранить курс"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
