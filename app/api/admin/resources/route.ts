import { validationMessage } from "@/lib/validation-errors";
import {
  apiError,
  boundedBody,
  bucket,
  database,
  HttpError,
  noStore,
  requireAdmin,
  sameOrigin,
} from "@/lib/server";
import { resourceSchema, validateFile } from "@/lib/validation";
import type { Resource } from "@/lib/catalog";
// PUT avoids Vinext's progressive server-action parsing of multipart POSTs.
// The handler owns streaming size checks and supports create/update by stable id.
export async function PUT(request: Request) {
  let newKey = "";
  try {
    sameOrigin(request);
    await requireAdmin();
    const data = await new Response(await boundedBody(request), {
      headers: { "Content-Type": request.headers.get("content-type") || "" },
    }).formData();
    const parsed = resourceSchema.safeParse(Object.fromEntries(data));
    if (!parsed.success)
      throw new HttpError(400, validationMessage(parsed.error));
    const r = parsed.data;
    const rawId = data.get("id");
    const id = typeof rawId === "string" && rawId ? rawId : crypto.randomUUID();
    if (id.length > 100)
      throw new HttpError(400, "Некорректный идентификатор.");
    const db = database();
    const course = await db
      .prepare("SELECT modules FROM courses WHERE id=?")
      .bind(r.course_id)
      .first<{ modules: string }>();
    if (!course) throw new HttpError(400, "Курс не найден.");
    if (
      r.modules &&
      r.modules.split(",").some((m) => !course.modules.split(",").includes(m))
    )
      throw new HttpError(
        400,
        "Модули материала должны входить в период курса.",
      );
    const old = await db
      .prepare("SELECT * FROM resources WHERE id=?")
      .bind(id)
      .first<Resource>();
    if ((old && r.version !== old.version) || (!old && r.version !== 0))
      throw new HttpError(
        409,
        "Материал уже изменён. Обновите страницу перед сохранением.",
      );
    let fileKey = r.format === "file" ? old?.file_key || "" : "";
    let filename = r.format === "file" ? old?.filename || "" : "";
    let mime = r.format === "file" ? old?.mime || "" : "";
    let size = r.format === "file" ? old?.size || 0 : 0;
    let body = r.format === "markdown" ? r.body.replace(/\r\n/g, "\n") : "";
    r.url = r.format === "link" ? r.url : "";
    const file = data.get("file");
    if (r.format === "file" && file instanceof File && file.name) {
      let checked;
      try {
        checked = await validateFile(file);
      } catch (e) {
        throw new HttpError(400, (e as Error).message);
      }
      newKey = `resources/${id}/${crypto.randomUUID()}.${checked.ext}`;
      await bucket().put(newKey, checked.bytes, {
        httpMetadata: { contentType: checked.mime },
      });
      fileKey = newKey;
      filename = file.name.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 220);
      mime = checked.mime;
      size = file.size;
      body = checked.text;
    } else if (r.format === "file") body = old?.body || "";
    if (r.format === "file" && !fileKey)
      throw new HttpError(400, "Выберите файл.");
    const now = new Date().toISOString();
    const searchText = [r.title, r.description, r.topic, r.attribution, body]
      .join(" ")
      .normalize("NFKC")
      .toLocaleLowerCase();
    const values = [
      r.course_id,
      r.title,
      r.description,
      r.topic,
      r.kind,
      r.format,
      r.url,
      body,
      searchText,
      r.status,
      r.attribution,
      r.rights_confirmed,
      fileKey,
      filename,
      mime,
      size,
      r.modules,
      now,
    ];
    if (old) {
      const result = await db
        .prepare(
          "UPDATE resources SET course_id=?,title=?,description=?,topic=?,kind=?,format=?,url=?,body=?,search_text=?,status=?,attribution=?,rights_confirmed=?,file_key=?,filename=?,mime=?,size=?,modules=?,updated_at=?,version=version+1 WHERE id=? AND version=?",
        )
        .bind(...values, id, old.version)
        .run();
      if (!result.meta.changes)
        throw new HttpError(409, "Материал уже изменён другим запросом.");
    } else {
      await db
        .prepare(
          "INSERT INTO resources (course_id,title,description,topic,kind,format,url,body,search_text,status,attribution,rights_confirmed,file_key,filename,mime,size,modules,updated_at,id,created_at,version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)",
        )
        .bind(...values, id, now)
        .run();
    }
    newKey = "";
    if (old?.file_key && old.file_key !== fileKey) {
      try {
        await bucket().delete(old.file_key);
      } catch (e) {
        console.error("orphan_file_cleanup", old.file_key, e);
      }
    }
    return Response.json(
      { id, version: (old?.version || 0) + 1 },
      { headers: noStore },
    );
  } catch (e) {
    if (newKey) {
      try {
        await bucket().delete(newKey);
      } catch (cleanupError) {
        console.error("orphan_file_cleanup", newKey, cleanupError);
      }
    }
    return apiError(e, request);
  }
}

export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    await requireAdmin();
    const params = new URL(request.url).searchParams;
    const id = params.get("id") || "";
    const version = Number(params.get("version"));
    if (!id || id.length > 100 || !Number.isInteger(version) || version < 1)
      throw new HttpError(400, "Некорректный идентификатор.");

    const db = database();
    const old = await db
      .prepare("SELECT file_key, version FROM resources WHERE id=?")
      .bind(id)
      .first<{ file_key: string; version: number }>();
    if (!old) throw new HttpError(404, "Материал не найден.");

    const result = await db
      .prepare("DELETE FROM resources WHERE id=? AND version=?")
      .bind(id, version)
      .run();
    if (!result.meta.changes)
      throw new HttpError(409, "Материал уже изменён другим запросом.");

    if (old.file_key) {
      try {
        await bucket().delete(old.file_key);
      } catch (e) {
        // The resource is gone from the catalogue; a failed object cleanup is only an orphan.
        console.error("orphan_file_cleanup", old.file_key, e);
      }
    }
    return Response.json({ id, deleted: true }, { headers: noStore });
  } catch (e) {
    return apiError(e, request);
  }
}
