import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { zipSync, strToU8 } from "fflate";

const origin = process.env.TEST_ORIGIN || "http://localhost:5173";
if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname))
  throw new Error("Integration tests are restricted to localhost.");
const courseId = "test-" + randomUUID();
let cookie = "";
const records = [];
async function request(path, options = {}, authorized = false) {
  return fetch(origin + path, {
    signal: AbortSignal.timeout(30000),
    ...options,
    headers: { ...(authorized ? { Cookie: cookie } : {}), ...options.headers },
  });
}
async function json(path, body, authorized = true, requestOrigin = origin) {
  return request(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: requestOrigin },
      body: JSON.stringify(body),
    },
    authorized,
  );
}
const base = {
  course_id: courseId,
  title: "Integration test",
  description: "Disposable test fixture",
  topic: "Testing",
  kind: "lecture",
  format: "markdown",
  url: "",
  body: "# Интеграция\n\nТестовый текст",
  status: "draft",
  attribution: "Automated test fixture — original content",
  rights_confirmed: 0,
  modules: "4",
  version: 0,
};
async function save(values, file, authorized = true) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...base, ...values }))
    form.set(key, String(value));
  if (file) form.set("file", file);
  const response = await request(
    "/api/admin/resources",
    { method: "PUT", headers: { Origin: origin }, body: form },
    authorized,
  );
  const result = response.headers
    .get("content-type")
    ?.includes("application/json")
    ? await response.json()
    : { error: await response.text() };
  return { response, result };
}
function fixturePdf(label) {
  const objects = [
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`,
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`,
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
    `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`,
  ];
  const stream = `BT /F1 14 Tf 20 240 Td (${label}) Tj ET`;
  objects.push(
    `5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
  );
  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(output.length);
    output += object;
  }
  const start = output.length;
  output +=
    "xref\n0 6\n0000000000 65535 f \n" +
    offsets
      .slice(1)
      .map((n) => String(n).padStart(10, "0") + " 00000 n \n")
      .join("");
  output += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return new File([output], "test.pdf", { type: "application/pdf" });
}

test("DSBA Wiki integration against the persistent local D1/R2 server", async (t) => {
  const initial = await (await request("/api/catalog")).json();
  await t.test("imports all 58 reference courses and 14 source links", () => {
    assert.equal(
      initial.courses.filter((c) => c.id.startsWith("ref-")).length,
      58,
    );
    assert.equal(
      initial.courses.filter((c) => c.id.startsWith("ref-") && c.source_exists)
        .length,
      14,
    );
  });
  await t.test(
    "anonymous writes and spoofed identity headers are rejected",
    async () => {
      assert.equal((await json("/api/admin/courses", {}, false)).status, 403);
      assert.equal(
        (
          await request("/api/admin/courses", {
            method: "POST",
            headers: {
              Origin: origin,
              "Content-Type": "application/json",
              "oai-authenticated-user-id": "local_seedy",
              "oai-authenticated-user-email": "seedy@sites.test",
            },
            body: "{}",
          })
        ).status,
        403,
      );
    },
  );
  const login = await request("/signin-with-chatgpt?return_to=%2Fadmin", {
    redirect: "manual",
  });
  cookie = login.headers.get("set-cookie")?.split(";")[0] || "";
  assert(cookie, "Local sign-in must set its development cookie");
  let admin = await (await request("/api/admin", {}, true)).json();
  if (!admin.configured) {
    const key = readFileSync(".env", "utf8")
      .match(/^ADMIN_BOOTSTRAP_KEY=(.+)$/m)?.[1]
      .trim();
    assert(key);
    assert.equal((await json("/api/admin", { key })).status, 200);
  }
  admin = await (await request("/api/admin", {}, true)).json();
  assert.equal(admin.admin, true);
  await t.test("CSRF protection rejects cross-origin mutations", async () =>
    assert.equal(
      (await json("/api/admin/courses", {}, true, "https://evil.invalid"))
        .status,
      403,
    ),
  );
  try {
    const c = {
      id: courseId,
      title: "Тестовая дисциплина — disposable fixture",
      study_year: 1,
      academic_year: "2026/2027",
      modules: "1,2,3,4",
      category: "Test",
      description: "Automated fixture",
      source_url: "",
    };
    await t.test(
      "course creation persists and academic years are validated",
      async () => {
        assert.equal(
          (
            await json("/api/admin/courses", {
              ...c,
              academic_year: "2026/2025",
            })
          ).status,
          400,
        );
        assert.equal((await json("/api/admin/courses", c)).status, 200);
        assert(
          (await (await request("/api/catalog")).json()).courses.some(
            (v) => v.id === courseId,
          ),
        );
      },
    );
    await t.test(
      "stale course edits are rejected without overwriting",
      async () => {
        const current = (
          await (await request("/api/catalog")).json()
        ).courses.find((v) => v.id === courseId);
        assert.equal(
          (
            await json("/api/admin/courses", {
              ...c,
              updated_at: current.updated_at,
              description: "Updated fixture",
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await json("/api/admin/courses", {
              ...c,
              updated_at: current.updated_at,
              title: "Stale title",
            })
          ).status,
          409,
        );
        const saved = (
          await (await request("/api/catalog")).json()
        ).courses.find((v) => v.id === courseId);
        assert.equal(saved.title, c.title);
        assert.equal(saved.description, "Updated fixture");
      },
    );
    const id = "test-" + randomUUID();
    records.push(id);
    await t.test(
      "draft is saved persistently and hidden from visitors",
      async () => {
        const { response } = await save({ id });
        assert.equal(response.status, 200);
        assert.equal(
          (await (await request("/api/catalog?course=" + courseId)).json())
            .resources.length,
          0,
        );
        assert.equal((await request("/resources/" + id)).status, 404);
        assert.equal(
          (await (await request("/api/admin?id=" + id, {}, true)).json())
            .resource.body,
          base.body,
        );
      },
    );
    await t.test("publishing requires rights and attribution", async () => {
      assert.equal(
        (await save({ id, version: 1, status: "published" })).response.status,
        400,
      );
      assert.equal(
        (
          await save({
            id,
            version: 1,
            status: "published",
            rights_confirmed: 1,
            attribution: "",
          })
        ).response.status,
        400,
      );
    });
    await t.test(
      "publishes Markdown and searches Russian text case-insensitively",
      async () => {
        assert.equal(
          (
            await save({
              id,
              version: 1,
              status: "published",
              rights_confirmed: 1,
            })
          ).response.status,
          200,
        );
        const result = await (
          await request("/api/catalog?q=" + encodeURIComponent("ИНТЕГРАЦИЯ"))
        ).json();
        assert(result.resources.some((r) => r.id === id));
        assert(
          !("body" in result.resources[0]),
          "list responses must not include full documents",
        );
        assert.equal((await request("/resources/" + id)).status, 200);
        const byCourse = await (
          await request(
            "/api/catalog?q=" + encodeURIComponent("ТЕСТОВАЯ ДИСЦИПЛИНА"),
          )
        ).json();
        assert(byCourse.resources.some((r) => r.id === id));
      },
    );
    await t.test("semester filtering uses the resource modules", async () => {
      assert.equal(
        (
          await (
            await request("/api/catalog?course=" + courseId + "&semester=1")
          ).json()
        ).resourceTotal,
        0,
      );
      assert.equal(
        (
          await (
            await request("/api/catalog?course=" + courseId + "&semester=2")
          ).json()
        ).resourceTotal,
        1,
      );
    });
    await t.test("stale updates fail with 409 and preserve content", async () =>
      assert.equal(
        (await save({ id, version: 1, title: "stale" })).response.status,
        409,
      ),
    );
    await t.test(
      "format changes discard hidden text and reject unsafe URLs",
      async () => {
        assert.equal(
          (
            await save({
              id,
              version: 2,
              format: "link",
              url: "javascript:alert(1)",
            })
          ).response.status,
          400,
        );
        assert.equal(
          (
            await save({
              id,
              version: 2,
              format: "link",
              url: "https://example.com/",
              status: "published",
              rights_confirmed: 1,
            })
          ).response.status,
          200,
        );
        const saved = (
          await (await request("/api/admin?id=" + id, {}, true)).json()
        ).resource;
        assert.equal(saved.body, "");
        assert.equal(
          (
            await (
              await request(
                "/api/catalog?q=" + encodeURIComponent("ИНТЕГРАЦИЯ"),
              )
            ).json()
          ).resources.some((r) => r.id === id),
          false,
        );
      },
    );
    await t.test(
      "upload validation rejects scripts, fake Office, invalid PDF and oversized bodies",
      async () => {
        for (const file of [
          new File(["script"], "test.exe"),
          new File(
            ["PK\x03\x04garbage[Content_Types].xmlword/document.xml"],
            "test.docx",
          ),
          new File(["not pdf"], "test.pdf"),
          new File([], "empty.pdf"),
        ])
          assert.equal(
            (await save({ format: "file" }, file)).response.status,
            400,
            file.name,
          );
        const huge = new File([new Uint8Array(17 * 1024 * 1024)], "big.pdf");
        assert.equal(
          (await save({ format: "file" }, huge)).response.status,
          413,
        );
      },
    );
    await t.test("uploads above one MiB retain their full bytes", async () => {
      const largeId = "test-" + randomUUID();
      records.push(largeId);
      const largeText = "x".repeat(2 * 1024 * 1024);
      const { response, result } = await save(
        { id: largeId, format: "file" },
        new File([largeText], "large.txt"),
      );
      assert.equal(response.status, 200, JSON.stringify(result));
      const download = await request("/api/files/" + largeId, {}, true);
      assert.equal((await download.arrayBuffer()).byteLength, largeText.length);
    });
    const pdfId = "test-" + randomUUID();
    records.push(pdfId);
    await t.test(
      "PDF draft download is protected and authenticated download works",
      async () => {
        assert.equal(
          (
            await save(
              { id: pdfId, format: "file" },
              fixturePdf("First version"),
            )
          ).response.status,
          200,
        );
        assert.equal((await request("/api/files/" + pdfId)).status, 404);
        const download = await request("/api/files/" + pdfId, {}, true);
        assert.equal(download.status, 200);
        assert.equal(download.headers.get("content-type"), "application/pdf");
        assert((await download.text()).includes("First version"));
      },
    );
    await t.test(
      "replacing a PDF preserves its resource URL and changes the bytes",
      async () => {
        assert.equal(
          (
            await save(
              {
                id: pdfId,
                version: 1,
                format: "file",
                kind: "exam",
                status: "published",
                rights_confirmed: 1,
              },
              fixturePdf("Second version"),
            )
          ).response.status,
          200,
        );
        const result = await request("/api/files/" + pdfId);
        assert.equal(result.status, 200);
        assert.match(result.headers.get("content-disposition"), /^inline/);
        assert((await result.text()).includes("Second version"));
        const assessments = await (
          await request("/api/catalog?course=" + courseId + "&assessment=1")
        ).json();
        assert.deepEqual(
          assessments.resources.map((r) => r.id),
          [pdfId],
        );
        assert.match(
          (await request("/api/files/" + pdfId + "?download=1")).headers.get(
            "content-disposition",
          ),
          /^attachment/,
        );
      },
    );
    await t.test(
      "zero-byte replacement is rejected without deleting the old file",
      async () => {
        assert.equal(
          (
            await save(
              { id: pdfId, version: 2, format: "file" },
              new File([], "empty.pdf"),
            )
          ).response.status,
          400,
        );
        assert(
          (await (await request("/api/files/" + pdfId)).text()).includes(
            "Second version",
          ),
        );
      },
    );
    await t.test(
      "real Office ZIP structure is accepted as an attachment",
      async () => {
        const docId = "test-" + randomUUID();
        records.push(docId);
        const bytes = zipSync({
          "[Content_Types].xml": strToU8(
            '<Types><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
          ),
          "word/document.xml": strToU8(
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p/></w:body></w:document>',
          ),
        });
        assert.equal(
          (
            await save(
              {
                id: docId,
                format: "file",
                status: "published",
                rights_confirmed: 1,
              },
              new File([bytes], "test.docx"),
            )
          ).response.status,
          200,
        );
        assert.match(
          (await request("/api/files/" + docId)).headers.get(
            "content-disposition",
          ),
          /^attachment/,
        );
      },
    );
    await t.test(
      "pagination reports total and returns disjoint pages",
      async () => {
        const a = await (
          await request("/api/catalog?course=" + courseId + "&limit=1&page=1")
        ).json();
        const b = await (
          await request("/api/catalog?course=" + courseId + "&limit=1&page=2")
        ).json();
        assert.equal(a.resources.length, 1);
        assert(a.resourceTotal >= 3);
        assert.notEqual(a.resources[0].id, b.resources[0].id);
      },
    );
    await t.test(
      "archiving hides both metadata and direct download",
      async () => {
        assert.equal(
          (
            await save({
              id: pdfId,
              version: 2,
              format: "file",
              status: "archived",
              rights_confirmed: 1,
            })
          ).response.status,
          200,
        );
        assert.equal((await request("/api/files/" + pdfId)).status, 404);
        assert.equal(
          (await request("/api/files/" + pdfId, {}, true)).status,
          200,
        );
        assert.equal(
          (
            await (await request("/api/catalog?course=" + courseId)).json()
          ).resources.some((r) => r.id === pdfId),
          false,
        );
      },
    );
  } finally {
    // Tests create their own course and ids only; never touch imported/student content.
    for (const id of records) {
      const response = await request("/api/admin?id=" + id, {}, true);
      if (response.ok) {
        const { resource } = await response.json();
        if (resource.file_key) {
          const cleanup = spawnSync(
            process.execPath,
            [
              "--import",
              "./scripts/sites-env.mjs",
              "./node_modules/wrangler/bin/wrangler.js",
              "r2",
              "object",
              "delete",
              "site-creator-r2/" + resource.file_key,
              "--local",
              "--config",
              "wrangler.local.json",
              "--persist-to",
              ".wrangler/state",
            ],
            { encoding: "utf8" },
          );
          if (cleanup.status !== 0)
            console.warn("Test file cleanup needs attention");
        }
      }
    }
    assert(/^test-[a-f0-9-]+$/.test(courseId));
    const cleanup = spawnSync(
      process.execPath,
      [
        "--import",
        "./scripts/sites-env.mjs",
        "./node_modules/wrangler/bin/wrangler.js",
        "d1",
        "execute",
        "DB",
        "--local",
        "--config",
        "wrangler.local.json",
        "--persist-to",
        ".wrangler/state",
        "--command",
        `DELETE FROM resources WHERE course_id='${courseId}'; DELETE FROM courses WHERE id='${courseId}';`,
      ],
      { encoding: "utf8" },
    );
    assert.equal(cleanup.status, 0, cleanup.stderr);
  }
});
