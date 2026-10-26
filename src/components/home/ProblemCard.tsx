import { BookOpen, Sprout, Target, Heart, Users, ArrowUpRight, ArrowRight } from "lucide-react";
import type { Dict } from "@/lib/i18n";
import { STUDY_URL } from "@/lib/study";

export function ProblemCard({ d }: { d: Dict }) {
  const links = [
    { a: d.home.link1a, b: d.home.link1b, Icon: Target, chip: d.home.chipChoice },
    { a: d.home.link2a, b: d.home.link2b, Icon: Heart, chip: d.home.chipConfidence },
    { a: d.home.link3a, b: d.home.link3b, Icon: Users, chip: d.home.chipSupport },
  ];
  return (
    <section className="card p-5 sm:p-6 h-full" id="science">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-full bg-leaf-100 grid place-items-center shrink-0"><BookOpen className="w-5 h-5 text-leaf-700" /></span>
        <h2 className="text-2xl sm:text-3xl font-bold flex flex-wrap items-center gap-x-2">
          {d.home.problemTitle} <ArrowRight className="w-6 h-6" /> {d.home.solutionTitle}
        </h2>
      </div>
      <div className="mt-4 flex gap-4">
        <span className="hidden sm:grid w-20 h-20 rounded-full bg-leaf-50 place-items-center shrink-0"><Sprout className="w-10 h-10 text-leaf-700" /></span>
        <div className="min-w-0">
          <p className="text-[15px] leading-relaxed">{d.home.problemText}</p>
          <p className="text-xs text-muted mt-1.5">{d.home.problemNote}</p>
          <div className="mt-3 pt-3 border-t border-leaf-100 text-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-leaf-700">{d.home.studyLabel}</div>
            <p className="mt-1">Bureau, J. S., Howard, J. L., Chong, J. X. Y., &amp; Guay, F. (2022).</p>
            <p className="italic" lang="en">Pathways to Student Motivation: A Meta-Analysis of Antecedents of Autonomous and Controlled Motivations.</p>
            <a href={STUDY_URL} target="_blank" rel="noopener noreferrer" className="text-leaf-700 underline break-all text-xs">{STUDY_URL}</a>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed">{d.home.studyExplain}</p>
      <div className="mt-3 text-sm font-bold">{d.home.linksTitle}</div>
      <ul className="mt-2 grid sm:grid-cols-3 gap-2">
        {links.map(({ a, b, Icon, chip }) => (
          <li key={a} className="rounded-2xl bg-leaf-50 p-3">
            <div className="flex items-center gap-2 font-bold text-leaf-800"><Icon className="w-5 h-5" /> {chip}</div>
            <div className="text-xs mt-1"><b>{a}</b> → {b}</div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted leading-relaxed">{d.home.disclaimer}</p>
      <a href={STUDY_URL} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm mt-4">
        {d.home.readStudy} <ArrowUpRight className="w-4 h-4" />
      </a>
    </section>
  );
}
