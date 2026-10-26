import { Eye, EyeOff, Headphones, AlertTriangle, Undo2, Send, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { requireClass } from "@/lib/teacher";
import { getDict } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import { loadLessonWork, scoreAssignment } from "@/lib/results";
import { aiConfig } from "@/lib/ai/provider";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PageTitle, Empty, Notice } from "@/components/Shared";
import { SubmitButton } from "@/components/ui";
import { LessonPicker } from "@/components/teacher/LessonPicker";
import { GradeRow } from "@/components/teacher/GradeRow";
import { releaseFeedbackAction, returnWorkAction, releaseStudentFeedbackAction } from "@/app/teacher/actions";
import { finalScore } from "@/lib/grading";
import type { Task } from "@/lib/lesson";

function answerText(t: Task, a: unknown, none: string) {
  if (a === null || a === undefined) return none;
  if (t.type === "choice") return (a as number[]).map((i) => t.options[i]).join(", ") || none;
  if (t.type === "match") return t.pairs.map((p, i) => `${p.left} → ${(a as string[])[i] ?? "—"}`).join("; ");
  if (t.type === "gap") return (a as string[]).join(" / ") || none;
  if (t.type === "short") return String(a) || none;
  return "";
}

/** The answer key for closed tasks, shown to the teacher next to the student's answer. */
function keyText(t: Task) {
  if (t.type === "choice") return t.correct.map((i) => t.options[i]).join(", ");
  if (t.type === "match") return t.pairs.map((p) => `${p.left} → ${p.right}`).join("; ");
  if (t.type === "gap") return t.answers.map((a) => a[0]).join(" / ");
  if (t.type === "short" || t.type === "voice") return t.sample_answer || "";
  return "";
}

