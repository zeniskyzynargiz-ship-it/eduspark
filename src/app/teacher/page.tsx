import Image from "next/image";
import Link from "next/link";
import { School, Users, ArrowRight, Sparkles, BarChart3, CheckSquare, ClipboardList, BookOpenCheck, Send, Trophy } from "lucide-react";
import { requireTeacher } from "@/lib/teacher";
import { getDict } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n";
import { Empty } from "@/components/Shared";
import { NewClassForm } from "@/components/teacher/NewClassForm";
import { scoreAssignment, type RespRow } from "@/lib/results";
import type { Task, Criterion } from "@/lib/lesson";
import { interestLabel } from "@/lib/survey";

const IMG: Partial<Record<string, string>> = {
  sport: "/images/interest-sport-ball.webp",
  music: "/images/interest-music-headphones.webp",
  travel: "/images/interest-travel-globe.webp",
  technology: "/images/interest-tech-robot.webp",
};
const EMOJI: Record<string, string> = { games: "🎮", animals: "🐾", art: "🎨", other: "✨" };

type AsRow = { id: string; lesson_id: string; status: string; content: { tasks: Task[]; criteria: Criterion[]; interest: string } };

export default async function TeacherHome() {
  const { sb, user } = await requireTeacher();
  const { d } = await getDict();
  const t = d.teacher.dash;

  const [{ data: teacher }, { data: classes }, { data: students }, { data: lessons }] = await Promise.all([
    sb.from("teachers").select("full_name").eq("id", user.id).maybeSingle(),
    sb.from("classes").select("id, name, grade_level, join_code, students(count)").order("created_at"),
    sb.from("students").select("id, class_id").eq("active", true),
    sb.from("lessons").select("id, class_id, topic, status, created_at, published_at").order("created_at", { ascending: false }),
  ]);
  const studentIds = (students ?? []).map((s) => s.id);
  const lessonIds = (lessons ?? []).map((l) => l.id);

  const [{ data: surveys }, { data: assigns }] = await Promise.all([
    studentIds.length
      ? sb.from("survey_responses").select("student_id, version, interests").in("student_id", studentIds)
      : Promise.resolve({ data: [] as { student_id: string; version: number; interests: string[] }[] }),
    lessonIds.length
      ? sb.from("assignments").select("id, lesson_id, status, content").in("lesson_id", lessonIds)
      : Promise.resolve({ data: [] as AsRow[] }),
  ]);
  const asList = (assigns ?? []) as AsRow[];
  const done = asList.filter((a) => a.status === "submitted" || a.status === "graded");
  const { data: resps } = done.length
    ? await sb.from("responses").select("*").in("assignment_id", done.map((a) => a.id))
    : { data: [] as RespRow[] };

  // Latest survey per student, then count each chosen interest.
  const latest = new Map<string, { version: number; interests: string[] }>();
  for (const s of surveys ?? []) {
    const cur = latest.get(s.student_id);
    if (!cur || s.version > cur.version) latest.set(s.student_id, s);
  }
  const interestCount: Record<string, number> = {};
  for (const s of latest.values()) for (const i of new Set(s.interests)) interestCount[i] = (interestCount[i] ?? 0) + 1;
  const interestRows = Object.entries(interestCount).map(([k, n]) => ({ k, n })).filter((r) => r.n > 0).sort((a, b) => b.n - a.n);
  const maxInterest = Math.max(1, ...interestRows.map((r) => r.n));

  // Scores of submitted works (graded tasks only).
  const perLesson = new Map<string, { submitted: number; total: number; got: number; max: number }>();
  let allGot = 0;
  let allMax = 0;
  let gradedWorks = 0;
  for (const a of asList) {
    const p = perLesson.get(a.lesson_id) ?? { submitted: 0, total: 0, got: 0, max: 0 };
    p.total += 1;
    if (a.status === "submitted" || a.status === "graded") {
      p.submitted += 1;
      const s = scoreAssignment({ content: a.content, responses: ((resps ?? []) as RespRow[]).filter((r) => r.assignment_id === a.id) });
      let gm = 0;
      for (const c of Object.values(s.byCrit)) gm += c.gradedMax;
      p.got += s.got;
      p.max += gm;
      allGot += s.got;
      allMax += gm;
      if (s.complete) gradedWorks += 1;
    }
    perLesson.set(a.lesson_id, p);
  }
  const pct = (g: number, m: number) => (m ? Math.round((g / m) * 100) : null);
  const avgAll = pct(allGot, allMax);

  const nStudents = studentIds.length;
  const nSurvey = latest.size;
  const published = (lessons ?? []).filter((l) => l.status === "published" || l.status === "completed").length;
  const firstClass = classes?.[0]?.id;
  const className = (id: string) => classes?.find((c) => c.id === id)?.name ?? "";
  const recent = (lessons ?? []).slice(0, 4);
  const name = (teacher?.full_name || "").trim();

  const stats = [
    { Icon: School, label: t.statClasses, value: String(classes?.length ?? 0) },
    { Icon: Users, label: t.statStudents, value: String(nStudents) },
    { Icon: ClipboardList, label: t.statSurvey, value: `${nSurvey}/${nStudents}`, bar: nStudents ? nSurvey / nStudents : 0 },
    { Icon: BookOpenCheck, label: t.statLessons, value: `${published}/${lessons?.length ?? 0}` },
    { Icon: Send, label: t.statWorks, value: String(done.length), sub: fmt(t.statGraded, { n: gradedWorks }) },
    { Icon: Trophy, label: t.statAvg, value: avgAll === null ? "—" : `${avgAll}%`, bar: avgAll === null ? undefined : avgAll / 100 },
  ];

  return (
    <div className="space-y-5">
      {/* Hero in the same style as the public home page */}
      <section className="relative overflow-hidden rounded-3xl border border-leaf-100 shadow-sm">
        <Image src="/images/hero-garden-london.webp" alt="" fill priority sizes="100vw" className="object-cover object-[70%_center] -z-10" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/95 via-white/75 to-white/20" />
        <div className="grid md:grid-cols-[1.2fr_1fr] items-center gap-4 p-5 sm:p-8">
          <div className="min-w-0">
            <p className="text-leaf-700 font-semibold">{fmt(d.teacher.hello, { name: name || user.email || "" })}</p>
            <h1 className="mt-1 font-extrabold text-[clamp(1.5rem,5vw,2.6rem)] leading-[1.1] text-ink">{t.title}</h1>
            <p className="mt-3 text-ink/80 max-w-xl">{t.lead}</p>
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <Link href={firstClass ? `/teacher/c/${firstClass}/create` : "#new-class"} className="btn btn-primary !px-6">
                <Sparkles className="w-5 h-5" /> {t.create} <ArrowRight className="w-4 h-4" />
              </Link>
              {firstClass && (
                <Link href={`/teacher/c/${firstClass}/results`} className="btn btn-outline !px-6 bg-white/80">
                  <BarChart3 className="w-5 h-5" /> {t.results}
                </Link>
              )}
            </div>
          </div>
          <div className="relative aspect-[1100/693] w-full max-w-md mx-auto hidden md:block">
            <Image src="/images/hero-book-composition.webp" alt="" fill sizes="40vw" className="object-contain drop-shadow-xl" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3 px-5 sm:px-8 pb-5 sm:pb-8">
          {stats.map(({ Icon, label, value, bar, sub }) => (
            <div key={label} className="glass rounded-2xl p-3 shadow-lg shadow-leaf-900/10">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink/70">
                <Icon className="w-4 h-4 text-leaf-700 shrink-0" /> <span className="truncate">{label}</span>
              </div>
              <div className="mt-1 text-2xl font-extrabold text-ink">{value}</div>
              {bar !== undefined && (
                <div className="mt-1.5 h-1.5 rounded-full bg-leaf-100 overflow-hidden">
                  <div className="h-full bg-leaf-600" style={{ width: `${Math.round(bar * 100)}%` }} />
                </div>
              )}
              {sub && <div className="mt-1 text-[11px] text-muted">{sub}</div>}
            </div>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Interests from the real survey */}
        <section className="card p-5">
          <h2 className="text-xl font-bold">{t.interestsTitle}</h2>
          <p className="text-sm text-muted">{t.interestsLead}</p>
          {!interestRows.length ? (
            <p className="mt-4 text-sm rounded-xl bg-leaf-50 p-4">{t.noSurvey}</p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {interestRows.map(({ k, n }) => (
                <div key={k} className="flex items-center gap-3">
                  <span className="relative w-12 h-10 shrink-0 grid place-items-center text-2xl">
                    {IMG[k] ? <Image src={IMG[k]!} alt="" fill sizes="48px" className="object-contain" /> : EMOJI[k] ?? "⭐"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm font-semibold">
                      <span>{interestLabel(d, k)}</span>
                      <span className="text-muted">{fmt(t.studentsN, { n })}</span>
                    </div>
                    <div className="mt-1 h-2.5 rounded-full bg-leaf-100 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-leaf-500 to-leaf-700" style={{ width: `${Math.round((n / maxInterest) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Latest lessons with real results */}
        <section className="card p-5">
          <h2 className="text-xl font-bold">{t.lessonsTitle}</h2>
          {!recent.length ? (
            <p className="mt-4 text-sm rounded-xl bg-leaf-50 p-4">{t.noLessons}</p>
          ) : (
            <ul className="mt-3 divide-y divide-leaf-100">
              {recent.map((l) => {
                const p = perLesson.get(l.id);
                const avg = p ? pct(p.got, p.max) : null;
                const live = l.status === "published" || l.status === "completed";
                return (
                  <li key={l.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/teacher/c/${l.class_id}/lessons/${l.id}`} className="min-w-0 hover:underline">
                        <div className="font-semibold truncate" lang="en">{l.topic}</div>
                        <div className="text-xs text-muted">{className(l.class_id)} · {d.teacher.status[l.status as keyof typeof d.teacher.status] ?? l.status}</div>
                      </Link>
                      {avg !== null && <span className="chip shrink-0">{fmt(t.avg, { p: avg })}</span>}
                    </div>
                    {live && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-muted">{fmt(t.submitted, { n: p?.submitted ?? 0, total: p?.total ?? 0 })}</span>
                        {avg === null && p?.submitted ? <span className="text-xs text-muted">· {t.noAvg}</span> : null}
                        <span className="flex-1" />
                        <Link href={`/teacher/c/${l.class_id}/grading?lesson=${l.id}`} className="btn btn-outline btn-sm"><CheckSquare className="w-4 h-4" /> {t.grading}</Link>
                        <Link href={`/teacher/c/${l.class_id}/results?lesson=${l.id}`} className="btn btn-primary btn-sm"><BarChart3 className="w-4 h-4" /> {t.results}</Link>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section>
        <h2 className="text-xl font-bold mb-3">{t.classesTitle}</h2>
        <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
          <div>
            {!classes?.length ? (
              <Empty text={d.teacher.noClasses} />
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {classes.map((c) => {
                  const n = (c.students as unknown as { count: number }[])?.[0]?.count ?? 0;
                  return (
                    <Link key={c.id} href={`/teacher/c/${c.id}/students`} className="card p-5 hover:-translate-y-0.5 transition block">
                      <div className="flex items-center gap-3">
                        <span className="w-11 h-11 rounded-full bg-leaf-100 grid place-items-center"><School className="w-5 h-5 text-leaf-700" /></span>
                        <div className="min-w-0">
                          <div className="font-bold text-lg truncate">{c.name}</div>
                          <div className="text-sm text-muted truncate">{c.grade_level}</div>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {fmt(d.teacher.studentsCount, { n })}</span>
                        <span className="font-mono font-bold tracking-wider">{c.join_code}</span>
                        <ArrowRight className="w-4 h-4 text-leaf-700" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          <div id="new-class"><NewClassForm /></div>
        </div>
      </section>
    </div>
  );
}
