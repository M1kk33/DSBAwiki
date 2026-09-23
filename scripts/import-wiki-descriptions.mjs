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
    } else {
      result += text[i++];
    }
  }
  return result;
}

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, number) =>
      String.fromCodePoint(Number(number)),
    )
    .replace(/&#x([\da-f]+);/gi, (_, number) =>
      String.fromCodePoint(parseInt(number, 16)),
    );
}

function toMarkdown(wikitext) {
  let text = removeTemplates(wikitext)
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/<ref\b[^>]*\/\s*>/gi, "")
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref\s*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n\n")
    .replace(/<\/?(?:p|div|ul|ol|li|blockquote|h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\[\[(?:File|Image):[^\]]*\]\]/gi, "")
    .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[(https?:\/\/[^\s\]]+)(?:\s+([^\]]+))?\]/g, (_, url, label) =>
      label ? `[${label.trim()}](${url})` : `[${url}](${url})`,
    )
    .replace(/(?<![\[(])https?:\/\/[^\s<>\]]+/g, (url) => {
      const punctuation = url.match(/[.,;:!?]+$/)?.[0] || "";
      const target = punctuation ? url.slice(0, -punctuation.length) : url;
      return `[${target}](${target})${punctuation}`;
    })
    .replace(/'''([^']+?)'''/g, "**$1**")
    .replace(/''([^']+?)''/g, "*$1*")
    .replace(/^={2,6}\s*(.*?)\s*={2,6}\s*$/gm, "### $1")
    .replace(/^\s*\*+\s*/gm, "- ")
    .replace(/^\s*#+\s*/gm, "- ")
    .replace(/\|\}/g, "")
    .replace(/^\{\|.*$/gm, "")
    .replace(/^\|-.*$/gm, "")
    .replace(/^\|[-!].*$/gm, "")
    .replace(/\|\|/g, " · ");
  const lines = decodeEntities(text)
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim());
  const blocks = [];
  let paragraph = "";
  const flush = () => {
    if (paragraph) blocks.push(paragraph);
    paragraph = "";
  };
  for (const line of lines) {
    if (!line) {
      flush();
    } else if (/^(?:#{1,6} |[-*] |\d+[.)] )/.test(line)) {
      flush();
      blocks.push(line);
    } else {
      paragraph += `${paragraph ? " " : ""}${line}`;
    }
  }
  flush();
  return blocks.join("\n\n").trim();
}

const byTitle = new Map(
  payload.query.pages.map((page) => [page.title.replaceAll("_", " "), page]),
);
const licenseUrl =
  "https://wiki.cs.hse.ru/Wiki_-_%D0%A4%D0%B0%D0%BA%D1%83%D0%BB%D1%8C%D1%82%D0%B5%D1%82_%D0%BA%D0%BE%D0%BC%D0%BF%D1%8C%D1%8E%D1%82%D0%B5%D1%80%D0%BD%D1%8B%D1%85_%D0%BD%D0%B0%D1%83%D0%BA:%D0%9E%D0%BF%D0%B8%D1%81%D0%B0%D0%BD%D0%B8%D0%B5";
const imported = [];
const skipped = [];

for (const course of courses) {
  const page = byTitle.get(course.sourcePageTitle.replaceAll("_", " "));
  const revision = page?.revisions?.[0];
  if (!revision || page.missing) {
    skipped.push(`${course.title}: source page not found`);
    continue;
  }
  const sections = sectionsOf(revision.slots.main.content);
  const description = sections.find(
    (section) => section.heading.toLowerCase() === "course description",
  );
  const syllabus = sections.find((section) =>
    ["course syllabus", "syllabus"].includes(section.heading.toLowerCase()),
  );
  const selected = [];
  if (description) {
    const content = toMarkdown(description.content);
    if (content) selected.push({ title: "Course description", content });
  }
  if (syllabus) {
    const content = toMarkdown(syllabus.content);
    if (content) selected.push({ title: "Syllabus", content });
  }
  if (selected.length === 0) {
    skipped.push(`${course.title}: no description or syllabus section`);
    continue;
  }

  const sourceUrl = `${course.sourceUrl}${course.sourceUrl.includes("?") ? "&" : "?"}oldid=${revision.revid}`;
  const descriptionMarkdown = [
    ...selected.map(({ title, content }) => `### ${title}\n\n${content}`),
    `Source: [Wiki FCS — ${course.sourcePageTitle}](${sourceUrl}), revision ${revision.revid}; formatting adapted. The source Wiki states that its content may be reproduced under [CC BY-SA terms](${licenseUrl}); this excerpt is shared under the same terms.`,
  ].join("\n\n");
  imported.push({
    id: course.id,
    title: course.title,
    sourcePageTitle: course.sourcePageTitle,
    courseSourceUrl: course.sourceUrl,
    sourceUrl,
    sourceRevision: revision.revid,
    sourceUpdatedAt: revision.timestamp,
    description: descriptionMarkdown,
  });
}

await writeFile(
  resolve(root, "content/course-descriptions.json"),
  `${JSON.stringify(imported, null, 2)}\n`,
);
console.log(`Imported ${imported.length} course descriptions from ${courses.length} existing pages.`);
for (const item of imported) console.log(`+ ${item.title}`);
for (const item of skipped) console.log(`- ${item}`);
