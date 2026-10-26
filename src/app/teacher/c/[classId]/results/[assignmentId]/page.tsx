import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireClass } from "@/lib/teacher";
import { getDict } from "@/lib/i18n/server";
import { pupilFacts } from "@/lib/summary-facts";
import { studentSlides, INTEREST_IMG } from "@/lib/summary";
import { PageTitle } from "@/components/Shared";
import { SummaryVideo } from "@/components/SummaryVideo";

/** One student's summary video, as the teacher sees it (with grades even before release). */
export default async function PupilSummaryPage({ params }: { params: Promise<{ classId: string; assignmentId: string }> }) {
  const { classId, assignmentId } = await params;
  const { sb } = await requireClass(classId);
  const { d, lang } = await getDict();
  const r = await pupilFacts(sb, assignmentId);
  if (!r || r.lesson.class_id !== classId) notFound();
  const name = `${r.student?.first_name ?? ""} ${r.student?.last_name ?? ""}`.trim();
  const slides = studentSlides(d, lang, { interest: r.assignment.variant_key, done: r.sc.answered, total: r.sc.total, byCrit: r.sc.byCrit, criteria: r.content.criteria, image: INTEREST_IMG[r.assignment.variant_key], tasks: r.sc.perTask, released: true });
  return (
    <>
      <Link href={`/teacher/c/${classId}/results?lesson=${r.lesson.id}`} className="btn btn-ghost btn-sm mb-2"><ArrowLeft className="w-4 h-4" /> {d.teacher.sections.results}</Link>
      <PageTitle title={`${name}: ${d.summary.title}`} sub={r.lesson.topic} />
      {r.sc.answered === 0 ? (
        <p className="card p-5 text-muted">{d.summary.noData}</p>
      ) : (
        <div className="card p-5">
          <SummaryVideo
            title={`${r.student?.first_name ?? ""}: ${d.summary.title}`}
            subtitle={r.lesson.topic}
            slides={slides}
            scriptUrl={`/api/summary/script?scope=pupil&assignment=${assignmentId}`}
            allowPhoto
            fileName={`eduspark-${(r.student?.first_name ?? "student").replace(/[^\p{L}\p{N}]+/gu, "-")}`}
          />
        </div>
      )}
    </>
  );
}
