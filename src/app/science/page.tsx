import { ArrowUpRight } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { getDict } from "@/lib/i18n/server";
import { STUDY_URL } from "@/lib/study";

export default async function SciencePage() {
  const { d } = await getDict();
  return (
    <PublicShell>
      <h1 className="text-3xl sm:text-4xl font-bold">{d.science.pageTitle}</h1>
      <section className="card p-6 mt-6">
        <h2 className="text-xl font-bold">{d.home.problemTitle}</h2>
        <p className="mt-2">{d.home.problemText}</p>
        <p className="text-sm text-muted mt-2">{d.home.problemNote}</p>
      </section>
      <section className="card p-6 mt-4">
        <p>{d.science.citation}</p>
        <p className="italic font-medium" lang="en">{d.science.articleTitle}</p>
        <a href={STUDY_URL} className="text-leaf-700 underline break-all" target="_blank" rel="noopener noreferrer">{STUDY_URL}</a>
        <h2 className="text-xl font-bold mt-5">{d.science.whatTitle}</h2>
        <p className="mt-2">{d.home.studyExplain}</p>
        <h2 className="text-xl font-bold mt-5">{d.science.howTitle}</h2>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>{d.science.how1}</li>
          <li>{d.science.how2}</li>
          <li>{d.science.how3}</li>
        </ul>
        <h2 className="text-xl font-bold mt-5">{d.science.limitsTitle}</h2>
        <ul className="mt-2 list-disc pl-5 space-y-1 text-ink/85">
          <li>{d.science.limits1}</li>
          <li>{d.science.limits2}</li>
          <li>{d.science.limits3}</li>
          <li>{d.science.limits4}</li>
        </ul>
        <a href={STUDY_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-6">
          {d.home.readStudy} <ArrowUpRight className="w-4 h-4" />
        </a>
      </section>
    </PublicShell>
  );
}
