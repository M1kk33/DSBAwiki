import reference from "@/content/reference.json";
export const academicYear = reference.academicYear;
export const sourceUrl = reference.sourceUrl;
export const seedCourses = reference.courses.map((c, i) => ({
  id: `ref-${String(i + 1).padStart(3, "0")}`,
  title: c.title,
  study_year: c.studyYear,
  academic_year: c.academicYear,
  modules: c.modules.join(","),
  category: c.group,
  source_url: c.sourcePageExists ? c.sourceUrl : "",
  source_exists: c.sourcePageExists ? 1 : 0,
  description: "",
  updated_at: "2026-09-20T19:49:12",
  resource_count: 0,
}));
export type Course = (typeof seedCourses)[number];
export type Resource = {
  id: string;
  course_id: string;
  course_title?: string;
  title: string;
  description: string;
  topic: string;
  kind: string;
  format: string;
  url: string;
  body: string;
  status: string;
  attribution: string;
  rights_confirmed: number;
  file_key: string;
  filename: string;
  mime: string;
  size: number;
  updated_at: string;
  created_at: string;
  modules: string;
  study_year?: number;
  academic_year?: string;
  version: number;
};
export const kinds: Record<string, string> = {
  lecture: "Лекции",
  seminar: "Семинары",
  assignment: "Задания",
  solution: "Решения",
  exam: "Подготовка к экзамену",
  textbook: "Учебники",
  supplementary: "Дополнительно",
};
export const moduleLabel = (modules: string) =>
  modules ? `Модули ${modules.split(",").join(", ")}` : "Модули уточняются";
