import type { ZodError } from "zod";
import { createTranslator } from "./i18n";

const t = createTranslator("ru");
const fields: Record<string, string> = {
  title: "Название",
  study_year: "Год обучения",
  academic_year: "Учебный год",
  modules: "Модули",
  category: "Направление",
  description: "Описание",
  source_url: "Источник",
  course_id: "Дисциплина",
  topic: "Тема",
  kind: "Тип материала",
  format: "Формат",
  url: "Ссылка",
  body: "Текст",
  status: "Статус",
  attribution: "Автор / источник",
  rights_confirmed: "Права на публикацию",
  version: "Версия",
};

/** Canonical, human-readable errors; no global Zod locale or request state. */
export function validationMessage(error: ZodError): string {
  return error.issues
    .map((issue) => {
    if (
      (issue.code === "custom" || issue.code === "invalid_string") &&
      /[а-яё]/i.test(issue.message)
    ) return issue.message;
      const field = fields[String(issue.path[0])] || "Значение";
      let reason = "Проверьте значение поля.";
      if (issue.code === "too_small")
        reason =
          issue.type === "string"
            ? t`Минимум символов: ${issue.minimum}.`
            : t`Минимальное значение: ${issue.minimum}.`;
      if (issue.code === "too_big")
        reason =
          issue.type === "string"
            ? t`Максимум символов: ${issue.maximum}.`
            : t`Максимальное значение: ${issue.maximum}.`;
      if (issue.code === "invalid_enum_value")
        reason = "Выберите значение из списка.";
      if (issue.code === "invalid_type")
        reason = "Заполните поле в нужном формате.";
      if (issue.path[0] === "academic_year")
        reason = "Укажите учебный год в формате 2026/2027.";
      return t`Поле «${field}»: ${reason}`;
    })
    .join("; ");
}
