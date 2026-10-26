import { getDict } from "@/lib/i18n/server";
import { requireStudent, latestSurvey } from "@/lib/student-data";
import { StudentShell } from "@/components/student/StudentShell";
import { SurveyForm } from "./SurveyForm";

export default async function SurveyPage() {
  const st = await requireStudent();
  const { d } = await getDict();
  const last = await latestSurvey(st.id);
  return (
    <StudentShell st={st} d={d}>
      <h1 className="text-2xl font-bold">{d.student.surveyTitle}</h1>
      <p className="text-sm text-muted mt-1">{d.student.surveyIntro}</p>
      <SurveyForm initial={last} />
    </StudentShell>
  );
}
