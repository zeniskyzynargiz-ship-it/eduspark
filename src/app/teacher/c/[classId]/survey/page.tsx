import { requireClass } from "@/lib/teacher";
import { getDict } from "@/lib/i18n/server";
import { PageTitle } from "@/components/Shared";
import { parseSurveyConfig } from "@/lib/survey";
import { SurveyBuilder } from "@/components/teacher/SurveyBuilder";

export default async function SurveyBuilderPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const { sb, cls } = await requireClass(classId);
  const { d } = await getDict();
  const { data } = await sb.from("classes").select("survey_config").eq("id", classId).maybeSingle();
  return (
    <>
      <PageTitle title={`${d.teacher.sections.survey} · ${cls.name}`} sub={d.teacher.sb.intro} />
      <SurveyBuilder classId={classId} initial={parseSurveyConfig(data?.survey_config)} />
    </>
  );
}
