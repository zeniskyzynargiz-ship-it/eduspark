import { kk } from "./kk";
import { en } from "./en";

export type Lang = "kk" | "en";
export type Dict = typeof kk;
export const LANG_COOKIE = "es_lang";
export const dicts: Record<Lang, Dict> = { kk, en };

export function isLang(v: unknown): v is Lang {
  return v === "kk" || v === "en";
}

/** Replace {name} placeholders. */
export function fmt(s: string, vars: Record<string, string | number>) {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** Pick the text for the current language from a bilingual value. */
export function pick(v: { kk?: string; en?: string } | string | undefined | null, lang: Lang) {
  if (!v) return "";
  if (typeof v === "string") return v;
  return v[lang] || v.kk || v.en || "";
}
