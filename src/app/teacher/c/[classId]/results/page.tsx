import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { requireClass } from "@/lib/teacher";
import { getDict } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import { loadLessonWork, scoreAssignment } from "@/lib/results";
import { strongWeak, critChart } from "@/lib/summary";
import { PageTitle, Empty, Notice, Bar } from "@/components/Shared";
import { LessonPicker } from "@/components/teacher/LessonPicker";
import { SummaryVideo } from "@/components/SummaryVideo";
import type { LessonContent } from "@/lib/lesson";

export default async function ResultsPage({ params, searchParams }: { params: Promise<{ classId: string }>; searchParams: Promise<{ lesson?: string }> }) {
  const { classId } = await params;
  const sp = await searchParams;
  const { sb, cls } = await requireClass(classId);
  const { d, lang } = await getDict();
  const { data: lessons } = await sb.from("lessons").select("id, topic, status, content").eq("class_id", classId).in("status", ["published", "completed"]).order("published_at", { ascending: false });
  const lesson = lessons?.find((l) => l.id === sp.lesson) ?? lessons?.[0];
  const work = lesson ? await loadLessonWork(sb, lesson.id) : [];
  const criteria = (lesson?.content as LessonContent | undefined)?.criteria ?? [];
  const scores = work.map((a) => ({ a, s: scoreAssignment(a) }));

  // Class totals per criterion (graded tasks only).
  const crit: Record<string, { got: number; gradedMax: number; graded: number }> = {};
  for (const { s } of scores)
    for (const [id, v] of Object.entries(s.byCrit)) {
      const c = (crit[id] ??= { got: 0, gradedMax: 0, graded: 0 });
      c.got += v.got;
      c.gradedMax += v.gradedMax;
      c.graded += v.graded;
    }
  const submitted = work.filter((a) => a.status === "submitted" || a.status === "graded").length;
  const refl = work.map((a) => a.reflection).filter(Boolean) as NonNullable<(typeof work)[number]["reflection"]>[];
  const avg = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => typeof x === "number");
    return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : "—";
  };
  const { strong, weak } = strongWeak(crit, criteria, lang);
  const fullyGraded = scores.filter(({ s }) => s.complete);

  return (
    <>
      <PageTitle title={`${d.teacher.sections.results} · ${cls.name}`} sub={d.teacher.resultsSeparate} />
      <LessonPicker lessons={lessons ?? []} current={lesson?.id} base={`/teacher/c/${classId}/results`} d={d} />
      {!lesson ? (
        <Empty text={d.teacher.noLessons} />
      ) : (
        <div className="space-y-4">
          <section className="card p-5">
            <h2 className="font-bold text-lg">1. {d.teacher.achievement}</h2>
            <div className="mt-3 grid md:grid-cols-2 gap-3">
              {criteria.map((c) => {
                const v = crit[c.id];
                const pct = v && v.gradedMax ? Math.round((v.got / v.gradedMax) * 100) : null;
                return <Bar key={c.id} label={`${pick(c.name, lang)} ${pct === null ? `(${d.teacher.noData})` : `${pct}%`}`} value={pct ?? 0} max={100} />;
              })}
            </div>
            <p className="mt-4 text-sm text-muted">{d.teacher.pupilVideoHint}</p>
            <div className="mt-2 overflow-x-auto">
              <table className="table min-w-[480px]">
                <thead><tr><th>{d.teacher.firstName}</th>{criteria.map((c) => <th key={c.id}>{pick(c.name, lang)}</th>)}<th>{d.teacher.total}</th></tr></thead>
                <tbody>
                  {scores.map(({ a, s }) => (
                    <tr key={a.id}>
                      <td>
                        <Link href={`/teacher/c/${classId}/results/${a.id}`} className="underline decoration-leaf-300 hover:text-leaf-700 inline-flex items-center gap-1" title={d.summary.title}>
                          <Clapperboard className="w-4 h-4 text-leaf-600" /> {a.students?.first_name} {a.students?.last_name?.slice(0, 1)}.
                        </Link>
                      </td>
                      {criteria.map((c) => <td key={c.id}>{s.byCrit[c.id]?.graded ? `${s.byCrit[c.id].got}/${s.byCrit[c.id].max}` : "—"}</td>)}
                      <td className="font-semibold">{s.graded ? `${s.got}/${s.max}` : "—"}{!s.complete && s.graded ? "*" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="card p-5">
            <h2 className="font-bold text-lg">2. {d.teacher.participation}</h2>
            <div className="mt-3 grid sm:grid-cols-2 gap-3">
              <Bar label={d.teacher.submitted} value={submitted} max={work.length} />
              <Bar label={d.teacher.graded} value={fullyGraded.length} max={work.length} />
            </div>
          </section>
          <section className="card p-5">
            <h2 className="font-bold text-lg">3. {d.teacher.reflectionBlock}</h2>
            <p className="text-sm mt-2">{d.teacher.avgInterest}: <b>{avg(refl.map((r) => r.interest))}</b> · {d.teacher.avgConfidence}: <b>{avg(refl.map((r) => r.confidence))}</b> · n = {refl.length}</p>
          </section>
          <Notice>{d.teacher.noGrowth}</Notice>
          <Notice>{d.teacher.oneLessonNote}</Notice>
          <section className="card p-5">
            <h2 className="font-bold text-lg mb-3">{d.summary.teacherTitle}</h2>
            {work.length === 0 ? (
              <p className="text-muted">{d.summary.noData}</p>
            ) : (
              <SummaryVideo
                title={`${d.summary.teacherTitle}: ${lesson.topic}`}
                subtitle={cls.name}
                pdfHref={`/print/lesson/${lesson.id}?type=summary`}
                scriptUrl={`/api/summary/script?scope=class&lesson=${lesson.id}`}
                slides={[
                  { icon: "✅", label: d.summary.classDone, text: `${submitted} / ${work.length}`, chart: [{ label: d.teacher.submitted, value: work.length ? Math.round((submitted / work.length) * 100) : 0 }, { label: d.teacher.graded, value: work.length ? Math.round((fullyGraded.length / work.length) * 100) : 0 }] },
                  { icon: "🎯", label: d.summary.classAchievement, text: `${fullyGraded.length} / ${work.length} ${d.teacher.graded.toLowerCase()}`, chart: critChart(crit, criteria, lang) },
                  { icon: "⭐", label: d.summary.classStrong, text: strong?.name ?? d.teacher.noData, image: "/images/hero-book-composition.webp" },
                  { icon: "💪", label: d.summary.classWeak, text: weak?.name ?? d.teacher.noData, image: "/images/interest-travel-globe.webp" },
                  { label: d.summary.nextStep, text: weak ? d.summary.nextText.replace("{name}", weak.name) : d.summary.nextNone, image: "/images/interest-tech-robot.webp", icon: "🚀" },
                ]}
              />
            )}
          </section>
        </div>
      )}
    </>
  );
}
