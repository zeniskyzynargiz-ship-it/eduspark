"use client";
import { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircleQuestion, Send } from "lucide-react";
import { useLang } from "@/lib/i18n/client";

type Turn = { q: string; a: string };

/** "Explain it to me": the student asks the AI tutor about the rule in their own words. */
export function ExplainChat({ assignmentId }: { assignmentId: string }) {
  const { d, lang } = useLang();
  const t = d.student.explain;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  // Earlier questions of this student for this lesson.
  useEffect(() => {
    fetch(`/api/student/explain?assignment=${assignmentId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.turns && setTurns(j.turns))
      .catch(() => {});
  }, [assignmentId]);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), [turns.length, busy]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/student/explain", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assignmentId, question: text, lang }),
    }).catch(() => null);
    const j = res ? await res.json().catch(() => null) : null;
    setBusy(false);
    if (res?.ok && j?.answer) {
      setTurns((x) => [...x, { q: text, a: j.answer }]);
      setQ("");
    } else setErr(j?.error === "limit" ? t.limit : j?.error === "not_configured" ? t.off : d.common.errorGeneric);
  }

  return (
    <section className="card p-4 sm:p-5">
      <h3 className="font-bold flex items-center gap-2"><MessageCircleQuestion className="w-5 h-5 text-leaf-700" /> {t.title}</h3>
      <p className="text-sm text-muted">{t.lead}</p>
      {turns.length > 0 && (
        <div className="mt-3 space-y-3 max-h-[28rem] overflow-y-auto pr-1">
          {turns.map((x, i) => (
            <div key={i} className="space-y-1.5">
              <p className="ml-auto max-w-[85%] w-fit rounded-2xl rounded-br-md bg-leaf-700 text-white px-3 py-2 text-sm">{x.q}</p>
              <p className="max-w-[92%] w-fit rounded-2xl rounded-bl-md bg-leaf-50 border border-leaf-100 px-3 py-2 text-sm whitespace-pre-line">{x.a}</p>
            </div>
          ))}
          {busy && <p className="text-sm text-muted flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {t.thinking}</p>}
          <div ref={end} />
        </div>
      )}
      <div className="flex flex-wrap gap-2 mt-3">
        {t.chips.map((c) => (
          <button key={c} type="button" disabled={busy} onClick={() => ask(c)} className="rounded-full border border-leaf-200 bg-white px-3 py-1.5 text-sm hover:bg-leaf-50">{c}</button>
        ))}
      </div>
      <form
        className="flex gap-2 mt-3"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={400} className="input" placeholder={t.placeholder} aria-label={t.placeholder} disabled={busy} />
        <button className="btn btn-primary shrink-0" disabled={busy || !q.trim()} aria-label={t.send}>
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </form>
      {busy && turns.length === 0 && <p className="text-sm text-muted flex items-center gap-2 mt-2"><Loader2 className="w-4 h-4 animate-spin" /> {t.thinking}</p>}
      {err && <p className="text-sm text-danger mt-2">{err}</p>}
    </section>
  );
}
