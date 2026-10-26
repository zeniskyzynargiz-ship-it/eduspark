import { requireClass } from "@/lib/teacher";
import { getDict } from "@/lib/i18n/server";
import { loadClassProfile, variantInterests } from "@/lib/profile";
import { aiStatus } from "@/lib/ai/provider";
import { PageTitle, Notice } from "@/components/Shared";
import { CreateLessonForm } from "./CreateLessonForm";
import { interestLabel } from "@/lib/survey";

export default async function CreateLessonPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const { sb, cls } = await requireClass(classId);
  const { d } = await getDict();
  const profile = await loadClassProfile(sb, classId);
  const ai = aiStatus();
  return (
    <>
      <PageTitle title={`${d.teacher.sections.create} · ${cls.name}`} sub={d.teacher.createIntro} />
      <div className="space-y-2 mb-4">
        {!ai.configured && <Notice tone="warn">{d.teacher.aiNotConfigured}</Notice>}
        {ai.configured && <Notice>{d.teacher.aiCost}</Notice>}
        {profile.missing.map((m) => <Notice key={m} tone="warn">{d.teacher.missing[m]}</Notice>)}
        <p className="text-sm text-muted">{d.teacher.variants}: {variantInterests(profile).map((i) => interestLabel(d, i)).join(", ")}</p>
      </div>
      <CreateLessonForm classId={classId} />
    </>
  );
}
