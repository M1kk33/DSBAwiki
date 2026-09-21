import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  apiError,
  database,
  getAdmin,
  getCourses,
  getResources,
  HttpError,
  noStore,
  readJson,
  sameOrigin,
} from "@/lib/server";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const user = await getChatGPTUser();
    const admin = await getAdmin();
    if (admin && new URL(request.url).searchParams.has("id")) {
      const resource = await database()
        .prepare("SELECT * FROM resources WHERE id=?")
        .bind(new URL(request.url).searchParams.get("id"))
        .first();
      if (!resource) throw new HttpError(404, "Материал не найден.");
      return Response.json({ resource }, { headers: noStore });
    }
    const configured = Boolean(
      await database().prepare("SELECT user_id FROM editors LIMIT 1").first(),
    );
    return Response.json(
      {
        user: user
          ? { displayName: user.displayName, userId: user.userId }
          : null,
        admin: !!admin,
        configured,
        ...(admin
          ? {
              courses: await getCourses(),
              ...(await getResources(true, new URL(request.url).searchParams)),
            }
          : {}),
      },
      { headers: noStore },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await getChatGPTUser();
    if (!user) throw new HttpError(401, "Сначала войдите в аккаунт.");
    const { key } = await readJson(request, 1000);
    const secret = env.ADMIN_BOOTSTRAP_KEY;
    if (!secret || typeof key !== "string")
      throw new HttpError(403, "Ключ активации неверен или не настроен.");
    const digest = async (value: string) =>
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
      );
    const a = await digest(key),
      b = await digest(secret);
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
    if (mismatch) throw new HttpError(403, "Ключ активации неверен.");
    const result = await database()
      .prepare(
        "INSERT INTO editors (user_id,role,created_at) SELECT ?, 'admin', ? WHERE NOT EXISTS (SELECT 1 FROM editors)",
      )
      .bind(user.userId, new Date().toISOString())
      .run();
    if (!result.meta.changes)
      throw new HttpError(409, "Администратор уже назначен.");
    return Response.json({ ok: true }, { headers: noStore });
  } catch (e) {
    return apiError(e);
  }
}
