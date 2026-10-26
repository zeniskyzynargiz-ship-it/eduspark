import { CheckCircle2, Circle, RefreshCw, Trash2, Printer } from "lucide-react";
import { requireClass } from "@/lib/teacher";
import { getDict } from "@/lib/i18n/server";
import { env } from "@/lib/env";
import { PageTitle, Empty } from "@/components/Shared";
import { JoinPanel } from "@/components/teacher/JoinPanel";
import { AddStudents } from "@/components/teacher/AddStudents";
import { SubmitButton } from "@/components/ui";
import { resetCodeAction, removeStudentAction, deleteClassAction } from "@/app/teacher/actions";

export default async function StudentsPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const { sb, cls } = await requireClass(classId);
  const { d } = await getDict();
  const { data: students } = await sb.from("students").select("id, first_name, last_name, personal_code").eq("class_id", classId).order("first_name");
  const ids = (students ?? []).map((s) => s.id);
  const [{ data: surveys }, { data: baselines }] = await Promise.all([
    ids.length ? sb.from("survey_responses").select("student_id").in("student_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? sb.from("baseline_attempts").select("student_id").in("student_id", ids) : Promise.resolve({ data: [] }),
  ]);
  const hasSurvey = new Set((surveys ?? []).map((s) => s.student_id));
  const hasBaseline = new Set((baselines ?? []).map((s) => s.student_id));
  const joinUrl = `${env.siteUrl()}/join/${cls.join_code}`;

  return (
    <>
      <PageTitle
        title={`${d.teacher.sections.students} · ${cls.name}`}
        sub={cls.grade_level}
        actions={
          students?.length ? (
            <a href={`/print/cards/${classId}`} target="_blank" className="btn btn-outline btn-sm"><Printer className="w-4 h-4" /> {d.teacher.printCards}</a>
          ) : null
        }
      />
      <div className="space-y-5">
        <JoinPanel joinUrl={joinUrl} code={cls.join_code} printHref={`/print/qr/${classId}`} />
        <AddStudents classId={classId} />
        {!students?.length ? (
          <Empty text={d.teacher.noStudents} />
        ) : (
          <div className="card overflow-x-auto">
            <table className="table min-w-[640px]">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{d.teacher.firstName} {d.teacher.lastName}</th>
                  <th>{d.teacher.code}</th>
                  <th>{d.teacher.surveyDone}</th>
                  <th>{d.teacher.baselineDone}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id}>
                    <td>{i + 1}</td>
                    <td className="font-medium">{s.first_name} {s.last_name}</td>
                    <td className="font-mono font-bold tracking-wider">{s.personal_code}</td>
                    <td>{hasSurvey.has(s.id) ? <CheckCircle2 className="w-5 h-5 text-leaf-600" aria-label={d.common.yes} /> : <Circle className="w-5 h-5 text-gray-300" aria-label={d.common.no} />}</td>
                    <td>{hasBaseline.has(s.id) ? <CheckCircle2 className="w-5 h-5 text-leaf-600" aria-label={d.common.yes} /> : <Circle className="w-5 h-5 text-gray-300" aria-label={d.common.no} />}</td>
                    <td>
                      <div className="flex gap-1 justify-end">
                        <form action={resetCodeAction}>
                          <input type="hidden" name="student_id" value={s.id} />
                          <SubmitButton className="btn btn-ghost btn-sm" confirmText={d.teacher.resetCodeConfirm}><RefreshCw className="w-4 h-4" /> <span className="hidden md:inline">{d.teacher.resetCode}</span></SubmitButton>
                        </form>
                        <form action={removeStudentAction}>
                          <input type="hidden" name="student_id" value={s.id} />
                          <SubmitButton className="btn btn-ghost btn-sm !text-danger" confirmText={d.teacher.removeConfirm}><Trash2 className="w-4 h-4" /><span className="sr-only">{d.teacher.remove}</span></SubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <form action={deleteClassAction} className="pt-4">
          <input type="hidden" name="class_id" value={classId} />
          <SubmitButton className="btn btn-danger btn-sm" confirmText={d.teacher.deleteClassConfirm}><Trash2 className="w-4 h-4" /> {d.teacher.deleteClass}</SubmitButton>
        </form>
      </div>
    </>
  );
}
