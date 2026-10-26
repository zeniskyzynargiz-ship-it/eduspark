import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import { requireStudent, ensureAssignment } from "@/lib/student-data";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { StudentShell } from "@/components/student/StudentShell";
import { SummaryVideo } from "@/components/SummaryVideo";
import { AutoPrint, PrintButton } from "@/components/AutoPrint";
import { scoreAssignment, type RespRow } from "@/lib/results";
import { studentSlides, INTEREST_IMG } from "@/lib/summary";
import type { LessonContent, Task, Criterion } from "@/lib/lesson";

export default async function StudentSummaryPage({ params, searchParams }: { params: Promise<{ lessonId: string }>; searchParams: Promise<{ print?: string }> }) {
  const { lessonId } = await params;
  const sp = await searchParams;
  const st = await requireStudent();
  const { d, lang } = await getDict();
  if (!/^[0-9a-f-]{36}$/i.test(lessonId)) notFound();
  const db = supabaseAdmin();
  const { data: lesson } = await db.from("lessons").select("id, topic, objective, status, feedback_released, content").eq("id", lessonId).eq("class_id", st.classId).in("status", ["published", "completed"]).maybeSingle();
  if (!lesson) notFound();
  const a = await ensureAssignment(st.id, lesson as { id: string; topic: string; objective: string; content: LessonContent });
  const { data: rs } = await db.from("responses").select("*").eq("assignment_id", a.id);
  const content = a.content as unknown as { tasks: Task[]; criteria: Criterion[]; interest: string };
  // Scores only count once the teacher has released feedback.
  const responses = ((rs ?? []) as RespRow[]).map((r) => (lesson.feedback_released ? r : { ...r, auto_score: null, teacher_score: null }));
  const sc = scoreAssignment({ content, responses });
  const enough = sc.answered > 0;
  const slides = studentSlides(d, lang, { interest: a.variant_key, done: sc.answered, total: sc.total, byCrit: sc.byCrit, criteria: content.criteria, image: INTEREST_IMG[a.variant_key] });

  return (
    <StudentShell st={st} d={d}>
      <AutoPrint when={sp.print === "1"} />
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{d.summary.title}</h1>
        {sp.print === "1" && <PrintButton label={d.print.printBtn} />}
      </div>
      <p className="text-sm text-muted" lang="en">{lesson.topic}</p>
      {!enough ? (
        <p className="card p-5 mt-4 text-muted">{d.summary.noData}</p>
      ) : sp.print === "1" ? (
        <ol className="card p-5 mt-4 space-y-2">
          {slides.map((s, i) => <li key={i}><b>{s.label}:</b> {s.text}</li>)}
        </ol>
      ) : (
        <div className="mt-4">
          <SummaryVideo title={`${st.firstName}: ${d.summary.title}`} subtitle={lesson.topic} slides={slides} pdfHref={`/student/summary/${lessonId}?print=1`} />
        </div>
      )}
    </StudentShell>
  );
}
