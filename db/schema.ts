// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const courses = sqliteTable(
  "courses",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    studyYear: integer("study_year").notNull(),
    academicYear: text("academic_year").notNull(),
    modules: text("modules").notNull().default(""),
    category: text("category").notNull().default("Core"),
    description: text("description").notNull().default(""),
    sourceUrl: text("source_url").notNull().default(""),
    sourceExists: integer("source_exists").notNull().default(0),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_courses_year").on(t.academicYear, t.studyYear)],
);
export const resources = sqliteTable(
  "resources",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    topic: text("topic").notNull().default(""),
    kind: text("kind").notNull(),
    format: text("format").notNull(),
    url: text("url").notNull().default(""),
    body: text("body").notNull().default(""),
    searchText: text("search_text").notNull().default(""),
    status: text("status").notNull().default("draft"),
    attribution: text("attribution").notNull().default(""),
    rightsConfirmed: integer("rights_confirmed").notNull().default(0),
    fileKey: text("file_key").notNull().default(""),
    filename: text("filename").notNull().default(""),
    mime: text("mime").notNull().default(""),
    size: integer("size").notNull().default(0),
    modules: text("modules").notNull().default(""),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    version: integer("version").notNull().default(1),
  },
  (t) => [
    index("idx_resources_course_status").on(t.courseId, t.status),
    index("idx_resources_status_updated").on(t.status, t.updatedAt),
  ],
);
export const editors = sqliteTable("editors", {
  userId: text("user_id").primaryKey(),
  role: text("role").notNull().default("admin"),
  createdAt: text("created_at").notNull(),
});
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
