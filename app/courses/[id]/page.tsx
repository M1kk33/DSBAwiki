import { CourseDetail } from "@/components/course-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <CourseDetail id={(await params).id} />;
}
