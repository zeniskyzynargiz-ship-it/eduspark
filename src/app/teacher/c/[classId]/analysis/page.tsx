import { requireClass } from "@/lib/teacher";
import { getDict } from "@/lib/i18n/server";
import { loadClassProfile, type SurveyRow } from "@/lib/profile";
import { PageTitle, Notice, Bar, Empty } from "@/components/Shared";
import { SubmitButton } from "@/components/ui";
import { addObservationAction, resetBaselineAction } from "@/app/teacher/actions";
import { BASELINE_TASKS } from "@/lib/baseline";

export default async function AnalysisPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const { sb, cls } = await requireClass(classId);
  const { d, lang } = await getDict();
  const p = await loadClassProfile(sb, classId);
  const ids = p.students.map((s) => s.id);
  const [{ data: history }, { data: observations }] = await Promise.all([
    ids.length ? sb.from("survey_responses").select("*").in("student_id", ids).order("created_at", { ascending: false }) : Promise.resolve({ data: [] as SurveyRow[] }),
    ids.length ? sb.from("observations").select("id, student_id, note, created_at").in("student_id", ids).order("created_at", { ascending: false }) : Promise.resolve({ data: [] as { id: string; student_id: string; note: string; created_at: string }[] }),
  ]);
  const date = (s: string) => new Date(s).toLocaleDateString(lang === "kk" ? "kk-KZ" : "en-GB");
  const sortedCounts = (m: Record<string, number>) => Object.entries(m).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, p.surveyCount);

  return (
    <>
      <PageTitle title={`${d.teacher.sections.analysis} · ${cls.name}`} sub={d.teacher.analysisIntro} />
      <div className="space-y-2 mb-5">
        {p.missing.map((m) => <Notice key={m} tone="warn">{d.teacher.missing[m]}</Notice>)}
      </div>
      {p.studentCount === 0 ? (
        <Empty text={d.teacher.noStudents} />
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="card p-5">
              <div className="text-sm text-muted">{d.teacher.surveyProgress}</div>
              <div className="text-3xl font-bold mt-1">{p.surveyCount} / {p.studentCount}</div>
            </div>
            <div className="card p-5">
              <div className="text-sm text-muted">{d.teacher.baselineProgress}</div>
              <div className="text-3xl font-bold mt-1">{p.baselineCount} / {p.studentCount}</div>
            </div>
            <div className="card p-5">
              <div className="text-sm text-muted">{d.teacher.baselineAvg}</div>
              <div className="text-3xl font-bold mt-1">{p.baselineAvgPct === null ? "—" : `${p.baselineAvgPct}%`}</div>
              {p.baselineAvgPct === null && <div className="text-xs text-muted">{d.teacher.noData}</div>}
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <section className="card p-5 space-y-2">
              <h2 className="font-bold">{d.teacher.interestDist}</h2>
              {p.surveyCount ? sortedCounts(p.interestCounts).map(([k, n]) => <Bar key={k} label={d.interests[k as keyof typeof d.interests] ?? k} value={n} max={max} />) : <p className="text-sm text-muted">{d.teacher.noData}</p>}
            </section>
            <section className="card p-5 space-y-2">
              <h2 className="font-bold">{d.teacher.difficultyDist}</h2>
              {p.surveyCount ? sortedCounts(p.difficultyCounts).map(([k, n]) => <Bar key={k} label={d.difficulties[k as keyof typeof d.difficulties] ?? k} value={n} max={max} />) : <p className="text-sm text-muted">{d.teacher.noData}</p>}
            </section>
            <section className="card p-5 space-y-2">
              <h2 className="font-bold">{d.teacher.supportDist}</h2>
              {p.surveyCount && Object.keys(p.supportCounts).length ? sortedCounts(p.supportCounts).map(([k, n]) => <Bar key={k} label={d.supports[k as keyof typeof d.supports] ?? k} value={n} max={max} />) : <p className="text-sm text-muted">{d.teacher.noData}</p>}
              <h3 className="font-bold pt-3">{d.teacher.avgScales}</h3>
              <ul className="text-sm space-y-1">
                <li>{d.teacher.scaleInterest}: <b>{p.avg.interest ?? "—"}</b></li>
                <li>{d.teacher.scaleConfidence}: <b>{p.avg.confidence ?? "—"}</b></li>
                <li>{d.teacher.scaleMeaning}: <b>{p.avg.meaning ?? "—"}</b></li>
              </ul>
            </section>
          </div>

          <h2 className="text-xl font-bold mt-8 mb-3">{d.teacher.perStudent}</h2>
          <div className="space-y-3">
            {p.students.map((s) => {
              const sv = p.latest.get(s.id);
              const bl = p.baseline.get(s.id);
              const hist = (history ?? []).filter((h) => h.student_id === s.id);
              const obs = (observations ?? []).filter((o) => o.student_id === s.id);
              const writing = (bl?.answers as Record<string, unknown> | undefined)?.b5;
              return (
                <details key={s.id} className="card p-4">
                  <summary className="cursor-pointer flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="font-bold">{s.first_name} {s.last_name}</span>
                    <span className="text-sm text-muted">{sv ? sv.interests.map((i) => d.interests[i as keyof typeof d.interests] ?? i).join(", ") : d.teacher.missing.no_survey}</span>
                    <span className="text-sm ml-auto">{bl ? `${d.teacher.baselineDone}: ${bl.score}/${bl.max_score}` : "—"}</span>
                  </summary>
                  <div className="mt-3 grid md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      {sv ? (
                        <>
                          <p><b>{d.teacher.difficultyDist}:</b> {sv.difficulties.map((x) => d.difficulties[x as keyof typeof d.difficulties] ?? x).join(", ") || "—"}</p>
                          <p><b>{d.teacher.supportDist}:</b> {sv.support.map((x) => d.supports[x as keyof typeof d.supports] ?? x).join(", ") || "—"} {sv.support_other}</p>
                          <p><b>{d.teacher.avgScales}:</b> {sv.interest_scale ?? "—"} / {sv.confidence_scale ?? "—"} / {sv.meaning_scale ?? "—"}</p>
                          {sv.other_interest && <p><b>{d.interests.other}:</b> {sv.other_interest}</p>}
                        </>
                      ) : (
                        <p className="text-muted">{d.teacher.missing.no_survey}</p>
                      )}
                      {hist.length > 0 && (
                        <div className="pt-2">
                          <b>{d.teacher.surveyHistory}:</b>
                          <ul className="list-disc pl-5">
                            {hist.map((h) => <li key={h.id}>v{h.version} · {d.teacher.answeredAt}: {date(h.created_at)} · {h.interests.map((i: string) => d.interests[i as keyof typeof d.interests] ?? i).join(", ")}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {bl ? (
                        <>
                          <ul className="space-y-0.5">
                            {BASELINE_TASKS.filter((t) => t.type !== "short").map((t) => {
                              const r = (bl.results as Record<string, { score: number; max: number }>)[t.id];
                              return <li key={t.id}>{t.id.toUpperCase()} · {d.teacher.taskTypes[t.type]}: {r ? `${r.score}/${r.max}` : "—"}</li>;
                            })}
                          </ul>
                          {typeof writing === "string" && writing && <p className="rounded-lg bg-leaf-50 p-2"><b>{d.teacher.writingAnswer}:</b> <span lang="en">{writing}</span></p>}
                          <form action={resetBaselineAction}>
                            <input type="hidden" name="student_id" value={s.id} />
                            <SubmitButton className="btn btn-ghost btn-sm">{d.teacher.resetBaseline}</SubmitButton>
                          </form>
                        </>
                      ) : (
                        <p className="text-muted">{d.teacher.missing.no_baseline}</p>
                      )}
                      <div>
                        <b>{d.teacher.observation}</b>
                        <ul className="list-disc pl-5">{obs.map((o) => <li key={o.id}>{date(o.created_at)}: {o.note}</li>)}</ul>
                        <form action={addObservationAction} className="flex gap-2 mt-1">
                          <input type="hidden" name="student_id" value={s.id} />
                          <input name="note" required maxLength={1000} className="input !min-h-10 !py-1.5 text-sm" placeholder={d.teacher.observationPh} aria-label={d.teacher.addObservation} />
                          <SubmitButton className="btn btn-outline btn-sm shrink-0">{d.common.add}</SubmitButton>
                        </form>
                      </div>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
