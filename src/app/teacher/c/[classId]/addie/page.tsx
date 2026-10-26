import { requireClass } from "@/lib/teacher";
import { getDict } from "@/lib/i18n/server";
import { loadLessonWork, scoreAssignment } from "@/lib/results";
import { PageTitle, Empty } from "@/components/Shared";
import { LessonPicker } from "@/components/teacher/LessonPicker";
import { AddieForm } from "@/components/teacher/AddieForm";

export default async function AddieTeacherPage({ params, searchParams }: { params: Promise<{ classId: string }>; searchParams: Promise<{ lesson?: string }> }) {
  const { classId } = await params;
  const sp = await searchParams;
  const { sb, cls } = await requireClass(classId);
  const { d, lang } = await getDict();
  const { data: lessons } = await sb.from("lessons").select("id, topic, status, addie").eq("class_id", classId).order("created_at", { ascending: false });
  const lesson = lessons?.find((l) => l.id === sp.lesson) ?? lessons?.[0];
  let facts = "";
  if (lesson && (lesson.status === "published" || lesson.status === "completed")) {
    const work = await loadLessonWork(sb, lesson.id);
    const submitted = work.filter((a) => a.status === "submitted" || a.status === "graded").length;
    const graded = work.filter((a) => scoreAssignment(a).complete).length;
    const refl = work.filter((a) => a.reflection).length;
    facts = `${d.teacher.submitted}: ${submitted}/${work.length} · ${d.teacher.graded}: ${graded}/${work.length} · ${d.teacher.reflection}: ${refl}`;
  }
  const record = (lesson?.addie ?? {}) as Record<string, { kk?: string; en?: string }>;
  const values = Object.fromEntries(["analyze", "design", "develop", "implement", "evaluate"].map((k) => [k, record[k]?.[lang] ?? record[k]?.kk ?? ""]));
  return (
    <>
      <PageTitle title={`${d.teacher.sections.addie} · ${cls.name}`} sub={d.teacher.addieIntro} />
      <LessonPicker lessons={lessons ?? []} current={lesson?.id} base={`/teacher/c/${classId}/addie`} d={d} />
      {!lesson ? <Empty text={d.teacher.noLessons} /> : <AddieForm key={`${lesson.id}-${lang}`} lessonId={lesson.id} values={values} facts={facts} />}
    </>
  );
}
