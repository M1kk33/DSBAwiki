import { getCourses, getResources, apiError, noStore } from "@/lib/server";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const courses = await getCourses();
    const resources = await getResources(
      false,
      new URL(request.url).searchParams,
    );
    return Response.json({ courses, ...resources }, { headers: noStore });
  } catch (e) {
    return apiError(e, request);
  }
}
