"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Square, RotateCcw, Users } from "lucide-react";
import { useLang } from "@/lib/i18n/client";
import { pick } from "@/lib/i18n";

/** Task as the student receives it: no answer key. */
export type PublicTask = {
  id: string;
  type: "choice" | "match" | "gap" | "short" | "voice" | "pair";
  instruction: { kk: string; en: string };
  prompt: string;
  points: number;
  hint?: { kk: string; en: string };
  options?: string[];
  multi?: boolean;
  left?: string[];
  right?: string[];
  text?: string;
  blanks?: number;
  roles?: string[];
};

type Props = {
  task: PublicTask;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
  onVoice?: (blob: Blob, mime: string) => Promise<void>;
  voiceUrl?: string | null;
};

export function TaskInput({ task, value, onChange, disabled, onVoice, voiceUrl }: Props) {
  const { d, lang } = useLang();
  return (
    <div>
      <p className="font-semibold">{pick(task.instruction, lang)}</p>
      {task.prompt && <p className="mt-2 whitespace-pre-line text-[17px] leading-relaxed" lang="en">{task.prompt}</p>}
      <div className="mt-3">
        {task.type === "choice" && <Choice task={task} value={(value as number[]) ?? []} onChange={onChange} disabled={disabled} />}
        {task.type === "match" && <Match task={task} value={(value as (string | null)[]) ?? []} onChange={onChange} disabled={disabled} />}
        {task.type === "gap" && <Gap task={task} value={(value as string[]) ?? []} onChange={onChange} disabled={disabled} />}
        {task.type === "short" && (
          <textarea
            className="input min-h-32 text-[17px]"
            lang="en"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={d.student.typeHere}
            aria-label={d.student.yourAnswer}
            maxLength={3000}
          />
        )}
        {task.type === "voice" && <Voice onVoice={onVoice} disabled={disabled} existingUrl={voiceUrl} hasValue={Boolean(value)} />}
        {task.type === "pair" && (
          <div className="rounded-xl bg-leaf-50 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold"><Users className="w-4 h-4" /> {d.student.pairInfo}</p>
            {task.roles && task.roles.length > 0 && <ul className="list-disc pl-5 mt-2" lang="en">{task.roles.map((r, i) => <li key={i}>{r}</li>)}</ul>}
          </div>
        )}
      </div>
    </div>
  );
}

