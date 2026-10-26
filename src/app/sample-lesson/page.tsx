import Image from "next/image";
import { PublicShell } from "@/components/PublicShell";
import { getDict } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import { sampleLesson } from "@/lib/sample";
import { TaskPreview } from "@/components/TaskPreview";
import { AutoPrint, PrintButton } from "@/components/AutoPrint";
import { SummaryVideo } from "@/components/SummaryVideo";
import { LessonPlanTable, CriteriaTable } from "@/components/LessonTables";
import { interestLabel } from "@/lib/survey";

const IMG: Record<string, string> = {
  sport: "/images/interest-sport-ball.webp",
  music: "/images/interest-music-headphones.webp",
  travel: "/images/interest-travel-globe.webp",
  technology: "/images/interest-tech-robot.webp",
};

export default async function SampleLessonPage({ searchParams }: { searchParams: Promise<{ print?: string }> }) {
  const { d, lang } = await getDict();
  const sp = await searchParams;
  const lesson = sampleLesson(d.sample.demoObjective, d.sample.demoTopic);
  return (
    <PublicShell>
      <AutoPrint when={sp.print === "1"} />
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h1 className="text-3xl sm:text-4xl font-bold">{d.sample.pageTitle}</h1>
        <PrintButton label={d.print.printBtn} />
      </div>
      <dl className="card p-5 mt-4 grid sm:grid-cols-3 gap-3 text-sm">
        <div><dt className="text-muted">{d.sample.topic}</dt><dd className="font-semibold" lang="en">{d.sample.demoTopic}</dd></div>
        <div className="sm:col-span-2"><dt className="text-muted">{d.sample.objective}</dt><dd className="font-semibold">{d.sample.demoObjective}</dd></div>
        <div><dt className="text-muted">{d.sample.duration}</dt><dd className="font-semibold">45 {d.common.minutes}</dd></div>
      </dl>
      <section className="card p-5 mt-4">
        <h2 className="text-xl font-bold">{d.sample.outcomes}</h2>
        <ul className="list-disc pl-5 mt-2">{lesson.expected_outcomes.map((o, i) => <li key={i}>{pick(o, lang)}</li>)}</ul>
      </section>
      <section className="card p-5 mt-4">
        <h2 className="text-xl font-bold mb-3">{d.teacher.plan}</h2>
        <LessonPlanTable stages={lesson.stages} d={d} lang={lang} duration={45} />
      </section>
      <section className="card p-5 mt-4">
        <h2 className="text-xl font-bold mb-3">{d.teacher.variants}</h2>
        <div className="space-y-6">
          {lesson.variants.map((v) => (
            <div key={v.interest} className="avoid-break">
              <div className="flex items-center gap-3 mb-2">
                {IMG[v.interest] && <Image src={IMG[v.interest]} alt="" width={56} height={48} className="object-contain" />}
                <h3 className="text-lg font-bold">{interestLabel(d, v.interest)} <span className="text-sm font-normal text-muted">— {pick(v.context, lang)}</span></h3>
              </div>
              <div className="grid gap-2">{v.tasks.map((t, i) => <TaskPreview key={t.id} task={t} index={i + 1} d={d} lang={lang} showKey />)}</div>
            </div>
          ))}
          <div>
            <h3 className="text-lg font-bold mb-2">{d.teacher.commonTasks}</h3>
            <div className="grid gap-2">{lesson.common_tasks.map((t, i) => <TaskPreview key={t.id} task={t} index={i + 5} d={d} lang={lang} showKey />)}</div>
          </div>
        </div>
      </section>
      <section className="card p-5 mt-4">
        <h2 className="text-xl font-bold mb-3">{d.teacher.criteria}</h2>
        <CriteriaTable criteria={lesson.criteria} d={d} lang={lang} />
      </section>
      <section className="card p-5 mt-4 no-print" id="video">
        <h2 className="text-xl font-bold mb-3">{d.home.videoTitle}</h2>
        <div className="relative w-full max-w-sm aspect-video rounded-xl overflow-hidden mb-3">
          <Image src="/images/demo-teacher-cover.webp" alt="" fill sizes="384px" className="object-cover" />
        </div>
        <p className="text-xs text-muted mb-3">{d.home.videoNote}</p>
        <SummaryVideo
          demo
          allowPhoto
          title={d.summary.title}
          subtitle={d.sample.demoTopic}
          slides={[
            { icon: "🎯", label: d.summary.chosen, text: d.interests.sport, image: IMG.sport },
            { icon: "✅", label: d.summary.work, text: d.summary.workText.replace("{done}", "6").replace("{total}", "6"), chart: [{ label: d.summary.work, value: 100 }] },
            { icon: "📋", label: d.summary.tasksTitle, text: d.summary.tasksText, table: [
              { label: `1. ${d.teacher.taskTypes.choice}`, mark: "ok", score: "2/2" },
              { label: `2. ${d.teacher.taskTypes.match}`, mark: "ok", score: "2/2" },
              { label: `3. ${d.teacher.taskTypes.gap}`, mark: "part", score: "1/2" },
              { label: `4. ${d.teacher.taskTypes.short}`, mark: "ok", score: "3/3" },
              { label: `5. ${d.teacher.taskTypes.pair}`, mark: "ok", score: "2/2" },
              { label: `6. ${d.teacher.taskTypes.voice}`, mark: "bad", score: "0/2" },
            ] },
            { icon: "⭐", label: d.summary.success, text: d.summary.successText.replace("{name}", pick(lesson.criteria[0].name, lang)), chart: lesson.criteria.map((c, i) => ({ label: pick(c.name, lang), value: [90, 60, 75, 80][i % 4] })) },
            { icon: "💪", label: d.summary.mistakes, text: d.summary.mistakesText.replace("{list}", `3 (${d.teacher.taskTypes.gap}), 6 (${d.teacher.taskTypes.voice})`), image: IMG.sport },
            { icon: "🚀", label: d.summary.nextStep, text: `${d.summary.nextText.replace("{name}", pick(lesson.criteria[1].name, lang))} ${d.summary.motivation.mid}`, image: "/images/hero-book-composition.webp" },
          ]}
        />
      </section>
    </PublicShell>
  );
}
