import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Undo2, Flag, Timer, Plus, FileDown, CheckSquare, History, Trash2, Copy } from "lucide-react";
import { requireLesson } from "@/lib/teacher";
import { getDict } from "@/lib/i18n/server";
import { fmt, pick } from "@/lib/i18n";
import { validateLesson, totalPoints, variantTasks } from "@/lib/lesson";
import { aiStatus } from "@/lib/ai/provider";
import { PageTitle, Notice } from "@/components/Shared";
import { SubmitButton } from "@/components/ui";
import { StatusChip } from "@/components/teacher/StatusChip";
import { TaskPreview } from "@/components/TaskPreview";
import { LessonPlanTable, CriteriaTable } from "@/components/LessonTables";
import { LessonEditor } from "@/components/teacher/LessonEditor";
import { RegenPanel } from "@/components/teacher/RegenPanel";
import { PublishButton } from "@/components/teacher/PublishButton";
import { setLessonStatusAction, stageControlAction, setModeAction, rematchVariantsAction, restoreVersionAction, deleteLessonAction, duplicateLessonAction } from "@/app/teacher/actions";
import { interestLabel } from "@/lib/survey";
import { cleanText } from "@/lib/lesson-fix";
import { TheoryCard } from "@/components/TheoryCard";

const IMG: Record<string, string> = {
  sport: "/images/interest-sport-ball.webp",
  music: "/images/interest-music-headphones.webp",
  travel: "/images/interest-travel-globe.webp",
  technology: "/images/interest-tech-robot.webp",
};

