import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/teacher";
import { getDict } from "@/lib/i18n/server";
import { pick, fmt } from "@/lib/i18n";
import { variantTasks, totalPoints, type LessonContent, type Task, type Criterion } from "@/lib/lesson";
import { loadLessonWork, scoreAssignment } from "@/lib/results";
import { strongWeak } from "@/lib/summary";
import { PrintShell, PrintHeader } from "@/components/PrintShell";
import { TaskPreview } from "@/components/TaskPreview";
import { LessonPlanTable, CriteriaTable } from "@/components/LessonTables";
import type { Dict, Lang } from "@/lib/i18n";
import { interestLabel } from "@/lib/survey";
import { cleanText } from "@/lib/lesson-fix";
import { TheoryCard } from "@/components/TheoryCard";
import type { Theory } from "@/lib/lesson";

type T = "plan" | "key" | "grading" | "class" | "student" | "variant" | "summary";

function StudentSheet({ d, lang, topic, objective, context, theory, tasks, criteria, name }: { d: Dict; lang: Lang; topic: string; objective: string; context: { kk: string; en: string }; theory?: Theory | null; tasks: Task[]; criteria: Criterion[]; name?: string }) {
  return (
    <section className="print-page">
      <PrintHeader title={topic} sub={`${d.student.goal}: ${objective}`} d={d} nameLine={!name} />
      {name && <p className="mb-2 font-bold">{d.print.name}: {name} <span className="font-normal ml-6">{d.print.date}: ____________</span></p>}
      <p className="text-sm mb-1">{pick(context, lang)}</p>
      <p className="text-xs mb-3">
        <b>{d.student.criteria}:</b> {criteria.map((c) => pick(c.name, lang)).join(", ")} · {fmt(d.teacher.totalPoints, { n: totalPoints(tasks) })}
      </p>
      <div className="mb-3"><TheoryCard theory={theory} title={d.student.theory} lang={lang} compact /></div>
      <div className="space-y-3">
        {tasks.map((t, i) => <TaskPreview key={t.id} task={t} index={i + 1} d={d} lang={lang} showKey={false} paper />)}
      </div>
      <p className="text-[9pt] text-gray-500 mt-3">{d.print.noKey}</p>
    </section>
  );
}

