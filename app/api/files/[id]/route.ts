import { apiError, bucket, database, getAdmin, HttpError } from "@/lib/server";
import type { Resource } from "@/lib/catalog";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const r = await database()
      .prepare("SELECT * FROM resources WHERE id=?")
      .bind(id)
      .first<Resource>();
    if (!r || r.format !== "file" || !r.file_key)
      throw new HttpError(404, "Файл не найден.");
    if (r.status !== "published" && !(await getAdmin()))
      throw new HttpError(404, "Файл не найден.");
    const object = await bucket().get(r.file_key);
    if (!object) throw new HttpError(404, "Файл отсутствует в хранилище.");
    const inline =
      r.mime === "application/pdf" &&
      !new URL(request.url).searchParams.has("download");
    return new Response(object.body, {
      headers: {
        "Content-Type": r.mime,
        "Content-Length": String(object.size),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="resource.${
          r.filename
            .split(".")
            .pop()
            ?.replace(/[^a-z0-9]/gi, "") || "bin"
        }"; filename*=UTF-8''${encodeURIComponent(r.filename).replace(/'/g, "%27")}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy":
          "sandbox; default-src 'none'; frame-ancestors 'self'",
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  } catch (e) {
    return apiError(e, request);
  }
}
