import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reference = JSON.parse(
  await readFile(resolve(root, "content/reference.json"), "utf8"),
);
const courses = reference.courses
  .map((course, index) => ({
    ...course,
    id: `ref-${String(index + 1).padStart(3, "0")}`,
  }))
  .filter((course) => course.sourcePageExists);

const api = new URL("https://wiki.cs.hse.ru/api.php");
api.search = new URLSearchParams({
  action: "query",
  prop: "info|revisions",
  rvprop: "ids|timestamp|content",
  rvslots: "main",
  titles: courses.map((course) => course.sourcePageTitle).join("|"),
  format: "json",
  formatversion: "2",
}).toString();
const response = await fetch(api, {
  headers: { "User-Agent": "DSBA-Wiki-course-import/1.0" },
  signal: AbortSignal.timeout(30_000),
});
if (!response.ok) throw new Error(`MediaWiki API returned HTTP ${response.status}`);
const payload = await response.json();
if (payload.error) throw new Error(payload.error.info || "MediaWiki API error");

function sectionsOf(wikitext) {
  const headings = [...wikitext.matchAll(/^(={2,6})\s*(.*?)\s*\1\s*$/gm)];
  return headings.map((heading, index) => {
    const level = heading[1].length;
    let end = wikitext.length;
    for (let next = index + 1; next < headings.length; next++) {
      if (headings[next][1].length <= level) {
        end = headings[next].index;
        break;
      }
    }
    return {
      heading: heading[2].replace(/\s+/g, " ").trim(),
      level,
      content: wikitext.slice(heading.index + heading[0].length, end).trim(),
    };
  });
}

function removeTemplates(text) {
  let result = "";
  for (let i = 0; i < text.length; ) {
    if (text.startsWith("{{", i)) {
      let depth = 1;
      i += 2;
      while (i < text.length && depth) {
        if (text.startsWith("{{", i)) {
          depth++;
          i += 2;
        } else if (text.startsWith("}}", i)) {
          depth--;
          i += 2;
        } else i++;
      }
    } else result += text[i++];
  }
  return result;
}

