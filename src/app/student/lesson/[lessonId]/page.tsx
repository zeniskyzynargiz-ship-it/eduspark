import type { Theory } from "@/lib/lesson";
import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import { requireStudent, ensureAssignment } from "@/lib/student-data";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { StudentShell } from "@/components/student/StudentShell";
import { publicTask, type LessonContent, type Task } from "@/lib/lesson";
import { finalScore } from "@/lib/grading";
import type { PublicTask } from "@/components/student/TaskInput";
import { LessonRunner, type RunnerResponse } from "./LessonRunner";

export default async function StudentLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const st = await requireStudent();
  const { d } = await getDict();
  if (!/^[0-9a-f-]{36}$/i.test(lessonId)) notFound();
  const db = supabaseAdmin();
  // Only lessons of the student's own class that the teacher has published.
  const { data: lesson } = await db.from("lessons").select("id, topic, objective, status, feedback_released, content").eq("id", lessonId).eq("class_id", st.classId).in("status", ["published", "completed"]).maybeSingle();
  if (!lesson) notFound();
  const a = await ensureAssignment(st.id, lesson as { id: string; topic: string; objective: string; content: LessonContent });
  const [{ data: rs }, { data: reflection }] = await Promise.all([
    db.from("responses").select("task_id, answer, auto_score, teacher_score, teacher_comment").eq("assignment_id", a.id),
    db.from("reflections").select("interest, confidence, learned, difficult").eq("assignment_id", a.id).maybeSingle(),
  ]);
  const released = lesson.feedback_released || !!(a as { feedback_released?: boolean }).feedback_released;
  const tasks = a.content.tasks as Task[];
  const responses: Record<string, RunnerResponse> = {};
  for (const r of rs ?? []) {
    let voiceUrl: string | null = null;
    const ans = r.answer as { path?: string } | null;
    if (ans?.path) voiceUrl = (await db.storage.from("voice").createSignedUrl(ans.path, 3600)).data?.signedUrl ?? null;
    responses[r.task_id] = {
      answer: r.answer,
      voiceUrl,
      // Scores and comments only after the teacher releases feedback.
      score: released ? finalScore(r) : null,
      comment: released ? r.teacher_comment : null,
    };
  }
  return (
    <StudentShell st={st} d={d}>
      <LessonRunner
        lessonId={lesson.id}
        assignmentId={a.id}
        topic={lesson.topic}
        objective={lesson.objective}
        lessonStatus={lesson.status}
        initialStatus={a.status}
        released={released}
        context={a.content.context}
        theory={(a.content as { theory?: Theory | null }).theory ?? null}
        interest={a.variant_key}
        criteria={a.content.criteria}
        support={a.content.support}
        reflectionQuestions={a.content.reflection_questions}
        homework={a.content.homework}
        tasks={tasks.map((t) => publicTask(t, { revealKey: released }) as unknown as PublicTask & Partial<Task>)}
        responses={responses}
        reflection={reflection}
      />
    </StudentShell>
  );
}