export default async function GradingPage({ params, searchParams }: { params: Promise<{ classId: string }>; searchParams: Promise<{ lesson?: string }> }) {
  const { classId } = await params;
  const sp = await searchParams;
  const { sb, cls } = await requireClass(classId);
  const { d, lang } = await getDict();
  const { data: lessons } = await sb.from("lessons").select("id, topic, status, feedback_released").eq("class_id", classId).in("status", ["published", "completed"]).order("published_at", { ascending: false });
  const lesson = lessons?.find((l) => l.id === sp.lesson) ?? lessons?.[0];
  const work = lesson ? await loadLessonWork(sb, lesson.id) : [];
  const canAi = Boolean(aiConfig());
  // Short-lived links for voice answers (private bucket).
  const voiceUrls: Record<string, string> = {};
  for (const a of work)
    for (const r of a.responses) {
      const p = (r.answer as { path?: string } | null)?.path;
      if (p) {
        const { data } = await supabaseAdmin().storage.from("voice").createSignedUrl(p, 3600);
        if (data?.signedUrl) voiceUrls[`${a.id}:${r.task_id}`] = data.signedUrl;
      }
    }
  const statusLabel: Record<string, string> = { assigned: d.teacher.notStarted, in_progress: d.teacher.inProgress, submitted: d.teacher.submitted, graded: d.teacher.graded };

  return (
    <>
      <PageTitle title={`${d.teacher.sections.grading} · ${cls.name}`} sub={d.teacher.gradingIntro} />
      <LessonPicker lessons={lessons ?? []} current={lesson?.id} base={`/teacher/c/${classId}/grading`} d={d} />
      {!lesson ? (
        <Empty text={d.teacher.noLessons} />
      ) : (
        <>
          <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
            <span className="text-sm">{lesson.feedback_released ? d.teacher.feedbackShown : d.teacher.feedbackHidden}</span>
            <form action={releaseFeedbackAction} className="ml-auto">
              <input type="hidden" name="lesson_id" value={lesson.id} />
              <input type="hidden" name="release" value={lesson.feedback_released ? "0" : "1"} />
              <SubmitButton className={`btn btn-sm ${lesson.feedback_released ? "btn-outline" : "btn-primary"}`}>
                {lesson.feedback_released ? <EyeOff className="w-4 h-4" /> : <Send className="w-4 h-4" />} {lesson.feedback_released ? d.teacher.hideFeedback : d.teacher.releaseFeedbackAll}
              </SubmitButton>
            </form>
          </div>
          {!work.length && <Empty text={d.teacher.noStudents} />}
          <div className="space-y-3">
            {work.map((a) => {
              const sc = scoreAssignment(a);
              return (
                <details key={a.id} className="card p-4" open={work.length <= 3}>
                  <summary className="cursor-pointer flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="font-bold">{a.students?.first_name} {a.students?.last_name}</span>
                    <span className="text-sm text-muted">{d.interests[a.variant_key as keyof typeof d.interests]} · {a.mode === "paper" ? d.teacher.paper : d.teacher.phone} · {statusLabel[a.status]}</span>
                    {(lesson.feedback_released || a.feedback_released) && <span className="chip !bg-leaf-100 !text-leaf-800"><CheckCircle2 className="w-3.5 h-3.5" /> {d.teacher.sentToStudent}</span>}
                    <span className="ml-auto font-semibold">{d.teacher.total}: {sc.got} / {sc.max} {sc.complete ? "" : `(${sc.graded}/${sc.total})`}</span>
                  </summary>
                  {a.mode === "paper" && <p className="mt-2 text-sm text-muted">{d.teacher.paperEntry}</p>}
                  {(a.status === "submitted" || a.status === "graded") && (
                    <form action={returnWorkAction} className="mt-2">
                      <input type="hidden" name="assignment_id" value={a.id} />
                      <SubmitButton className="btn btn-ghost btn-sm" confirmText={d.teacher.returnWorkConfirm}><Undo2 className="w-4 h-4" /> {d.teacher.returnWork}</SubmitButton>
                    </form>
                  )}
                  <div className="mt-3 space-y-3">
                    {a.content.tasks.map((t, i) => {
                      const r = a.responses.find((x) => x.task_id === t.id);
                      const v = voiceUrls[`${a.id}:${t.id}`];
                      return (
                        <div key={t.id} className="border-t border-leaf-100 pt-3">
                          <div className="text-sm font-semibold flex items-start gap-1.5">
                            {(() => {
                              const s = r ? finalScore(r) : null;
                              if (s === null) return <MinusCircle className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" aria-label={d.teacher.notGraded} />;
                              return s >= t.points ? <CheckCircle2 className="w-4 h-4 mt-0.5 text-leaf-600 shrink-0" aria-label="✓" /> : <XCircle className="w-4 h-4 mt-0.5 text-danger shrink-0" aria-label="✗" />;
                            })()}
                            <span>{i + 1}. {d.teacher.taskTypes[t.type]} — {pick(t.instruction, lang)} <span className="text-muted font-normal">({t.points})</span></span>
                          </div>
                          {t.prompt && <p className="text-sm text-muted mt-1 whitespace-pre-line" lang="en">{t.prompt}</p>}
                          {t.type !== "voice" && t.type !== "pair" && <p className="text-sm mt-1" lang="en"><b>{d.student.yourAnswer}:</b> {answerText(t, r?.answer, d.teacher.noAnswer)}</p>}
                          {keyText(t) && <p className="text-xs text-leaf-800 mt-0.5" lang="en"><b>{t.type === "short" || t.type === "voice" ? d.teacher.sampleAnswer : d.teacher.correctAnswer}:</b> {keyText(t)}</p>}
                          {t.type === "voice" && (v ? <div className="mt-1"><span className="text-sm flex items-center gap-1"><Headphones className="w-4 h-4" /> {d.teacher.listen}</span><audio src={v} controls className="w-full max-w-md" /><p className="text-xs text-muted">{d.teacher.noTranscript}</p></div> : <p className="text-sm text-muted">{d.teacher.noAnswer}</p>)}
                          {r?.ai_flagged && <p className="text-xs text-warn flex items-center gap-1 mt-1"><AlertTriangle className="w-3.5 h-3.5" /> {d.teacher.flagged}</p>}
                          <GradeRow
                            assignmentId={a.id}
                            taskId={t.id}
                            max={t.points}
                            teacherScore={r?.teacher_score ?? null}
                            comment={r?.teacher_comment ?? null}
                            autoScore={r?.auto_score ?? null}
                            aiScore={r?.ai_suggested_score ?? null}
                            aiFeedback={r?.ai_feedback ?? null}
                            canAskAi={canAi && t.type === "short" && typeof r?.answer === "string" && Boolean(r.answer)}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {!lesson.feedback_released && (
                    <form action={releaseStudentFeedbackAction} className="mt-4 pt-3 border-t border-leaf-100 flex flex-wrap items-center gap-2">
                      <input type="hidden" name="assignment_id" value={a.id} />
                      <input type="hidden" name="release" value={a.feedback_released ? "0" : "1"} />
                      <SubmitButton className={`btn btn-sm ${a.feedback_released ? "btn-outline" : "btn-primary"}`}>
                        {a.feedback_released ? <EyeOff className="w-4 h-4" /> : <Send className="w-4 h-4" />} {a.feedback_released ? d.teacher.unsendStudent : d.teacher.sendToStudent}
                      </SubmitButton>
                      <span className="text-xs text-muted">{d.teacher.sendHint}</span>
                    </form>
                  )}
                </details>
              );
            })}
          </div>
          {!canAi && <div className="mt-4"><Notice tone="warn">{d.teacher.aiNotSet}</Notice></div>}
        </>
      )}
    </>
  );
}