function Choice({ task, value, onChange, disabled }: { task: PublicTask; value: number[]; onChange: (v: unknown) => void; disabled?: boolean }) {
  const { d } = useLang();
  const toggle = (i: number) => {
    if (task.multi) onChange(value.includes(i) ? value.filter((x) => x !== i) : [...value, i].sort());
    else onChange([i]);
  };
  return (
    <div role={task.multi ? "group" : "radiogroup"} aria-label={d.student.pickAnswer}>
      {task.multi && <p className="text-xs text-muted mb-2">{d.student.multi}</p>}
      <div className="grid gap-2">
        {task.options?.map((o, i) => {
          const on = value.includes(i);
          return (
            <button
              key={i}
              type="button"
              role={task.multi ? "checkbox" : "radio"}
              aria-checked={on}
              disabled={disabled}
              onClick={() => toggle(i)}
              className={`text-left rounded-xl border px-4 py-3 text-[17px] min-h-12 ${on ? "bg-leaf-700 text-white border-leaf-700" : "bg-white border-leaf-200 hover:bg-leaf-50"}`}
              lang="en"
            >
              <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span> {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Match({ task, value, onChange, disabled }: { task: PublicTask; value: (string | null)[]; onChange: (v: unknown) => void; disabled?: boolean }) {
  const { d } = useLang();
  const [sel, setSel] = useState<number | null>(null);
  const left = task.left ?? [];
  const right = task.right ?? [];
  const vals = left.map((_, i) => value[i] ?? null);
  const used = new Set(vals.filter(Boolean));
  const pickRight = (r: string) => {
    if (sel === null) return;
    const next = vals.map((v) => (v === r ? null : v));
    next[sel] = r;
    onChange(next);
    const free = next.findIndex((v, i) => !v && i !== sel);
    setSel(free >= 0 ? free : null);
  };
  return (
    <div>
      <p className="text-xs text-muted mb-2">{d.student.tapLeft}</p>
      <div className="grid grid-cols-2 gap-2" lang="en">
        <div className="space-y-2">
          {left.map((l, i) => (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => setSel(i)}
              aria-pressed={sel === i}
              className={`w-full text-left rounded-xl border px-3 py-2.5 min-h-12 ${sel === i ? "ring-2 ring-leaf-500 border-leaf-500 bg-leaf-50" : "border-leaf-200 bg-white"}`}
            >
              <div className="font-bold">{l}</div>
              {vals[i] && <div className="text-xs text-leaf-700 mt-0.5">→ {vals[i]}</div>}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {right.map((r) => (
            <button
              key={r}
              type="button"
              disabled={disabled || sel === null}
              onClick={() => pickRight(r)}
              className={`w-full text-left rounded-xl border px-3 py-2.5 min-h-12 text-sm ${used.has(r) ? "bg-leaf-100 border-leaf-300 text-leaf-900" : "bg-white border-leaf-200"} ${sel !== null ? "hover:bg-leaf-50" : ""}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      {vals.some(Boolean) && !disabled && (
        <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => onChange(left.map(() => null))}>
          <RotateCcw className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function Gap({ task, value, onChange, disabled }: { task: PublicTask; value: string[]; onChange: (v: unknown) => void; disabled?: boolean }) {
  const parts = (task.text ?? "").split(/_{3,}/);
  return (
    <p className="text-[17px] leading-[2.6]" lang="en">
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && (
            <input
              className="inline-block w-36 max-w-[45vw] mx-1 border-0 border-b-2 border-leaf-500 bg-leaf-50 rounded-t-md px-2 py-1 text-center focus:outline-none focus:bg-white"
              value={value[i] ?? ""}
              disabled={disabled}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-label={`${i + 1}`}
              onChange={(e) => {
                const next = Array.from({ length: parts.length - 1 }, (_, k) => value[k] ?? "");
                next[i] = e.target.value;
                onChange(next);
              }}
            />
          )}
        </span>
      ))}
    </p>
  );
}

function Voice({ onVoice, disabled, existingUrl, hasValue }: { onVoice?: (b: Blob, mime: string) => Promise<void>; disabled?: boolean; existingUrl?: string | null; hasValue: boolean }) {
  const { d } = useLang();
  const [state, setState] = useState<"idle" | "rec" | "saving" | "done" | "denied" | "unsupported">(hasValue ? "done" : "idle");
  const [url, setUrl] = useState<string | null>(existingUrl ?? null);
  const rec = useRef<MediaRecorder | null>(null);
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (typeof window !== "undefined" && (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia)) setState("unsupported");
  }, []);
  useEffect(() => {
    if (state !== "rec") return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = (r.mimeType || "audio/webm").split(";")[0];
        const blob = new Blob(chunks, { type });
        setUrl(URL.createObjectURL(blob));
        setState("saving");
        try {
          await onVoice?.(blob, type);
          setState("done");
        } catch {
          setState("done");
        }
      };
      rec.current = r;
      setSecs(0);
      r.start();
      setState("rec");
      setTimeout(() => r.state === "recording" && r.stop(), 120_000);
    } catch {
      setState("denied");
    }
  }

  if (state === "unsupported") return <p className="text-sm text-warn">{d.student.noRecorder}</p>;
  if (state === "denied") return <p className="text-sm text-warn">{d.student.micDenied}</p>;
  return (
    <div className="space-y-2">
      {state === "rec" ? (
        <button type="button" className="btn btn-danger w-full" onClick={() => rec.current?.stop()}>
          <Square className="w-4 h-4 fill-current" /> {d.student.stop} · {secs}s
        </button>
      ) : (
        <button type="button" className="btn btn-outline w-full" onClick={start} disabled={disabled || state === "saving"}>
          <Mic className="w-5 h-5" /> {state === "done" ? d.student.recordAgain : d.student.record}
        </button>
      )}
      {url && <audio src={url} controls className="w-full" />}
      {state === "done" && <p className="text-xs text-leaf-700">{d.student.recorded}</p>}
    </div>
  );
}
