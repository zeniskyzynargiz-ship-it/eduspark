import type { Stage, Criterion } from "@/lib/lesson";
import { pick, fmt, type Dict, type Lang } from "@/lib/i18n";

export function LessonPlanTable({ stages, d, lang, duration }: { stages: Stage[]; d: Dict; lang: Lang; duration: number }) {
  const sum = stages.reduce((s, x) => s + x.minutes, 0);
  return (
    <div className="overflow-x-auto">
      <table className="table min-w-[760px]">
        <thead>
          <tr>
            <th>{d.sample.stage}</th>
            <th className="w-16">{d.common.min}</th>
            <th>{d.sample.teacherAct}</th>
            <th>{d.sample.studentAct}</th>
            <th>{d.sample.resources}</th>
            <th>{d.sample.evidence}</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((s, i) => (
            <tr key={i}>
              <td className="font-semibold">{pick(s.title, lang)}</td>
              <td>{s.minutes}</td>
              <td>{pick(s.teacher_activity, lang)}</td>
              <td>{pick(s.student_activity, lang)}</td>
              <td>{s.resources}</td>
              <td>{pick(s.evidence, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={`text-sm mt-2 font-semibold ${sum === duration ? "text-leaf-700" : "text-danger"}`}>{fmt(d.teacher.totalMinutes, { n: sum, total: duration })}</p>
    </div>
  );
}

export function CriteriaTable({ criteria, d, lang }: { criteria: Criterion[]; d: Dict; lang: Lang }) {
  const total = criteria.reduce((s, c) => s + c.descriptors.reduce((a, x) => a + x.points, 0), 0);
  return (
    <div className="overflow-x-auto">
      <table className="table min-w-[520px]">
        <thead>
          <tr><th>{d.home.criterion}</th><th>{d.home.descriptor}</th><th className="w-20">{d.home.score}</th></tr>
        </thead>
        <tbody>
          {criteria.flatMap((c) =>
            c.descriptors.map((ds, j) => (
              <tr key={c.id + j}>
                <td className="font-semibold">{j === 0 ? pick(c.name, lang) : ""}</td>
                <td>{pick(ds.text, lang)}</td>
                <td>{ds.points}</td>
              </tr>
            )),
          )}
          <tr><td colSpan={2} className="font-bold text-right">{d.teacher.total}</td><td className="font-bold">{total}</td></tr>
        </tbody>
      </table>
    </div>
  );
}
