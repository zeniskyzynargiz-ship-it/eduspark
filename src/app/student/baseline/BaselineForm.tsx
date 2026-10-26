"use client";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitBaselineAction } from "../actions";
import { useLang } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n";
import { TaskInput, type PublicTask } from "@/components/student/TaskInput";
import { Notice } from "@/components/Shared";

const KEY = "es_baseline_draft";

export function BaselineForm({ tasks }: { tasks: PublicTask[] }) {
  const { d } = useLang();
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [state, action, pending] = useActionState(submitBaselineAction, null);
  // Keep a local draft so a reload or language switch never loses answers.
  useEffect(() => {
    try {
      const s = localStorage.getItem(KEY);
      if (s) setAnswers(JSON.parse(s));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(answers));
    } catch {}
  }, [answers]);
  useEffect(() => {
    if (state?.ok) try { localStorage.removeItem(KEY); } catch {}
  }, [state]);

  if (state?.ok)
    return (
      <div className="card p-6 mt-5 text-center">
        <CheckCircle2 className="w-12 h-12 text-leaf-600 mx-auto" />
        <p className="mt-2">{d.student.baselineDone}</p>
        <Link href="/student" className="btn btn-primary mt-4">{d.common.back}</Link>
      </div>
    );
  return (
    <form action={action} className="mt-5 space-y-4">
      {state?.error && <Notice tone="error">{d.common.errorNetwork}</Notice>}
      {tasks.map((t, i) => (
        <section key={t.id} className="card p-5">
          <div className="text-xs font-bold uppercase text-leaf-700 mb-1">{fmt(d.student.task, { n: i + 1 })}</div>
          <TaskInput task={t} value={answers[t.id]} onChange={(v) => setAnswers((a) => ({ ...a, [t.id]: v }))} />
        </section>
      ))}
      <input type="hidden" name="answers" value={JSON.stringify(answers)} />
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? d.common.saving : d.common.submit}</button>
    </form>
  );
}
