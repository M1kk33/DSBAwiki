import { requestLocale, translateError } from "./i18n";
import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { seedCourses, type Course, type Resource } from "./catalog";
import wikiCourseDescriptions from "@/content/course-descriptions.json";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function database() {
  if (!env.DB) throw new HttpError(503, "База данных временно недоступна.");
  return env.DB;
}
export function bucket() {
  if (!env.BUCKET)
    throw new HttpError(503, "Хранилище файлов временно недоступно.");
  return env.BUCKET;
}
export async function initializeCatalog() {
  const db = database();
  const catalogImported = await db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .bind("catalog_imported")
    .first();
  if (!catalogImported) {
    // An idempotent, transactional import of catalogue metadata. Migrations own the schema.
    await db.batch([
      ...seedCourses.map((c) =>
        db
          .prepare(
            "INSERT OR IGNORE INTO courses (id,title,study_year,academic_year,modules,category,description,source_url,source_exists,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
          )
          .bind(
            c.id,
            c.title,
            c.study_year,
            c.academic_year,
            c.modules,
            c.category,
            c.description,
            c.source_url,
            c.source_exists,
            c.updated_at,
          ),
      ),
      db
        .prepare("INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)")
        .bind("catalog_imported", "reference-97638"),
    ]);
  }

  const descriptionsImported = await db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .bind("wiki_course_descriptions_imported")
    .first();
  if (descriptionsImported?.value === "course-summaries-v2") return;

  const importedAt = new Date().toISOString();
  const refreshedDescriptions = wikiCourseDescriptions.filter((course) =>
    ["ref-001", "ref-015", "ref-026"].includes(course.id),
  );
  await db.batch([
    ...refreshedDescriptions.map((course) =>
      db
        .prepare(
          "UPDATE courses SET description=?,updated_at=? WHERE id=? AND title=? AND source_url=? AND (description LIKE '%Full information on the course can be found on the official website of HSE%' OR description LIKE '%This page contains basic information for the course Calculus-2%')",
        )
        .bind(
          course.description,
          importedAt,
          course.id,
          course.title,
          course.courseSourceUrl,
        ),
    ),
    db
      .prepare("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
      .bind("wiki_course_descriptions_imported", "course-summaries-v2"),
  ]);
}
export async function getCourses() {
  await initializeCatalog();
  return (
    await database()
      .prepare(
        "SELECT c.*, (SELECT COUNT(*) FROM resources r WHERE r.course_id = c.id AND r.status = 'published') AS resource_count FROM courses c ORDER BY c.academic_year DESC,c.study_year,c.rowid",
      )
      .all<Course>()
  ).results;
}
export async function getResources(
  admin = false,
  params = new URLSearchParams(),
) {
  const clauses: string[] = [];
  const values: (string | number)[] = [];
  const add = (sql: string, value: string | number) => {
    clauses.push(sql);
    values.push(value);
  };
  if (!admin) add("r.status=?", "published");
  else if (params.get("status")) add("r.status=?", params.get("status")!);
  if (params.get("assessment") === "1")
    clauses.push("r.kind IN ('exam','solution')");
  for (const [param, column] of [
    ["course", "r.course_id"],
    ["kind", "r.kind"],
    ["year", "c.study_year"],
    ["academic", "c.academic_year"],
    ["category", "c.category"],
  ]) {
    if (params.get(param)) add(`${column}=?`, params.get(param)!);
  }
  const q = (params.get("q") || "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .slice(0, 200);
  if (q) {
    const titles = await database()
      .prepare("SELECT id,title FROM courses")
      .all<{ id: string; title: string }>();
    const matchingIds = titles.results
      .filter((c) => c.title.normalize("NFKC").toLocaleLowerCase().includes(q))
      .map((c) => c.id);
    add(
      "(instr(r.search_text,?) > 0 OR r.course_id IN (SELECT value FROM json_each(?)))",
      q,
    );
    values.push(JSON.stringify(matchingIds));
  }
  const period = "CASE WHEN r.modules='' THEN c.modules ELSE r.modules END";
  if (params.get("module")) add(`instr(${period},?)>0`, params.get("module")!);
  if (params.get("semester")) {
    const mods = params.get("semester") === "1" ? ["1", "2"] : ["3", "4"];
    add(`(instr(${period},?)>0 OR instr(${period},?)>0)`, mods[0]);
    values.push(mods[1]);
  }
  const where = clauses.length ? " WHERE " + clauses.join(" AND ") : "";
  const from = " FROM resources r JOIN courses c ON c.id=r.course_id";
  const total =
    (
      await database()
        .prepare("SELECT COUNT(*) AS total" + from + where)
        .bind(...values)
        .first<{ total: number }>()
    )?.total || 0;
  const limit = Math.min(
    100,
    Math.max(1, Math.floor(Number(params.get("limit")) || 48)),
  );
  const pages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(
    pages,
    Math.max(1, Math.floor(Number(params.get("page")) || 1)),
  );
  // Body and object keys are fetched only for the individual resource/editor.
  const columns =
    "r.id,r.course_id,r.title,r.description,r.topic,r.kind,r.format,r.url,r.status,r.attribution,r.rights_confirmed,r.filename,r.mime,r.size,r.modules,r.updated_at,r.created_at,r.version,c.title AS course_title,c.study_year,c.academic_year";
  const resources = (
    await database()
      .prepare(
        "SELECT " +
          columns +
          from +
          where +
          " ORDER BY r.updated_at DESC,r.id LIMIT ? OFFSET ?",
      )
      .bind(...values, limit, (page - 1) * limit)
      .all<Resource>()
  ).results;
  return { resources, resourceTotal: total, page, pages };
}
export async function getAdmin() {
  const user = await getChatGPTUser();
  if (!user) return null;
  const role = await database()
    .prepare("SELECT role FROM editors WHERE user_id = ?")
    .bind(user.userId)
    .first<{ role: string }>();
  return role?.role === "admin" ? user : null;
}
export async function requireAdmin() {
  const user = await getAdmin();
  if (!user) throw new HttpError(403, "Требуется доступ администратора.");
  return user;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new HttpError(403, "Запрос отклонён: неверный источник.");
}
export async function boundedBody(request: Request, limit = 17 * 1024 * 1024) {
  const declared = Number(request.headers.get("content-length"));
  if (declared > limit)
    throw new HttpError(413, "Файл слишком большой. Максимум — 16 МБ.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Пустой запрос.");
  let total = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new HttpError(413, "Превышен допустимый размер запроса.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const part of chunks) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}
export async function readJson(request: Request, limit = 350000) {
  try {
    return JSON.parse(
      new TextDecoder().decode(await boundedBody(request, limit)),
    );
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(400, "Некорректный JSON.");
  }
}
export const noStore = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
export function apiError(error: unknown, request: Request) {
  if (error instanceof HttpError)
    return Response.json(
      {
        error: translateError(error.message, requestLocale(request)),
        errorKey: error.message,
      },
      { status: error.status, headers: noStore },
    );
  console.error("wiki_api_error", error);
  const errorKey =
    "Не удалось выполнить операцию. Попробуйте ещё раз; введённые данные сохранены в форме.";
  return Response.json(
    { error: translateError(errorKey, requestLocale(request)), errorKey },
    { status: 503, headers: noStore },
  );
}
