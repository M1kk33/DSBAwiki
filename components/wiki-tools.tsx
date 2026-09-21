"use client";
import { useEffect } from "react";
import { useI18n } from "./wiki-locale";
type ToolContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (input: unknown) => Promise<unknown>;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function WikiTools() {
  const { t } = useI18n();
  useEffect(() => {
    const context = (document as Document & { modelContext?: ToolContext })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(
      context.registerTool(
        {
          name: "find_wiki_materials",
          title: t("Поиск в DSBA Wiki"),
          description:
            "Read published educational resources by title, topic, author or text. Does not publish or edit content.",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", maxLength: 200 },
              course_id: { type: "string" },
              kind: {
                type: "string",
                enum: [
                  "lecture",
                  "seminar",
                  "assignment",
                  "solution",
                  "exam",
                  "textbook",
                  "supplementary",
                ],
              },
            },
            required: ["query"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          async execute(input) {
            if (
              !input ||
              typeof input !== "object" ||
              typeof (input as { query?: unknown }).query !== "string"
            )
              throw new Error("query must be a string");
            const args = input as Record<string, unknown>;
            if (
              Object.keys(args).some(
                (key) => !["query", "course_id", "kind"].includes(key),
              ) ||
              String(args.query).length > 200
            )
              throw new Error("Invalid search arguments");
            const params = new URLSearchParams({
              q: args.query as string,
              limit: "20",
            });
            if (args.course_id) {
              if (typeof args.course_id !== "string")
                throw new Error("Invalid course_id");
              params.set("course", args.course_id);
            }
            if (args.kind) {
              if (
                typeof args.kind !== "string" ||
                ![
                  "lecture",
                  "seminar",
                  "assignment",
                  "solution",
                  "exam",
                  "textbook",
                  "supplementary",
                ].includes(args.kind)
              )
                throw new Error("Invalid kind");
              params.set("kind", args.kind);
            }
            const response = await fetch("/api/catalog?" + params);
            if (!response.ok) throw new Error("Search unavailable");
            const data = (await response.json()) as {
              resources: {
                id: string;
                title: string;
                course_title: string;
                kind: string;
              }[];
              resourceTotal: number;
            };
            return {
              total: data.resourceTotal,
              resources: data.resources.map((r) => ({
                title: r.title,
                course: r.course_title,
                kind: r.kind,
                url: "/resources/" + r.id,
              })),
              search_url: "/resources?" + params,
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, [t]);
  return null;
}
