"use client";
import { useI18n, LanguageToggle } from "@/components/wiki-locale";
import { readResponse, errorMessage } from "@/lib/client";
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
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { type Course, type Resource, kinds } from "@/lib/catalog";
import { formatResourceCount } from "@/lib/i18n";
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
  const { t, errorText, locale } = useI18n();
  const [data, setData] = useState<AdminData | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [activation, setActivation] = useState(""),
    [draft, setDraft] = useState<ResourceDraft>(blankResource),
    [files, setFiles] = useState<File[]>([]),
    [isDraggingFiles, setIsDraggingFiles] = useState(false),
    [editorOpen, setEditorOpen] = useState(false),
    [courseOpen, setCourseOpen] = useState(false),
    [courseDraft, setCourseDraft] = useState(blankCourse),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1);
  const listRequest = useRef<AbortController | null>(null);
  const editorRequest = useRef(0);
  const update = (key: string, value: unknown) =>
    setDraft((d) => ({ ...d, [key]: value }));
  function selectFiles(incoming: File[]) {
    const allowed = new Set([
      "pdf",
      "docx",
      "pptx",
      "xlsx",
      "md",
      "txt",
      "csv",
      "ipynb",
    ]);
    const accepted = incoming.filter((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase();
      return extension && allowed.has(extension);
    });
    if (accepted.length < incoming.length)
      toast.error(t("Поддерживаются PDF, DOCX, PPTX, XLSX, TXT, MD, CSV и IPYNB."));
    if (draft.version && accepted.length > 1)
      toast.info(t("Для замены можно выбрать только один файл."));
    const chosen = draft.version ? accepted.slice(0, 1) : accepted;
    if (chosen.length === 0) return;
    setFiles(chosen);
    if (!draft.title && chosen[0])
      update("title", chosen[0].name.replace(/\.[^.]+$/, ""));
  }
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
      errorKey?: string;
      error?: string;
    };
    if (!response.ok) throw new Error(next.errorKey || next.error);
    setData(next);
    if (!editorOpen && !courseOpen) setError("");
  }
  useEffect(() => {
    const timer = setTimeout(
      () =>
        load().catch((e) => {
          if (e.name !== "AbortError") setError(errorMessage(e));
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
        errorKey?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(result.errorKey || result.error);
      setActivation("");
      await load();
      toast.success(t("Доступ администратора активирован"));
    } catch (e) {
      setError(errorMessage(e));
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
          errorKey?: string;
          error?: string;
        };
        if (!response.ok) throw new Error(result.errorKey || result.error);
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
      setError(errorMessage(e));
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
          errorKey?: string;
          error?: string;
        };
        if (!response.ok) throw new Error(result.errorKey || result.error);
        saved++;
      }
      setEditorOpen(false);
      setFiles([]);
      setDraft(blankResource);
      await load().catch(() =>
        toast.info(
          t("Материал сохранён. Обновите страницу, чтобы перечитать список."),
        ),
      );
      toast.success(
        saved > 1 ? t`Загружено: ${formatResourceCount(saved, locale)}` : t("Материал сохранён"),
      );
    } catch (e) {
      if (saved) {
        setFiles(files.slice(saved));
        toast.info(
          t`Уже сохранено: ${saved}. Остальные файлы остались в форме.`,
        );
        await load().catch(() => {});
      }
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function deleteResource(resource: Resource) {
    if (
      !window.confirm(
        t`Удалить материал «${resource.title}»? Это действие нельзя отменить.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({
        id: resource.id,
        version: String(resource.version),
      });
      const response = await fetch(`/api/admin/resources?${params}`, {
        method: "DELETE",
      });
      const result = (await readResponse(response)) as {
        errorKey?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(result.errorKey || result.error);
      await load();
      toast.success(t`Материал «${resource.title}» удалён.`);
    } catch (e) {
      setError(errorMessage(e));
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
        errorKey?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(result.errorKey || result.error);
      setCourseOpen(false);
      await load().catch(() =>
        toast.info(t("Курс сохранён. Обновите список.")),
      );
      toast.success(t("Курс сохранён"));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const courseOptions =
    data?.courses?.map((c) => ({
      value: c.id,
      label: t`${c.title} · ${c.study_year} курс · ${c.academic_year}`,
    })) || [];
  return (
    <>
      <Breadcrumbs items={[{ label: t("Управление") }]} />
      <div className="page-heading">
        <span className="page-eyebrow">
          <Shield size={16} /> {t("РЕДАКТОРСКАЯ")}
        </span>
        <h1>{t("Знания в хороших руках.")}</h1>
        <p>{t("Курсы, учебные файлы и публикации.")}</p>
      </div>
      {error && !editorOpen && !courseOpen && (
        <div className="error-banner" role="alert">
          {errorText(error)}
          <button
            className="button"
            onClick={() => load().catch((e) => setError(errorMessage(e)))}
          >
            {t("Повторить загрузку")}
          </button>
        </div>
      )}
      {!data && !error ? (
        <LoadingState />
      ) : !data ? null : !data.user ? (
        <div className="prose-card auth-card">
          <Shield size={34} />
          <h2>{t("Вход для администратора")}</h2>
          <p>
            {t(
              "Просматривать опубликованные материалы можно без прав редактора. Для управления войдите в аккаунт.",
            )}
          </p>
          <a
            className="button primary"
            href="/signin-with-chatgpt?return_to=%2Fadmin"
            target="_top"
          >
            {t("Войти через ChatGPT")} <ArrowUpRight size={16} />
          </a>
        </div>
      ) : !data.admin ? (
        <div className="prose-card auth-card">
          <h2>
            {data.configured
              ? t("Нет доступа к управлению")
              : t("Первичная настройка")}
          </h2>
          <p>
            {t("Вы вошли как")} {data.user.displayName}.
          </p>
          {data.configured ? (
            <p>{t("Этот аккаунт не назначен администратором.")}</p>
          ) : (
            <form onSubmit={activate}>
              <p>
                {t(
                  "Введите одноразовый ключ из серверной конфигурации. Он закрепит роль администратора за вашим аккаунтом.",
                )}
              </p>
              <label className="field">
                {t("Ключ активации")}
                <input
                  type="password"
                  autoComplete="off"
                  value={activation}
                  onChange={(e) => setActivation(e.target.value)}
                  required
                />
              </label>
              <button className="button primary" disabled={busy}>
                {t("Активировать доступ")}
              </button>
            </form>
          )}
          <a
            className="text-link"
            href="/signout-with-chatgpt?return_to=%2Fadmin"
            target="_top"
          >
            {t("Выйти из аккаунта")}
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
              <LogOut size={15} /> {t("Выйти")}
            </a>
          </div>
          <Tabs defaultValue="resources">
            <div className="admin-tabs-row">
              <TabsList>
                <TabsTrigger value="resources">
                  {t("Материалы (")}
                  {data.resourceTotal || 0})
                </TabsTrigger>
                <TabsTrigger value="courses">
                  {t("Курсы (")}
                  {data.courses?.length || 0})
                </TabsTrigger>
              </TabsList>
              <button className="button primary" onClick={() => editResource()}>
                <Plus size={17} /> {t("Добавить материал")}
              </button>
            </div>
            <TabsContent value="resources">
              <div className="filter-row admin-filters">
                <label className="catalog-search">
                  <Search size={18} />
                  <input
                    aria-label={t("Поиск в управлении")}
                    placeholder={t("Найти материал")}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(1);
                    }}
                  />
                </label>
                <Picker
                  label={t("Статус")}
                  value={status}
                  onChange={(v) => {
                    setStatus(v);
                    setPage(1);
                  }}
                  options={[
                    { value: "", label: t("Все статусы") },
                    ...Object.entries(statuses).map(([value, label]) => ({
                      value,
                      label: t(label),
                    })),
                  ]}
                />
              </div>
              {data.resources?.length ? (
                <div className="admin-resource-list">
                  {data.resources.map((r) => (
                    <div className="admin-resource" key={r.id}>
                      <FileText size={23} />
                      <span>
                        <strong>{r.title}</strong>
                        <small>
                          {r.course_title} · {t(kinds[r.kind])}
                        </small>
                      </span>
                      <span className={`status-badge status-${r.status}`}>
                        {t(statuses[r.status])}
                      </span>
                      <span className="admin-resource-actions">
                        <button
                          type="button"
                          className="admin-resource-edit"
                          disabled={busy}
                          onClick={() => editResource(r)}
                        >
                          {t("Изменить")}
                        </button>
                        <button
                          type="button"
                          className="admin-resource-delete"
                          aria-label={t`Удалить материал «${r.title}»`}
                          title={t("Удалить")}
                          disabled={busy}
                          onClick={() => deleteResource(r)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={t("Материалы не найдены")}
                  description={t(
                    "Выберите файл, напишите заметку в Markdown или добавьте полезную ссылку. Новые записи сохраняются как черновики.",
                  )}
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
                  {t(
                    "Названия и периоды можно дополнять по мере обновления программы.",
                  )}
                </p>
                <button
                  className="button"
                  onClick={() => {
                    setCourseDraft({ ...blankCourse, id: crypto.randomUUID() });
                    setError("");
                    setCourseOpen(true);
                  }}
                >
                  <Plus size={16} /> {t("Новый курс")}
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
                        {c.academic_year} {t("· Модули")}{" "}
                        {c.modules || t("не указаны")}
                      </small>
                    </span>
                    <span>{t("Изменить")}</span>
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
            <div className="flex items-center justify-between gap-3 pr-8">
              <DialogTitle>
                {draft.version
                  ? t("Редактирование материала")
                  : t("Новый материал")}
              </DialogTitle>
              <LanguageToggle />
            </div>
            <DialogDescription>
              {t(
                "Файл, ссылка или заметка — всё будет связано с выбранным курсом.",
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveResource} className="editor-form">
            <div className="form-grid">
              <label className="field full">
                {t("Дисциплина")}
                <Picker
                  label={t("Дисциплина")}
                  value={draft.course_id}
                  onChange={(v) => {
                    update("course_id", v);
                    update("modules", "");
                  }}
                  options={courseOptions}
                />
              </label>
              <label className="field">
                {t("Формат")}
                <Picker
                  label={t("Формат")}
                  value={draft.format}
                  onChange={(v) => {
                    update("format", v);
                    update("body", "");
                    update("url", "");
                    setFiles([]);
                  }}
                  options={[
                    { value: "file", label: t("Загрузить файл") },
                    { value: "markdown", label: t("Текст Markdown") },
                    { value: "link", label: t("Внешняя ссылка") },
                  ]}
                />
              </label>
              <label className="field">
                {t("Тип материала")}
                <Picker
                  label={t("Тип материала")}
                  value={draft.kind}
                  onChange={(v) => update("kind", v)}
                  options={Object.entries(kinds).map(([value, label]) => ({
                    value,
                    label: t(label),
                  }))}
                />
              </label>
              {draft.format === "file" && (
                <div
                  className={`upload-field full${isDraggingFiles ? " is-dragging" : ""}`}
                  aria-label={t("Область загрузки файла")}
                  onDragEnter={(event) => {
                    if (event.dataTransfer.types.includes("Files")) {
                      event.preventDefault();
                      setIsDraggingFiles(true);
                    }
                  }}
                  onDragOver={(event) => {
                    if (event.dataTransfer.types.includes("Files")) {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "copy";
                    }
                  }}
                  onDragLeave={(event) => {
                    const next = event.relatedTarget;
                    if (!next || !event.currentTarget.contains(next as Node))
                      setIsDraggingFiles(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDraggingFiles(false);
                    selectFiles(Array.from(event.dataTransfer.files));
                  }}
                >
                  <Upload size={25} />
                  <label htmlFor="resource-file">
                    {draft.filename
                      ? t("Заменить текущий файл")
                      : t("Выбрать файлы")}
                  </label>
                  <input
                    id="resource-file"
                    type="file"
                    multiple={!draft.version}
                    accept=".pdf,.docx,.pptx,.xlsx,.md,.txt,.csv,.ipynb"
                    onChange={(e) => {
                      selectFiles(Array.from(e.target.files || []));
                      e.currentTarget.value = "";
                    }}
                  />
                  <p>{t("Перетащите файлы сюда или выберите их через окно.")}</p>
                  <p>
                    {t(
                      "PDF, Office, Markdown, TXT, CSV, IPYNB · до 16 МБ на файл",
                    )}
                  </p>
                  {draft.filename && (
                    <small>
                      {t("Текущий:")} {draft.filename}
                      {t(". При замене ссылка сохранится.")}
                    </small>
                  )}
                  {files.length > 0 && (
                    <small>
                      {t("Выбрано:")} {files.map((f) => f.name).join(", ")}
                    </small>
                  )}
                  {files.length > 1 && (
                    <p>
                      {t(
                        "Каждый файл станет отдельным материалом. Названия берутся из имён файлов, остальные поля общие.",
                      )}
                    </p>
                  )}
                </div>
              )}
              <label className="field full">
                {t("Название")}
                <input
                  required
                  maxLength={200}
                  value={draft.title}
                  onChange={(e) => update("title", e.target.value)}
                />
              </label>
              <label className="field">
                {t("Тема")}
                <input
                  maxLength={200}
                  placeholder={t("Например: пределы и непрерывность")}
                  value={draft.topic}
                  onChange={(e) => update("topic", e.target.value)}
                />
              </label>
              <label className="field">
                {t("Модули")}
                <input
                  placeholder={t("1,2 — или оставьте пустым")}
                  value={draft.modules}
                  onChange={(e) => update("modules", e.target.value)}
                />
              </label>
              <label className="field full">
                {t("Описание")}
                <textarea
                  rows={3}
                  maxLength={5000}
                  value={draft.description}
                  onChange={(e) => update("description", e.target.value)}
                />
              </label>
              {draft.format === "link" && (
                <label className="field full">
                  {t("Ссылка")}
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
                      <TabsTrigger value="write">{t("Текст")}</TabsTrigger>
                      <TabsTrigger value="preview">
                        {t("Предпросмотр")}
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="write">
                      <textarea
                        aria-label={t("Текст Markdown")}
                        className="markdown-editor"
                        rows={12}
                        maxLength={200000}
                        value={draft.body}
                        onChange={(e) => update("body", e.target.value)}
                        placeholder={t("# Тема занятия\n\nВаши заметки...")}
                      />
                    </TabsContent>
                    <TabsContent value="preview">
                      <div className="markdown-preview">
                        <Markdown text={draft.body} />
                      </div>
                    </TabsContent>
                  </Tabs>
                  <small>
                    {t(
                      "Заголовки, списки, **жирный**, `код`, блоки кода и ссылки. HTML отображается текстом.",
                    )}
                  </small>
                </div>
              )}
              <label className="field full">
                {t("Автор / источник и основание для публикации")}
                <input
                  maxLength={1000}
                  placeholder={t(
                    "Автор, ссылка и лицензия / разрешение / собственная работа",
                  )}
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
                {t("Я подтверждаю право размещать этот материал")}
              </label>
              <label className="field">
                {t("Статус")}
                <Picker
                  label={t("Статус материала")}
                  value={draft.status}
                  onChange={(v) => update("status", v)}
                  options={Object.entries(statuses).map(([value, label]) => ({
                    value,
                    label: t(label),
                  }))}
                />
              </label>
              <div className="field status-explanation">
                {draft.status === "published"
                  ? t("Материал будет виден всем посетителям.")
                  : t("Материал доступен только администратору.")}
              </div>
            </div>
            {error && (
              <div className="error-banner" role="alert">
                {errorText(error)}
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
                  {t("Открыть страницу")} <ArrowUpRight size={15} />
                </a>
              )}
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => setEditorOpen(false)}
              >
                {t("Отмена")}
              </button>
              <button className="button primary" disabled={busy}>
                <Save size={17} />
                {busy ? t("Сохраняем…") : t("Сохранить")}
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
            <div className="flex items-center justify-between gap-3 pr-8">
              <DialogTitle>
                {courseDraft.id ? t("Редактирование курса") : t("Новый курс")}
              </DialogTitle>
              <LanguageToggle />
            </div>
            <DialogDescription>
              {t(
                "Добавляйте только подтверждённые сведения об учебной программе.",
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveCourse} className="editor-form">
            <div className="form-grid">
              <label className="field full">
                {t("Название")}
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
                {t("Год обучения")}
                <Picker
                  label={t("Год обучения")}
                  value={String(courseDraft.study_year)}
                  onChange={(v) =>
                    setCourseDraft({ ...courseDraft, study_year: +v })
                  }
                  options={[1, 2, 3, 4].map((y) => ({
                    value: String(y),
                    label: t`${y} курс`,
                  }))}
                />
              </label>
              <label className="field">
                {t("Учебный год")}
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
                {t("Модули")}
                <input
                  placeholder="1,2,3,4"
                  value={courseDraft.modules}
                  onChange={(e) =>
                    setCourseDraft({ ...courseDraft, modules: e.target.value })
                  }
                />
              </label>
              <label className="field">
                {t("Группа / специализация")}
                <input
                  value={courseDraft.category}
                  onChange={(e) =>
                    setCourseDraft({ ...courseDraft, category: e.target.value })
                  }
                />
              </label>
              <label className="field full">
                {t("Описание")}
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
                {t("Страница источника")}
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
                {errorText(error)}
              </div>
            )}
            <div className="form-actions">
              <button className="button primary" disabled={busy}>
                {busy ? t("Сохраняем…") : t("Сохранить курс")}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
