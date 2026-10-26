import Link from "next/link";
import { ClipboardList, PenLine, CheckCircle2, ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { getDict } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n";
import { requireStudent, latestSurvey, studentLessons, ensureAssignment } from "@/lib/student-data";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { StudentShell } from "@/components/student/StudentShell";
import { interestLabel } from "@/lib/survey";

export default async function StudentHome() {
  const st = await requireStudent();
  const { d } = await getDict();
  const [survey, { data: baseline }, lessons] = await Promise.all([
    latestSurvey(st.id),
    supabaseAdmin().from("baseline_attempts").select("id").eq("student_id", st.id).maybeSingle(),
    studentLessons(st.classId),
  ]);
  const today = lessons.find((l) => l.status === "published");
  const todayAssignment = today ? await ensureAssignment(st.id, today) : null;
  const statusLabel: Record<string, string> = { assigned: d.teacher.notStarted, in_progress: d.teacher.inProgress, submitted: d.teacher.submitted, graded: d.teacher.graded };

  return (
    <StudentShell st={st} d={d}>
      <h1 className="text-2xl font-bold">{fmt(d.student.hello, { name: st.firstName })}</h1>
      <p className="text-sm text-muted">{fmt(d.student.classLabel, { name: st.className })}</p>

      <section className="mt-5 card p-5">
        <h2 className="font-bold text-lg flex items-center gap-2"><BookOpen className="w-5 h-5 text-leaf-700" /> {d.student.todayLesson}</h2>
        {today && todayAssignment ? (
          <div className="mt-2">
            <div className="text-xl font-bold" lang="en">{today.topic}</div>
            <p className="text-sm mt-1"><b>{d.student.goal}:</b> {today.objective}</p>
            <p className="text-xs text-muted mt-1">{interestLabel(d, todayAssignment.variant_key)} · {statusLabel[todayAssignment.status]}</p>
            <Link href={`/student/lesson/${today.id}`} className="btn btn-primary w-full mt-4">{todayAssignment.status === "assigned" ? d.student.start : d.common.open} <ArrowRight className="w-4 h-4" /></Link>
          </div>
        ) : (
          <p className="text-muted mt-2">{d.student.noLesson}</p>
        )}
      </section>

      <h2 className="font-bold mt-6 mb-2">{d.student.steps}</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <Link href="/student/survey" className="card p-4 flex gap-3 items-start hover:bg-leaf-50">
          <ClipboardList className="w-6 h-6 text-leaf-700 shrink-0" />
          <div className="flex-1">
            <div className="font-bold">{d.student.surveyCard}</div>
            <div className="text-sm text-muted">{d.student.surveyCardText}</div>
            <div className="mt-2 text-sm font-semibold text-leaf-700">{survey ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {d.student.done} · {d.student.update}</span> : d.student.start}</div>
          </div>
        </Link>
        <Link href="/student/baseline" className="card p-4 flex gap-3 items-start hover:bg-leaf-50">
          <PenLine className="w-6 h-6 text-leaf-700 shrink-0" />
          <div className="flex-1">
            <div className="font-bold">{d.student.baselineCard}</div>
            <div className="text-sm text-muted">{d.student.baselineCardText}</div>
            <div className="mt-2 text-sm font-semibold text-leaf-700">{baseline ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {d.student.done}</span> : d.student.start}</div>
          </div>
        </Link>
      </div>

      <h2 className="font-bold mt-6 mb-2">{d.student.results}</h2>
      {lessons.length === 0 ? (
        <p className="text-muted text-sm">{d.student.noResults}</p>
      ) : (
        <ul className="space-y-2">
          {lessons.map((l) => (
            <li key={l.id} className="card p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate" lang="en">{l.topic}</div>
                <div className="text-xs text-muted">{d.teacher.status[l.status as "published"]}{l.feedback_released ? ` · ${d.student.feedback}` : ""}</div>
              </div>
              <Link href={`/student/lesson/${l.id}`} className="btn btn-outline btn-sm">{d.common.open}</Link>
              <Link href={`/student/summary/${l.id}`} className="btn btn-ghost btn-sm"><Sparkles className="w-4 h-4" /> {d.student.summaryBtn}</Link>
            </li>
          ))}
        </ul>
      )}
    </StudentShell>
  );
}