export default async function LessonPage({ params, searchParams }: { params: Promise<{ classId: string; lessonId: string }>; searchParams: Promise<{ notice?: string }> }) {
  const { classId, lessonId } = await params;
  const { notice } = await searchParams;
  const { sb, lesson, cls } = await requireLesson(classId, lessonId);
  const { d, lang } = await getDict();
  const c = lesson.content;
  const ai = aiStatus();
  const editable = lesson.status === "draft" || lesson.status === "approved";
  const problems = c ? validateLesson(c, lesson.duration_min) : ["No content"];
  const flow = ["draft", "approved", "published", "completed"] as const;

  const [{ data: assignments }, { data: versions }] = await Promise.all([
    lesson.status === "published" || lesson.status === "completed"
      ? sb.from("assignments").select("id, student_id, variant_key, status, mode, students(first_name, last_name)").eq("lesson_id", lessonId)
      : Promise.resolve({ data: [] as never[] }),
    sb.from("lesson_versions").select("version, note, created_at").eq("lesson_id", lessonId).order("version", { ascending: false }).limit(10),
  ]);
  const sids = ((assignments ?? []) as unknown as { student_id: string }[]).map((a) => a.student_id);
  const { data: surveys } = sids.length
    ? await sb.from("survey_responses").select("student_id, interests, version").in("student_id", sids).order("version", { ascending: false })
    : { data: [] as { student_id: string; interests: string[]; version: number }[] };
  const chosen = new Map<string, string[]>();
  for (const s of surveys ?? []) if (!chosen.has(s.student_id)) chosen.set(s.student_id, s.interests);
  const statusLabel: Record<string, string> = { assigned: d.teacher.notStarted, in_progress: d.teacher.inProgress, submitted: d.teacher.submitted, graded: d.teacher.graded };

  return (
    <>
      <PageTitle
        title={lesson.topic}
        sub={`${cls.name} · ${lesson.duration_min} ${d.common.min} · ${d.teacher.objective}: ${lesson.objective}`}
        actions={
          <>
            <Link href={`/teacher/c/${classId}/exports?lesson=${lessonId}`} className="btn btn-ghost btn-sm"><FileDown className="w-4 h-4" /> {d.teacher.sections.exports}</Link>
            {(lesson.status === "published" || lesson.status === "completed") && (
              <Link href={`/teacher/c/${classId}/grading?lesson=${lessonId}`} className="btn btn-outline btn-sm"><CheckSquare className="w-4 h-4" /> {d.teacher.sections.grading}</Link>
            )}
          </>
        }
      />

      {notice === "template" && <div className="mb-4"><Notice tone="warn">{d.teacher.templateNotice}</Notice></div>}
      {notice === "manual" && <div className="mb-4"><Notice>{d.teacher.manualNotice}</Notice></div>}
      {/* Status flow: draft -> approved -> published -> completed */}
      <div className="card p-4 mb-4">
        <ol className="flex flex-wrap items-center gap-2 text-sm">
          {flow.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className={`chip ${flow.indexOf(lesson.status) >= i ? "!bg-leaf-700 !text-white" : "!bg-gray-100 !text-gray-500"}`}>{i + 1}. {d.teacher.status[s]}</span>
              {i < 3 && <span className="text-leaf-300">→</span>}
            </li>
          ))}
        </ol>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusChip status={lesson.status} d={d} />
          {lesson.is_demo ? (
            <span className="chip !bg-amber-100 !text-amber-900">{d.teacher.demoBadge}</span>
          ) : (
            lesson.ai_provider && <span className="chip">{fmt(d.teacher.aiBadge, { provider: lesson.ai_provider, model: lesson.ai_model ?? "" })}</span>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            {lesson.status === "draft" && (
              <form action={setLessonStatusAction}>
                <input type="hidden" name="lesson_id" value={lessonId} />
                <input type="hidden" name="to" value="approved" />
                <SubmitButton className="btn btn-primary btn-sm" pendingText={d.common.loading}><CheckCircle2 className="w-4 h-4" /> {d.teacher.approve}</SubmitButton>
              </form>
            )}
            {lesson.status === "approved" && (
              <>
                <form action={setLessonStatusAction}>
                  <input type="hidden" name="lesson_id" value={lessonId} />
                  <input type="hidden" name="to" value="draft" />
                  <SubmitButton className="btn btn-ghost btn-sm"><Undo2 className="w-4 h-4" /> {d.teacher.backToDraft}</SubmitButton>
                </form>
                <PublishButton lessonId={lessonId} />
              </>
            )}
            {lesson.status === "published" && (
              <form action={setLessonStatusAction}>
                <input type="hidden" name="lesson_id" value={lessonId} />
                <input type="hidden" name="to" value="completed" />
                <SubmitButton className="btn btn-outline btn-sm"><Flag className="w-4 h-4" /> {d.teacher.complete}</SubmitButton>
              </form>
            )}
            <form action={duplicateLessonAction}>
              <input type="hidden" name="lesson_id" value={lessonId} />
              <SubmitButton className="btn btn-ghost btn-sm" pendingText={d.common.loading}><Copy className="w-4 h-4" /> {d.teacher.duplicateLesson}</SubmitButton>
            </form>
            <form action={deleteLessonAction}>
              <input type="hidden" name="lesson_id" value={lessonId} />
              <SubmitButton className="btn btn-ghost btn-sm !text-danger" confirmText={d.teacher.deleteLessonConfirm}><Trash2 className="w-4 h-4" /> {d.teacher.deleteLesson}</SubmitButton>
            </form>
          </div>
        </div>
      </div>

      {problems.length > 0 && (
        <div className="mb-4">
          <Notice tone="error">
            {d.teacher.validationFailed}
            <ul className="list-disc pl-5">{problems.map((p, i) => <li key={i}>{p}</li>)}</ul>
          </Notice>
        </div>
      )}

      {lesson.status === "published" && c && (
        <section className="card p-5 mb-4">
          <h2 className="font-bold text-lg flex items-center gap-2"><Timer className="w-5 h-5" /> {d.teacher.live}</h2>
          <p className="text-xs text-muted">{d.teacher.timerNote}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {c.stages.map((s, i) => (
              <form key={i} action={stageControlAction}>
                <input type="hidden" name="lesson_id" value={lessonId} />
                <input type="hidden" name="op" value="start" />
                <input type="hidden" name="index" value={i} />
                <SubmitButton className={`btn btn-sm ${lesson.current_stage === i && lesson.stage_started_at ? "btn-primary" : "btn-outline"}`}>
                  {i + 1}. {pick(s.title, lang)} ({s.minutes}′)
                </SubmitButton>
              </form>
            ))}
          </div>
          {lesson.stage_started_at && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span>{d.teacher.currentStage}: <b>{pick(c.stages[lesson.current_stage]?.title, lang)}</b> · {c.stages[lesson.current_stage]?.minutes + lesson.stage_extra_min} {d.common.min}</span>
              {[2, 5].map((m) => (
                <form key={m} action={stageControlAction}>
                  <input type="hidden" name="lesson_id" value={lessonId} />
                  <input type="hidden" name="op" value="extend" />
                  <input type="hidden" name="minutes" value={m} />
                  <SubmitButton className="btn btn-ghost btn-sm"><Plus className="w-4 h-4" /> {fmt(d.teacher.extend, { n: m })}</SubmitButton>
                </form>
              ))}
            </div>
          )}
        </section>
      )}

      {(assignments?.length ?? 0) > 0 && (
        <section className="card p-5 mb-4 overflow-x-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="font-bold text-lg">{d.teacher.assignments}</h2>
            <form action={rematchVariantsAction}>
              <input type="hidden" name="lesson_id" value={lessonId} />
              <SubmitButton className="btn btn-outline btn-sm" confirmText={d.teacher.rematchConfirm}>{d.teacher.rematch}</SubmitButton>
            </form>
          </div>
          <p className="text-xs text-muted mb-2">{d.teacher.rematchHint}</p>
          <table className="table min-w-[640px]">
            <thead><tr><th>{d.teacher.firstName}</th><th>{d.teacher.chosenInterests}</th><th>{d.teacher.variants}</th><th>{d.teacher.status.published}</th><th>{d.teacher.mode}</th></tr></thead>
            <tbody>
              {(assignments as unknown as { id: string; student_id: string; variant_key: string; status: string; mode: string; students: { first_name: string; last_name: string } }[]).map((a) => (
                <tr key={a.id}>
                  <td>{a.students?.first_name} {a.students?.last_name}</td>
                  <td className="text-sm text-muted">{(chosen.get(a.student_id) ?? []).map((i) => interestLabel(d, i)).join(", ") || "—"}</td>
                  <td>
                    {interestLabel(d, a.variant_key)}
                    {chosen.get(a.student_id)?.length && !chosen.get(a.student_id)!.includes(a.variant_key) ? <span className="text-warn" title={d.teacher.noMatchingVariant}> ⚠</span> : null}
                  </td>
                  <td>{statusLabel[a.status]}</td>
                  <td>
                    <form action={setModeAction} className="flex gap-1">
                      <input type="hidden" name="assignment_id" value={a.id} />
                      <SubmitButton name="mode" value="phone" className={`btn btn-sm ${a.mode === "phone" ? "btn-primary" : "btn-ghost"}`}>{d.teacher.phone}</SubmitButton>
                      <SubmitButton name="mode" value="paper" className={`btn btn-sm ${a.mode === "paper" ? "btn-primary" : "btn-ghost"}`}>{d.teacher.paper}</SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {c && (
        <div className="space-y-4">
          {editable && (
            <div className="grid lg:grid-cols-2 gap-4 items-start">
              <LessonEditor lessonId={lessonId} content={c} />
              {ai.configured ? <RegenPanel lessonId={lessonId} interests={c.variants.map((v) => v.interest)} /> : <Notice tone="warn">{d.teacher.aiNotConfigured}</Notice>}
            </div>
          )}
          {!editable && <Notice>{d.teacher.regenBlocked}</Notice>}

          <section className="card p-5">
            <h2 className="font-bold text-lg">{d.teacher.outcomes}</h2>
            <ul className="list-disc pl-5 mt-2">{c.expected_outcomes.map((o, i) => <li key={i}>{pick(o, lang)}</li>)}</ul>
          </section>
          <section className="card p-5">
            <h2 className="font-bold text-lg">{d.teacher.rationale}</h2>
            <dl className="mt-2 grid gap-2 text-sm">
              {(["analyze", "design", "develop", "implement", "evaluate"] as const).map((k) => (
                <div key={k} className="grid sm:grid-cols-[140px_1fr] gap-2"><dt className="font-bold text-leaf-800">{d.addie.stages[k].name}</dt><dd>{cleanText(pick(c.addie_rationale[k], lang))}</dd></div>
              ))}
            </dl>
          </section>
          <section className="card p-5">
            <h2 className="font-bold text-lg mb-2">{d.teacher.plan}</h2>
            <LessonPlanTable stages={c.stages} d={d} lang={lang} duration={lesson.duration_min} />
          </section>
          <section className="card p-5">
            <h2 className="font-bold text-lg mb-2">{d.teacher.variants}</h2>
            <div className="space-y-6">
              {c.variants.map((v) => (
                <div key={v.interest}>
                  <div className="flex items-center gap-3 mb-2">
                    {IMG[v.interest] && <Image src={IMG[v.interest]} alt="" width={48} height={40} className="object-contain" />}
                    <h3 className="font-bold">{interestLabel(d, v.interest)} <span className="font-normal text-sm text-muted">— {pick(v.context, lang)}</span></h3>
                    <span className="ml-auto text-sm text-muted">{fmt(d.teacher.totalPoints, { n: totalPoints(variantTasks(c, v)) })}</span>
                  </div>
                  <div className="mb-2"><TheoryCard theory={v.theory} title={d.student.theory} lang={lang} compact /></div>
                  <div className="grid gap-2">{v.tasks.map((t, i) => <TaskPreview key={t.id} task={t} index={i + 1} d={d} lang={lang} showKey />)}</div>
                </div>
              ))}
              <div>
                <h3 className="font-bold mb-2">{d.teacher.commonTasks}</h3>
                <div className="grid gap-2">{c.common_tasks.map((t, i) => <TaskPreview key={t.id} task={t} index={i + 1} d={d} lang={lang} showKey />)}</div>
              </div>
            </div>
          </section>
          <section className="card p-5">
            <h2 className="font-bold text-lg mb-2">{d.teacher.criteria}</h2>
            <CriteriaTable criteria={c.criteria} d={d} lang={lang} />
          </section>
          <section className="card p-5 grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <h3 className="font-bold">{d.teacher.vocabulary}</h3>
              <ul className="mt-1">{c.support.vocabulary.map((v, i) => <li key={i}><b lang="en">{v.en}</b> — {v.kk}</li>)}</ul>
            </div>
            <div>
              <h3 className="font-bold">{d.teacher.frames}</h3>
              <ul className="list-disc pl-5 mt-1" lang="en">{c.support.sentence_frames.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </div>
            <div>
              <h3 className="font-bold">{d.teacher.explanation}</h3>
              <p className="mt-1">{pick(c.support.explanation, lang)}</p>
            </div>
          </section>
          <section className="card p-5 grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-bold">{d.teacher.reflection}</h3>
              <ul className="list-disc pl-5 mt-1">{c.reflection_questions.map((q, i) => <li key={i}>{pick(q, lang)}</li>)}</ul>
            </div>
            <div>
              <h3 className="font-bold">{d.teacher.homework}</h3>
              <p className="mt-1">{pick(c.homework, lang)}</p>
            </div>
          </section>
          {(versions?.length ?? 0) > 1 && (
            <details className="card p-5">
              <summary className="font-bold cursor-pointer flex items-center gap-2"><History className="w-4 h-4" /> {d.teacher.versions}</summary>
              <ul className="mt-2 space-y-1 text-sm">
                {versions!.map((v) => (
                  <li key={v.version} className="flex items-center gap-2">
                    <span>{fmt(d.teacher.version, { n: v.version })} · {v.note} · {new Date(v.created_at).toLocaleString(lang === "kk" ? "kk-KZ" : "en-GB")}</span>
                    {editable && v.version !== lesson.version && (
                      <form action={restoreVersionAction}>
                        <input type="hidden" name="lesson_id" value={lessonId} />
                        <input type="hidden" name="version" value={v.version} />
                        <SubmitButton className="btn btn-ghost btn-sm"><Undo2 className="w-3.5 h-3.5" /></SubmitButton>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </>
  );
}
