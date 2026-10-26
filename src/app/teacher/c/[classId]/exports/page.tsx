import { FileText, FileDown, KeyRound, ClipboardCheck, Users, User } from "lucide-react";
import { requireClass } from "@/lib/teacher";
import { getDict } from "@/lib/i18n/server";
import { PageTitle, Empty, Notice } from "@/components/Shared";
import { LessonPicker } from "@/components/teacher/LessonPicker";
import type { LessonContent } from "@/lib/lesson";
import { interestLabel } from "@/lib/survey";

export default async function ExportsPage({ params, searchParams }: { params: Promise<{ classId: string }>; searchParams: Promise<{ lesson?: string }> }) {
  const { classId } = await params;
  const sp = await searchParams;
  const { sb, cls } = await requireClass(classId);
  const { d } = await getDict();
  const { data: lessons } = await sb.from("lessons").select("id, topic, status, content").eq("class_id", classId).order("created_at", { ascending: false });
  const lesson = lessons?.find((l) => l.id === sp.lesson) ?? lessons?.[0];
  const published = lesson && (lesson.status === "published" || lesson.status === "completed");
  const { data: assignments } = published
    ? await sb.from("assignments").select("id, students(first_name, last_name)").eq("lesson_id", lesson.id)
    : { data: [] as never[] };
  const base = lesson ? `/print/lesson/${lesson.id}` : "";
  const Item = ({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) => (
    <a href={href} target="_blank" className="card p-4 flex items-center gap-3 hover:bg-leaf-50">
      <span className="w-10 h-10 rounded-full bg-leaf-100 grid place-items-center text-leaf-700">{icon}</span>
      <span className="font-semibold flex-1">{label}</span>
      <FileDown className="w-5 h-5 text-leaf-700" />
    </a>
  );
  return (
    <>
      <PageTitle title={`${d.teacher.sections.exports} · ${cls.name}`} sub={d.teacher.exportsIntro} />
      <LessonPicker lessons={lessons ?? []} current={lesson?.id} base={`/teacher/c/${classId}/exports`} d={d} />
      {!lesson ? (
        <Empty text={d.teacher.noLessons} />
      ) : (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Item href={`${base}?type=plan`} icon={<FileText className="w-5 h-5" />} label={d.teacher.exportPlan} />
            <Item href={`${base}?type=key`} icon={<KeyRound className="w-5 h-5" />} label={d.teacher.exportKey} />
            <Item href={`${base}?type=grading`} icon={<ClipboardCheck className="w-5 h-5" />} label={d.teacher.exportGrading} />
            {published ? (
              <Item href={`${base}?type=class`} icon={<Users className="w-5 h-5" />} label={d.teacher.exportClass} />
            ) : (
              (lesson.content as LessonContent | null)?.variants.map((v) => (
                <Item key={v.interest} href={`${base}?type=variant&interest=${encodeURIComponent(v.interest)}`} icon={<User className="w-5 h-5" />} label={`${d.print.studentVersion}: ${interestLabel(d, v.interest)}`} />
              ))
            )}
          </div>
          {!published && <Notice>{d.teacher.exportNeedsPublish}</Notice>}
          {published && (assignments?.length ?? 0) > 0 && (
            <section className="card p-5">
              <h2 className="font-bold mb-2">{d.teacher.exportStudent}</h2>
              <div className="flex flex-wrap gap-2">
                {(assignments as unknown as { id: string; students: { first_name: string; last_name: string } }[]).map((a) => (
                  <a key={a.id} href={`${base}?type=student&assignment=${a.id}`} target="_blank" className="btn btn-outline btn-sm">{a.students?.first_name} {a.students?.last_name}</a>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
