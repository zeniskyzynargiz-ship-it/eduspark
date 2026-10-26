"use client";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, Clock, FileDown, ArrowRight, Play } from "lucide-react";
import { useLang } from "@/lib/i18n/client";
import { pick } from "@/lib/i18n";
import { sampleLesson } from "@/lib/sample";

type Tab = "plan" | "tasks" | "assessment" | "summary";

export function SampleLesson() {
  const { d, lang } = useLang();
  const [tab, setTab] = useState<Tab>("assessment");
  const lesson = useMemo(() => sampleLesson(d.sample.demoObjective, d.sample.demoTopic), [d]);
  const v = lesson.variants[0];

  return (
    <section className="card p-5 sm:p-6" id="sample">
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-11 h-11 rounded-full bg-leaf-100 grid place-items-center"><BookOpen className="w-5 h-5 text-leaf-700" /></span>
            <h2 className="text-2xl sm:text-3xl font-bold">{d.home.sampleTitle}</h2>
            <span className="chip"><Clock className="w-4 h-4" /> 45 {d.common.minutes}</span>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="tablist">
            {(Object.keys(d.home.sampleTabs) as Tab[]).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold border ${tab === k ? "bg-leaf-700 text-white border-leaf-700" : "bg-white border-leaf-200 hover:bg-leaf-50"}`}
              >
                {d.home.sampleTabs[k]}
              </button>
            ))}
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-leaf-100">
            {tab === "plan" && (
              <table className="table min-w-[520px]">
                <thead><tr><th>{d.sample.stage}</th><th>{d.sample.studentAct}</th><th className="w-20">{d.common.min}</th></tr></thead>
                <tbody>
                  {lesson.stages.map((s, i) => (
                    <tr key={i}><td className="font-medium">{pick(s.title, lang)}</td><td>{pick(s.student_activity, lang)}</td><td>{s.minutes}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "tasks" && (
              <table className="table min-w-[520px]">
                <thead><tr><th>#</th><th>{d.teacher.mode}</th><th>{d.common.points}</th></tr></thead>
                <tbody>
                  {[...v.tasks, ...lesson.common_tasks].map((t, i) => (
                    <tr key={t.id}><td>{i + 1}</td><td>{d.teacher.taskTypes[t.type]} — {pick(t.instruction, lang)}</td><td>{t.points}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "assessment" && (
              <table className="table min-w-[520px]">
                <thead><tr><th>{d.home.criterion}</th><th>{d.home.descriptor}</th><th className="w-20">{d.home.score}</th></tr></thead>
                <tbody>
                  {lesson.criteria.flatMap((c) =>
                    c.descriptors.map((ds, j) => (
                      <tr key={c.id + j}><td className="font-medium">{j === 0 ? pick(c.name, lang) : ""}</td><td>{pick(ds.text, lang)}</td><td>{ds.points}</td></tr>
                    )),
                  )}
                </tbody>
              </table>
            )}
            {tab === "summary" && (
              <div className="p-4 text-sm space-y-2">
                <p><b>{d.summary.chosen}:</b> {d.interests.sport}</p>
                <p><b>{d.summary.work}:</b> {d.summary.workText.replace("{done}", "6").replace("{total}", "6")}</p>
                <p><b>{d.summary.nextStep}:</b> {d.summary.nextNone}</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Link href="/sample-lesson#video" className="block rounded-2xl border border-leaf-100 p-2 bg-white group">
            <div className="relative aspect-video rounded-xl overflow-hidden">
              <Image src="/images/demo-teacher-cover.webp" alt="" fill sizes="320px" className="object-cover" />
              <span className="absolute inset-0 grid place-items-center">
                <span className="w-14 h-14 rounded-full bg-white/95 grid place-items-center shadow-lg group-hover:scale-105 transition"><Play className="w-6 h-6 text-ink fill-ink ml-1" /></span>
              </span>
            </div>
            <div className="text-center font-medium py-1.5">{d.home.videoTitle}</div>
          </Link>
          <p className="text-[11px] text-muted leading-snug">{d.home.videoNote}</p>
          <div className="grid grid-cols-2 gap-2 mt-auto">
            <Link href="/sample-lesson?print=1" className="btn btn-primary btn-sm"><FileDown className="w-4 h-4" /> {d.home.pdf}</Link>
            <Link href="/sample-lesson" className="btn btn-outline btn-sm">{d.home.fullView} <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
