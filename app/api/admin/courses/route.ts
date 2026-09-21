import {
  apiError,
  database,
  HttpError,
  noStore,
  readJson,
  requireAdmin,
  sameOrigin,
} from "@/lib/server";
import { courseSchema } from "@/lib/validation";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await requireAdmin();
    const body = await readJson(request);
    const parsed = courseSchema.safeParse(body);
    if (!parsed.success)
      throw new HttpError(
        400,
        parsed.error.issues.map((i) => i.message).join(" "),
      );
    const c = parsed.data;
    const id = body.id || crypto.randomUUID();
    if (typeof id !== "string" || id.length > 100)
      throw new HttpError(400, "Некорректный идентификатор.");
    const db = database();
    const old = await db
      .prepare("SELECT updated_at FROM courses WHERE id=?")
      .bind(id)
      .first<{ updated_at: string }>();
    const now = new Date().toISOString();
    const values = [
      c.title,
      c.study_year,
      c.academic_year,
      c.modules,
      c.category,
      c.description,
      c.source_url,
      c.source_url ? 1 : 0,
      now,
    ];
    if (old) {
      if (body.updated_at !== old.updated_at)
        throw new HttpError(409, "Курс уже изменён. Откройте редактор заново.");
      const result = await db
        .prepare(
          "UPDATE courses SET title=?,study_year=?,academic_year=?,modules=?,category=?,description=?,source_url=?,source_exists=?,updated_at=? WHERE id=? AND updated_at=?",
        )
        .bind(...values, id, old.updated_at)
        .run();
      if (!result.meta.changes)
        throw new HttpError(409, "Курс уже изменён другим запросом.");
    } else {
      await db
        .prepare(
          "INSERT INTO courses (title,study_year,academic_year,modules,category,description,source_url,source_exists,updated_at,id) VALUES (?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(...values, id)
        .run();
    }
    return Response.json({ id, updated_at: now }, { headers: noStore });
  } catch (e) {
    return apiError(e);
  }
}
