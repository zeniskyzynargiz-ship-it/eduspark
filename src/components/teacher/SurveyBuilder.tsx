"use client";
import { useState, useTransition } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, X } from "lucide-react";
import { useLang } from "@/lib/i18n/client";
import { INTERESTS } from "@/lib/lesson";
import { QUESTION_TYPES, type SurveyConfig, type SurveyQuestion, type QuestionType } from "@/lib/survey";
import { saveSurveyConfigAction } from "@/app/teacher/actions";
import { Notice } from "@/components/Shared";
import { interestLabel } from "@/lib/survey";

const newId = () => `q${Math.random().toString(36).slice(2, 10)}`;

export function SurveyBuilder({ classId, initial }: { classId: string; initial: SurveyConfig }) {
  const { d } = useLang();
  const t = d.teacher.sb;
  const [cfg, setCfg] = useState<SurveyConfig>(initial);
  const [newInterest, setNewInterest] = useState("");
  const [msg, setMsg] = useState<"saved" | "invalid" | "error" | null>(null);
  const [pending, start] = useTransition();

  const update = (patch: Partial<SurveyConfig>) => {
    setMsg(null);
    setCfg((c) => ({ ...c, ...patch }));
  };
  const setQ = (i: number, patch: Partial<SurveyQuestion>) => update({ questions: cfg.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) });
  const moveQ = (i: number, dir: -1 | 1) => {
    const qs = [...cfg.questions];
    const j = i + dir;
    if (j < 0 || j >= qs.length) return;
    [qs[i], qs[j]] = [qs[j], qs[i]];
    update({ questions: qs });
  };
  const addInterest = () => {
    const v = newInterest.replace(/^\++/, "").replace(/\s+/g, " ").trim().slice(0, 40);
    if (!v || cfg.interests.includes(v)) return;
    update({ interests: [...cfg.interests, v] });
    setNewInterest("");
  };
  const toggleHidden = (k: (typeof INTERESTS)[number]) => update({ hidden: cfg.hidden.includes(k) ? cfg.hidden.filter((x) => x !== k) : [...cfg.hidden, k] });

  const save = () => {
    const bad = cfg.questions.some((q) => !q.text.trim() || ((q.type === "single" || q.type === "multi") && q.options.filter((o) => o.trim()).length < 2));
    if (bad) return setMsg("invalid");
    start(async () => {
      const r = await saveSurveyConfigAction(classId, cfg);
      setMsg(r?.ok ? "saved" : r?.error === "invalid" ? "invalid" : "error");
    });
  };

  const visible = INTERESTS.filter((k) => !cfg.hidden.includes(k)).length + cfg.interests.length;

  return (
    <div className="space-y-5 max-w-3xl">
      <section className="card p-5">
        <h2 className="text-lg font-bold">{t.interestsTitle}</h2>
        <p className="text-sm text-muted">{t.interestsHint}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {INTERESTS.map((k) => {
            const on = !cfg.hidden.includes(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => (on && visible <= 1 ? null : toggleHidden(k))}
                aria-pressed={on}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold border transition ${on ? "bg-leaf-700 text-white border-leaf-700" : "bg-white text-muted border-leaf-200 line-through"}`}
              >
                {interestLabel(d, k)}
              </button>
            );
          })}
          {cfg.interests.map((label) => (
            <span key={label} className="rounded-full pl-3 pr-1 py-1 text-sm font-semibold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
              {label}
              <button type="button" onClick={() => update({ interests: cfg.interests.filter((x) => x !== label) })} className="p-1 rounded-full hover:bg-amber-200" aria-label={`${t.remove}: ${label}`}>
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <input
            value={newInterest}
            onChange={(e) => setNewInterest(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addInterest();
              }
            }}
            maxLength={40}
            className="input"
            placeholder={t.interestPh}
            aria-label={t.addInterest}
          />
          <button type="button" onClick={addInterest} className="btn btn-outline shrink-0"><Plus className="w-4 h-4" /> {t.addInterest}</button>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-bold">{t.blocksTitle}</h2>
        <div className="mt-2 space-y-2">
          {(["difficulties", "scales", "support"] as const).map((b) => (
            <label key={b} className="flex items-center gap-3 rounded-xl border border-leaf-100 px-3 py-2.5 cursor-pointer">
              <input type="checkbox" checked={cfg.blocks[b]} onChange={(e) => update({ blocks: { ...cfg.blocks, [b]: e.target.checked } })} className="w-5 h-5 accent-[#17652f]" />
              <span className="text-sm font-medium">{b === "difficulties" ? t.blockDifficulties : b === "scales" ? t.blockScales : t.blockSupport}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-bold">{t.questionsTitle}</h2>
        {!cfg.questions.length && <p className="text-sm text-muted mt-1">{t.noQuestions}</p>}
        <div className="space-y-4 mt-3">
          {cfg.questions.map((q, i) => (
            <div key={q.id} className="rounded-2xl border border-leaf-200 p-4 bg-leaf-50/40">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-leaf-700 text-white grid place-items-center text-sm font-bold shrink-0">{i + 1}</span>
                <select className="input !min-h-10 !py-1.5 text-sm" value={q.type} onChange={(e) => setQ(i, { type: e.target.value as QuestionType, options: q.options.length ? q.options : ["", ""] })} aria-label={t.qType}>
                  {QUESTION_TYPES.map((ty) => <option key={ty} value={ty}>{t.types[ty]}</option>)}
                </select>
                <span className="flex-1" />
                <button type="button" onClick={() => moveQ(i, -1)} className="p-2 rounded-lg hover:bg-leaf-100" aria-label={t.up}><ArrowUp className="w-4 h-4" /></button>
                <button type="button" onClick={() => moveQ(i, 1)} className="p-2 rounded-lg hover:bg-leaf-100" aria-label={t.down}><ArrowDown className="w-4 h-4" /></button>
                <button type="button" onClick={() => update({ questions: cfg.questions.filter((_, j) => j !== i) })} className="p-2 rounded-lg hover:bg-red-50 text-danger" aria-label={t.remove}><Trash2 className="w-4 h-4" /></button>
              </div>
              <input value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} maxLength={300} className="input mt-3" placeholder={t.qTextPh} aria-label={t.qText} />
              {(q.type === "single" || q.type === "multi") && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wide text-muted">{t.options}</div>
                  {q.options.map((o, k) => (
                    <div key={k} className="flex gap-2">
                      <input value={o} onChange={(e) => setQ(i, { options: q.options.map((x, m) => (m === k ? e.target.value : x)) })} maxLength={80} className="input !min-h-10 !py-1.5 text-sm" placeholder={`${t.optionPh} ${k + 1}`} />
                      <button type="button" onClick={() => setQ(i, { options: q.options.filter((_, m) => m !== k) })} className="p-2 rounded-lg hover:bg-red-50 text-danger shrink-0" aria-label={t.remove}><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                  {q.options.length < 10 && (
                    <button type="button" onClick={() => setQ(i, { options: [...q.options, ""] })} className="btn btn-ghost btn-sm"><Plus className="w-4 h-4" /> {t.addOption}</button>
                  )}
                </div>
              )}
              <label className="flex items-center gap-2 mt-3 text-sm">
                <input type="checkbox" checked={q.required} onChange={(e) => setQ(i, { required: e.target.checked })} className="w-4 h-4 accent-[#17652f]" />
                {t.required}
              </label>
            </div>
          ))}
        </div>
        {cfg.questions.length < 15 && (
          <button type="button" onClick={() => update({ questions: [...cfg.questions, { id: newId(), type: "single", text: "", options: ["", ""], required: false }] })} className="btn btn-outline mt-4">
            <Plus className="w-4 h-4" /> {t.addQuestion}
          </button>
        )}
      </section>

      <div className="sticky bottom-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <button type="button" onClick={save} disabled={pending} className="btn btn-primary shadow-lg">{pending ? d.common.saving : t.save}</button>
        {msg === "saved" && <Notice tone="ok">{t.saved}</Notice>}
        {msg === "invalid" && <Notice tone="error">{t.invalid}</Notice>}
        {msg === "error" && <Notice tone="error">{d.common.errorGeneric}</Notice>}
      </div>
    </div>
  );
}
