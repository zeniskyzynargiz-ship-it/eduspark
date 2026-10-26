import type { ReactNode } from "react";
import { Inbox, AlertTriangle } from "lucide-react";

export function PageTitle({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
        {sub && <p className="text-muted mt-1 text-sm max-w-3xl">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <div className="card p-8 text-center">
      <Inbox className="w-10 h-10 mx-auto text-leaf-300" />
      <p className="mt-2 text-muted">{text}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "ok"; children: ReactNode }) {
  const cls = {
    info: "bg-sky-50 border-sky-200 text-sky-900",
    warn: "bg-amber-50 border-amber-200 text-amber-900",
    error: "bg-red-50 border-red-200 text-danger",
    ok: "bg-leaf-50 border-leaf-200 text-leaf-800",
  }[tone];
  return (
    <div className={`rounded-xl border px-4 py-2.5 text-sm flex gap-2 ${cls}`} role={tone === "error" ? "alert" : "status"}>
      {tone === "warn" || tone === "error" ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> : null}
      <div>{children}</div>
    </div>
  );
}

export function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="text-sm">
      <div className="flex justify-between"><span>{label}</span><span className="font-semibold">{value}</span></div>
      <div className="h-2.5 rounded-full bg-leaf-100 mt-1 overflow-hidden" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
        <div className="h-full bg-leaf-600 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