function normalizeCell(cell) {
  let value = cell.trim();
  if (value.includes("|") && /^[^\n|]*\b(?:colspan|rowspan|style|class)=/.test(value)) {
    value = value.slice(value.indexOf("|") + 1).trim();
  }
  return value
    .replace(/<br\s*\/?>/gi, " / ")
    .replace(/<ref\b[^>]*\/?\s*>[\s\S]*?(?:<\/ref\s*>)?/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\[\[(?:File|Image):[^\]]*\]\]/gi, "")
    .replace(/\[\[(?:[^\]|]+)\|([^\]]+)\]\]/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[\s+([^\]]+)\]/g, "$1 (not linked in source)")
    .replace(/\[(https?:\/\/[^\s\]]+)(?:\s+([^\]]+))?\]/g, (_, url, label) =>
      `[${(label || url).replace(/'''/g, "").trim()}](${url})`,
    )
    .replace(/'''/g, "")
    .replace(/''([^']+?)''/g, "*$1*")
    .replace(/\|/g, "\\|")
    .replace(/\s+/g, " ")
    .trim();
}

function tableToMarkdown(source) {
  const lines = source.split("\n");
  const rows = [];
  let row = [];
  const finishRow = () => {
    if (row.length) rows.push(row);
    row = [];
  };
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === "{|" || line.startsWith("{|")) continue;
    if (line === "|}") {
      finishRow();
      break;
    }
    if (line.startsWith("|-")) {
      finishRow();
      continue;
    }
    if (line.startsWith("!") || line.startsWith("|")) {
      const header = line.startsWith("!") && !line.startsWith("!|");
      let cells = line.slice(header ? 1 : line.startsWith("!|") ? 2 : 1).trim();
      if (cells.startsWith("|")) cells = cells.slice(1);
      const separator = header ? /!!/ : /\|\|/;
      for (const rawCell of cells.split(separator)) {
        const span = Number(rawCell.match(/\bcolspan=["']?(\d+)/i)?.[1] || 1);
        const cell = normalizeCell(rawCell);
        row.push(...Array.from({ length: Math.max(1, Math.min(span, 20)) }, () => cell));
      }
    } else if (row.length) {
      row[row.length - 1] = `${row.at(-1)} ${normalizeCell(line)}`.trim();
    }
  }
  finishRow();
  const usefulRows = rows.filter((cells) => cells.some(Boolean));
  if (!usefulRows.length) return "";
  const width = Math.max(...usefulRows.map((cells) => cells.length));
  const padded = usefulRows.map((cells) =>
    Array.from({ length: width }, (_, index) => cells[index] || ""),
  );
  const output = [`| ${padded[0].join(" | ")} |`, `| ${Array(width).fill("---").join(" | ")} |`];
  for (const cells of padded.slice(1)) output.push(`| ${cells.join(" | ")} |`);
  return output.join("\n");
}

function toMarkdown(wikitext) {
  const tables = [];
  let text = removeTemplates(wikitext)
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/\{\|[\s\S]*?\|\}/g, (table) => {
      const converted = tableToMarkdown(table);
      if (!converted) return "";
      const marker = `\u0000TABLE${tables.length}\u0000`;
      tables.push(converted);
      return `\n\n${marker}\n\n`;
    })
    .replace(/<ref\b[^>]*\/?\s*>[\s\S]*?(?:<\/ref\s*>)?/gi, "")
    .replace(/<br\s*\/?>/gi, " / ")
    .replace(/<\/?(?:p|div|ul|ol|li|blockquote|h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\[\[(?:File|Image):[^\]]*\]\]/gi, "")
    .replace(/\[\[(?:[^\]|]+)\|([^\]]+)\]\]/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[\s+([^\]]+)\]/g, "$1 (not linked in source)")
    .replace(/\[(https?:\/\/[^\s\]]+)(?:\s+([^\]]+))?\]/g, (_, url, label) =>
      `[${(label || url).replace(/'''/g, "").trim()}](${url})`,
    )
    .replace(/(?<![\[(])https?:\/\/[^\s<>\]]+/g, (url) => `[${url}](${url})`)
    .replace(/'''/g, "")
    .replace(/''([^']+?)''/g, "*$1*")
    .replace(/^\s*\*{1,5}\s+/gm, "- ")
    .replace(/^\s*#+\s*/gm, "- ")
    .replace(/\u0000TABLE(\d+)\u0000/g, (_, index) => tables[Number(index)])
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text;
}

const byTitle = new Map(
  payload.query.pages.map((page) => [page.title.replaceAll("_", " "), page]),
);
const include = new Set([
  "teachers and assistants",
  "grading system",
  "lecture notes",
  "homework",
  "exams",
  "course syllabus",
  "syllabus",
]);
const imported = [];
for (const course of courses) {
  const page = byTitle.get(course.sourcePageTitle.replaceAll("_", " "));
  const revision = page?.revisions?.[0];
  if (!revision || page.missing) continue;
  const sections = sectionsOf(revision.slots.main.content)
    .filter((section) => include.has(section.heading.toLowerCase()))
    .map(({ heading, content }) => ({ title: heading, content: toMarkdown(content) }))
    .filter((section) => section.content);
  if (!sections.length) continue;
  const sourceUrl = `${course.sourceUrl}${course.sourceUrl.includes("?") ? "&" : "?"}oldid=${revision.revid}`;
  imported.push({
    id: course.id,
    title: course.title,
    sourcePageTitle: course.sourcePageTitle,
    sourceUrl,
    sourceRevision: revision.revid,
    sourceUpdatedAt: revision.timestamp,
    sections,
  });
}

await writeFile(
  resolve(root, "content/course-wiki-sections.json"),
  `${JSON.stringify(imported, null, 2)}\n`,
);
console.log(`Imported ${imported.length} course pages with teaching, assessment, and material sections.`);
for (const course of imported) {
  console.log(`+ ${course.title}: ${course.sections.map((section) => section.title).join(", ")}`);
}
