import { z } from "zod";
import { unzipSync } from "fflate";
export const moduleSchema = z
  .string()
  .regex(/^(?:[1-4](?:,[1-4])*)?$/, "Укажите модули через запятую: 1,2,3,4")
  .transform((s) =>
    [...new Set(s.split(",").filter(Boolean))].sort().join(","),
  );
export const safeUrl = z
  .string()
  .max(2000)
  .refine((value) => {
    if (!value) return true;
    try {
      const u = new URL(value);
      return (
        ["https:", "http:"].includes(u.protocol) && !u.username && !u.password
      );
    } catch {
      return false;
    }
  }, "Нужна полная ссылка http:// или https://");
export const courseSchema = z.object({
  title: z.string().trim().min(1).max(180),
  study_year: z.coerce.number().int().min(1).max(4),
  academic_year: z
    .string()
    .regex(/^20\d{2}\/20\d{2}$/)
    .refine(
      (v) => Number(v.slice(5)) === Number(v.slice(0, 4)) + 1,
      "Учебный год должен включать два последовательных года.",
    ),
  modules: moduleSchema,
  category: z.string().trim().max(180),
  description: z.string().max(10000),
  source_url: safeUrl,
});
export const resourceSchema = z
  .object({
    course_id: z.string().min(1).max(100),
    title: z.string().trim().min(1).max(200),
    description: z.string().max(5000),
    topic: z.string().trim().max(200),
    kind: z.enum([
      "lecture",
      "seminar",
      "assignment",
      "solution",
      "exam",
      "textbook",
      "supplementary",
    ]),
    format: z.enum(["file", "markdown", "link"]),
    url: safeUrl,
    body: z.string().max(200000),
    status: z.enum(["draft", "published", "archived"]),
    attribution: z.string().trim().max(1000),
    rights_confirmed: z.coerce.number().int().min(0).max(1),
    modules: moduleSchema,
    version: z.coerce.number().int().min(0),
  })
  .superRefine((r, ctx) => {
    if (r.status === "published" && (!r.rights_confirmed || !r.attribution))
      ctx.addIssue({
        code: "custom",
        message:
          "Для публикации подтвердите права и укажите автора или источник.",
      });
    if (r.format === "link" && !r.url)
      ctx.addIssue({ code: "custom", message: "Укажите адрес ссылки." });
    if (r.format === "markdown" && !r.body.trim())
      ctx.addIssue({ code: "custom", message: "Добавьте текст материала." });
  });
export const MAX_FILE_BYTES = 16 * 1024 * 1024;
function validateOffice(bytes: Uint8Array, ext: string) {
  const expected: Record<string, string> = {
    docx: "word/document.xml",
    pptx: "ppt/presentation.xml",
    xlsx: "xl/workbook.xml",
  };
  let count = 0,
    total = 0;
  let archive: Record<string, Uint8Array>;
  try {
    archive = unzipSync(bytes, {
      filter: (file) => {
        count++;
        total += file.originalSize;
        if (
          count > 2000 ||
          total > 100 * 1024 * 1024 ||
          file.name.toLowerCase().includes("vbaproject.bin")
        )
          throw new Error();
        const wanted =
          file.name === "[Content_Types].xml" || file.name === expected[ext];
        if (wanted && file.originalSize > 2 * 1024 * 1024) throw new Error();
        return wanted;
      },
    });
  } catch {
    throw new Error(
      "Некорректный, слишком сложный или содержащий макросы документ Office.",
    );
  }
  const types = archive["[Content_Types].xml"],
    document = archive[expected[ext]];
  if (
    !types ||
    !document ||
    !new TextDecoder().decode(types).includes("ContentType=") ||
    !new TextDecoder().decode(document).includes("<")
  )
    throw new Error("Содержимое Office не соответствует расширению файла.");
}
export const fileTypes: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  ipynb: "application/x-ipynb+json",
};
export async function validateFile(file: File) {
  if (!file.size || file.size > MAX_FILE_BYTES)
    throw new Error("Размер файла должен быть от 1 байта до 16 МБ.");
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const mime = fileTypes[ext];
  if (!mime)
    throw new Error(
      "Поддерживаются PDF, DOCX, PPTX, XLSX, TXT, MD, CSV и IPYNB.",
    );
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (ext === "pdf" && new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
    throw new Error("Файл не содержит заголовок PDF.");
  if (["docx", "pptx", "xlsx"].includes(ext)) validateOffice(bytes, ext);
  if (
    ext === "pdf" &&
    !new TextDecoder().decode(bytes.slice(-2048)).includes("%%EOF")
  )
    throw new Error("PDF не содержит завершающий маркер документа.");
  let text = "";
  if (["txt", "md", "csv", "ipynb"].includes(ext)) {
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error("Текстовый файл должен быть в UTF-8.");
    }
    if (text.includes("\0"))
      throw new Error("Файл содержит недопустимые бинарные данные.");
    if (ext === "ipynb") {
      try {
        const doc = JSON.parse(text);
        if (!Array.isArray(doc.cells)) throw new Error();
      } catch {
        throw new Error("Некорректный Jupyter Notebook.");
      }
    }
    text = text.slice(0, 200000);
  }
  return { bytes, mime, ext, text };
}
