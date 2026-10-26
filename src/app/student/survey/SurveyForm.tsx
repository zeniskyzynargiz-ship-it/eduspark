"use client";
import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitSurveyAction } from "../actions";
import { useLang } from "@/lib/i18n/client";
import { DIFFICULTIES, SUPPORTS } from "@/lib/lesson";
import { interestLabel, type SurveyConfig, type CustomAnswers } from "@/lib/survey";
import { Notice } from "@/components/Shared";

type Init = { interests: string[]; difficulties: string[]; support: string[]; other_interest: string; support_other: string; interest_scale: number | null; confidence_scale: number | null; meaning_scale: number | null; custom_answers?: CustomAnswers | null } | null;

function Checks({ name, keys, labels, initial }: { name: string; keys: readonly string[]; labels: Record<string, string>; initial: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-2">
      {keys.map((k) => (
        <label key={k} className="flex items-center gap-2 rounded-xl border border-leaf-200 bg-white px-3 py-3 cursor-pointer has-[:checked]:bg-leaf-100 has-[:checked]:border-leaf-500">
          <input type="checkbox" name={name} value={k} defaultChecked={initial.includes(k)} className="w-5 h-5 accent-[#17652f]" />
          <span className="font-medium text-sm">{labels[k]}</span>
        </label>
      ))}
    </div>
  );
}

function Scale({ name, label, low, high, initial }: { name: string; label: string; low: string; high: string; initial: number | null }) {
  return (
    <fieldset className="mt-5">
      <legend className="font-semibold">{label}</legend>
      <div className="flex gap-2 mt-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="flex-1">
            <input type="radio" name={name} value={n} defaultChecked={initial === n} className="peer sr-only" />
            <span className="block text-center rounded-xl border border-leaf-200 bg-white py-3 font-bold cursor-pointer peer-checked:bg-leaf-700 peer-checked:text-white peer-focus-visible:ring-2 ring-leaf-500">{n}</span>
          </label>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted mt-1"><span>{low}</span><span>{high}</span></div>
    </fieldset>
  );
}

export function SurveyForm({ initial, cfg, interestKeys }: { initial: Init; cfg: SurveyConfig; interestKeys: string[] }) {
  const { d } = useLang();
  const labels = Object.fromEntries(interestKeys.map((k) => [k, interestLabel(d, k)]));
  const prev = initial?.custom_answers ?? {};
  const [state, action, pending] = useActionState(submitSurveyAction, null);
  if (state?.ok)
    return (
      <div className="card p-6 mt-5 text-center">
        <CheckCircle2 className="w-12 h-12 text-leaf-600 mx-auto" />
        <p className="mt-2">{d.student.surveyThanks}</p>
        <Link href="/student" className="btn btn-primary mt-4">{d.common.back}</Link>
      </div>
    );
  return (
    <form action={action} className="card p-5 mt-5">
      {state?.error && <div className="mb-3"><Notice tone="error">{state.error === "pickOne" ? d.student.pickOne : state.error === "required" ? d.student.answerRequired : d.common.errorGeneric}</Notice></div>}
      <fieldset>
        <legend className="font-semibold">{d.student.q1}</legend>
        <Checks name="interests" keys={interestKeys} labels={labels} initial={initial?.interests ?? []} />
        {interestKeys.includes("other") && (
          <input name="other_interest" defaultValue={initial?.other_interest ?? ""} maxLength={200} className="input mt-2" placeholder={d.student.q1other} aria-label={d.student.q1other} />
        )}
      </fieldset>
      {cfg.blocks.difficulties && (
        <fieldset className="mt-6">
          <legend className="font-semibold">{d.student.q2}</legend>
          <p className="text-xs text-muted">{d.student.q2none}</p>
          <Checks name="difficulties" keys={DIFFICULTIES} labels={d.difficulties} initial={initial?.difficulties ?? []} />
        </fieldset>
      )}
      {cfg.blocks.scales && (
        <>
          <Scale name="interest_scale" label={d.student.q3} low={d.student.scaleLow} high={d.student.scaleHigh} initial={initial?.interest_scale ?? null} />
          <Scale name="confidence_scale" label={d.student.q4} low={d.student.scaleLow} high={d.student.scaleHigh} initial={initial?.confidence_scale ?? null} />
          <Scale name="meaning_scale" label={d.student.q5} low={d.student.scaleLow} high={d.student.scaleHigh} initial={initial?.meaning_scale ?? null} />
        </>
      )}
      {cfg.blocks.support && (
        <fieldset className="mt-6">
          <legend className="font-semibold">{d.student.q6}</legend>
          <Checks name="support" keys={SUPPORTS} labels={d.supports} initial={initial?.support ?? []} />
          <input name="support_other" defaultValue={initial?.support_other ?? ""} maxLength={200} className="input mt-2" placeholder={d.student.q6other} aria-label={d.student.q6other} />
        </fieldset>
      )}
      {cfg.questions.map((q) => {
        const name = `cq_${q.id}`;
        const old = prev[q.id]?.a;
        const req = q.required ? <span className="text-danger"> *</span> : null;
        if (q.type === "scale") return <Scale key={q.id} name={name} label={q.text} low={d.student.scaleLow} high={d.student.scaleHigh} initial={typeof old === "number" ? old : null} />;
        if (q.type === "text")
          return (
            <label key={q.id} className="block mt-6">
              <span className="font-semibold">{q.text}{req}</span>
              <textarea name={name} defaultValue={typeof old === "string" ? old : ""} maxLength={1000} rows={3} className="input mt-2" required={q.required} />
            </label>
          );
        const was = Array.isArray(old) ? old : typeof old === "string" ? [old] : [];
        return (
          <fieldset key={q.id} className="mt-6">
            <legend className="font-semibold">{q.text}{req}</legend>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {q.options.map((o) => (
                <label key={o} className="flex items-center gap-2 rounded-xl border border-leaf-200 bg-white px-3 py-3 cursor-pointer has-[:checked]:bg-leaf-100 has-[:checked]:border-leaf-500">
                  <input type={q.type === "single" ? "radio" : "checkbox"} name={name} value={o} defaultChecked={was.includes(o)} className="w-5 h-5 accent-[#17652f]" />
                  <span className="font-medium text-sm">{o}</span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
      <button className="btn btn-primary w-full mt-6" disabled={pending}>{pending ? d.common.saving : d.student.surveySubmit}</button>
    </form>
  );
}
