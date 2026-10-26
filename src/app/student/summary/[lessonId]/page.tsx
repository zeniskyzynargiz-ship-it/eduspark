import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import { requireStudent } from "@/lib/student-data";
import { studentFacts } from "@/lib/summary-facts";
import { StudentShell } from "@/components/student/StudentShell";
import { SummaryVideo } from "@/components/SummaryVideo";
import { AutoPrint, PrintButton } from "@/components/AutoPrint";
import { studentSlides, INTEREST_IMG } from "@/lib/summary";

export default async function StudentSummaryPage({ params, searchParams }: { params: Promise<{ lessonId: string }>; searchParams: Promise<{ print?: string }> }) {
  const { lessonId } = await params;
  const sp = await searchParams;
  const st = await requireStudent();
  const { d, lang } = await getDict();
  const r = await studentFacts(st, lessonId);
  if (!r) notFound();
  const { lesson, assignment: a, content, sc } = r;
  const enough = sc.answered > 0;
  const slides = studentSlides(d, lang, { interest: a.variant_key, done: sc.answered, total: sc.total, byCrit: sc.byCrit, criteria: content.criteria, image: INTEREST_IMG[a.variant_key] }).map((sl, i, all) => (i === all.length - 1 ? { ...sl, image: "/images/hero-book-composition.webp" } : sl.image ? sl : { ...sl, image: INTEREST_IMG[a.variant_key] }));

  return (
    <StudentShell st={st} d={d}>
      <AutoPrint when={sp.print === "1"} />
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{d.summary.title}</h1>
        {sp.print === "1" && <PrintButton label={d.print.printBtn} />}
      </div>
      <p className="text-sm text-muted" lang="en">{lesson.topic}</p>
      {!enough ? (
        <p className="card p-5 mt-4 text-muted">{d.summary.noData}</p>
      ) : sp.print === "1" ? (
        <ol className="card p-5 mt-4 space-y-2">
          {slides.map((s, i) => <li key={i}><b>{s.label}:</b> {s.text}</li>)}
        </ol>
      ) : (
        <div className="mt-4">
          <SummaryVideo title={`${st.firstName}: ${d.summary.title}`} subtitle={lesson.topic} slides={slides} pdfHref={`/student/summary/${lessonId}?print=1`} scriptUrl={`/api/summary/script?scope=student&lesson=${lessonId}`} />
        </div>
      )}
    </StudentShell>
  );
}