export default async function PrintLesson({ params, searchParams }: { params: Promise<{ lessonId: string }>; searchParams: Promise<{ type?: string; assignment?: string; interest?: string }> }) {
  const { lessonId } = await params;
  const sp = await searchParams;
  const type = (sp.type ?? "plan") as T;
  const { sb } = await requireTeacher();
  const { d, lang } = await getDict();
  if (!/^[0-9a-f-]{36}$/i.test(lessonId)) notFound();
  // RLS: only the owner teacher can read this lesson.
  const { data: lesson } = await sb.from("lessons").select("*, classes(name)").eq("id", lessonId).maybeSingle();
  if (!lesson?.content) notFound();
  const c = lesson.content as LessonContent;
  const className = (lesson.classes as { name: string } | null)?.name ?? "";
  const sub = `${className} · ${lesson.duration_min} ${d.common.min} · ${d.teacher.objective}: ${lesson.objective}`;

  if (type === "plan")
    return (
      <PrintShell d={d} title={d.teacher.exportPlan}>
        <PrintHeader title={`${d.print.lessonPlan}: ${lesson.topic}`} sub={sub} d={d} />
        {lesson.is_demo && <p className="text-xs mb-2">[{d.teacher.demoBadge}]</p>}
        <h2 className="font-bold mt-2">{d.teacher.outcomes}</h2>
        <ul className="list-disc pl-5 text-sm">{c.expected_outcomes.map((o, i) => <li key={i}>{pick(o, lang)}</li>)}</ul>
        <h2 className="font-bold mt-3">{d.teacher.rationale}</h2>
        <dl className="text-sm">
          {(["analyze", "design", "develop", "implement", "evaluate"] as const).map((k) => (
            <div key={k} className="avoid-break"><dt className="inline font-bold">{d.addie.stages[k].name}: </dt><dd className="inline">{cleanText(pick(c.addie_rationale[k], lang))}</dd></div>
          ))}
        </dl>
        <h2 className="font-bold mt-3 mb-1">{d.teacher.plan}</h2>
        <LessonPlanTable stages={c.stages} d={d} lang={lang} duration={lesson.duration_min} />
        <h2 className="font-bold mt-3 mb-1">{d.teacher.criteria}</h2>
        <CriteriaTable criteria={c.criteria} d={d} lang={lang} />
        <div className="grid grid-cols-2 gap-4 text-sm mt-3 avoid-break">
          <div>
            <h3 className="font-bold">{d.teacher.vocabulary}</h3>
            <ul>{c.support.vocabulary.map((v, i) => <li key={i}>{v.en} — {v.kk}</li>)}</ul>
            <h3 className="font-bold mt-2">{d.teacher.frames}</h3>
            <ul className="list-disc pl-5">{c.support.sentence_frames.map((f, i) => <li key={i}>{f}</li>)}</ul>
          </div>
          <div>
            <h3 className="font-bold">{d.teacher.reflection}</h3>
            <ul className="list-disc pl-5">{c.reflection_questions.map((q, i) => <li key={i}>{pick(q, lang)}</li>)}</ul>
            <h3 className="font-bold mt-2">{d.teacher.homework}</h3>
            <p>{pick(c.homework, lang)}</p>
          </div>
        </div>
      </PrintShell>
    );

  if (type === "key")
    return (
      <PrintShell d={d} title={d.teacher.exportKey}>
        <PrintHeader title={`${d.print.teacherVersion}: ${lesson.topic}`} sub={sub} d={d} />
        {c.variants.map((v) => (
          <section key={v.interest} className="mb-5">
            <h2 className="font-bold text-lg mb-2">{interestLabel(d, v.interest)} · {fmt(d.teacher.totalPoints, { n: totalPoints(variantTasks(c, v)) })}</h2>
            <div className="space-y-2">{variantTasks(c, v).map((t, i) => <TaskPreview key={t.id} task={t} index={i + 1} d={d} lang={lang} showKey />)}</div>
          </section>
        ))}
        <h2 className="font-bold mt-3 mb-1">{d.teacher.criteria}</h2>
        <CriteriaTable criteria={c.criteria} d={d} lang={lang} />
      </PrintShell>
    );

  if (type === "variant") {
    const v = c.variants.find((x) => x.interest === sp.interest) ?? c.variants[0];
    return (
      <PrintShell d={d} title={d.print.studentVersion}>
        <StudentSheet d={d} lang={lang} topic={lesson.topic} objective={lesson.objective} context={v.context} theory={v.theory} tasks={variantTasks(c, v)} criteria={c.criteria} />
      </PrintShell>
    );
  }

  const work = await loadLessonWork(sb, lessonId);

  if (type === "student" || type === "class") {
    const list = type === "student" ? work.filter((a) => a.id === sp.assignment) : work;
    if (!list.length) notFound();
    return (
      <PrintShell d={d} title={type === "student" ? d.teacher.exportStudent : d.teacher.exportClass}>
        {list.map((a) => {
          const ac = a.content as unknown as { context: { kk: string; en: string }; theory?: Theory | null; tasks: Task[]; criteria: Criterion[] };
          return <StudentSheet key={a.id} d={d} lang={lang} topic={lesson.topic} objective={lesson.objective} context={ac.context} theory={ac.theory} tasks={ac.tasks} criteria={ac.criteria} name={`${a.students?.first_name ?? ""} ${a.students?.last_name ?? ""}`} />;
        })}
      </PrintShell>
    );
  }

  if (type === "grading")
    return (
      <PrintShell d={d} title={d.teacher.exportGrading}>
        <PrintHeader title={`${d.print.gradingSheet}: ${lesson.topic}`} sub={sub} d={d} />
        <table className="table text-[10pt]">
          <thead>
            <tr>
              <th>#</th>
              <th>{d.print.name}</th>
              {c.criteria.map((cr) => <th key={cr.id}>{pick(cr.name, lang)} ({cr.descriptors.reduce((s, x) => s + x.points, 0)})</th>)}
              <th>{d.teacher.total}</th>
            </tr>
          </thead>
          <tbody>
            {(work.length ? work : Array.from({ length: 10 }, () => null)).map((a, i) => {
              const s = a ? scoreAssignment(a) : null;
              return (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td className="min-w-40">{a ? `${a.students?.first_name ?? ""} ${a.students?.last_name ?? ""}` : ""}</td>
                  {c.criteria.map((cr) => <td key={cr.id} className="h-8">{s?.byCrit[cr.id]?.graded ? s.byCrit[cr.id].got : ""}</td>)}
                  <td>{s?.graded ? s.got : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-4 avoid-break">
          <h2 className="font-bold mb-1">{d.teacher.criteria}</h2>
          <CriteriaTable criteria={c.criteria} d={d} lang={lang} />
        </div>
        <p className="mt-6 text-sm">{d.print.signature}: ______________________</p>
      </PrintShell>
    );

  // Class summary as a PDF fallback for the summary video.
  const crit: Record<string, { got: number; gradedMax: number; graded: number }> = {};
  for (const a of work)
    for (const [id, v] of Object.entries(scoreAssignment(a).byCrit)) {
      const x = (crit[id] ??= { got: 0, gradedMax: 0, graded: 0 });
      x.got += v.got;
      x.gradedMax += v.gradedMax;
      x.graded += v.graded;
    }
  const { strong, weak } = strongWeak(crit, c.criteria, lang);
  const submitted = work.filter((a) => a.status === "submitted" || a.status === "graded").length;
  return (
    <PrintShell d={d} title={d.summary.teacherTitle}>
      <PrintHeader title={`${d.summary.teacherTitle}: ${lesson.topic}`} sub={sub} d={d} />
      <ul className="space-y-2">
        <li><b>{d.summary.classDone}:</b> {submitted} / {work.length}</li>
        <li><b>{d.summary.classStrong}:</b> {strong?.name ?? d.teacher.noData}</li>
        <li><b>{d.summary.classWeak}:</b> {weak?.name ?? d.teacher.noData}</li>
        <li><b>{d.summary.nextStep}:</b> {weak ? fmt(d.summary.nextText, { name: weak.name }) : d.summary.nextNone}</li>
      </ul>
      <p className="mt-4 text-xs">{d.teacher.oneLessonNote} {d.teacher.noGrowth}</p>
    </PrintShell>
  );
}
