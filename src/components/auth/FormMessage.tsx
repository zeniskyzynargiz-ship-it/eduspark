"use client";
import { useLang } from "@/lib/i18n/client";

/** Shows an auth error/ok key in the current language. */
export function FormMessage({ error, ok }: { error?: string; ok?: string }) {
  const { d } = useLang();
  const a = d.auth as Record<string, string>;
  const text = (k?: string) => (k ? a[k] ?? (k === "tooMany" ? d.common.tooMany : d.common.errorGeneric) : "");
  if (error) return <p role="alert" className="rounded-xl bg-red-50 border border-red-200 text-danger px-3 py-2 text-sm">{text(error)}</p>;
  if (ok) return <p role="status" className="rounded-xl bg-leaf-50 border border-leaf-200 text-leaf-800 px-3 py-2 text-sm">{text(ok)}</p>;
  return null;
}
