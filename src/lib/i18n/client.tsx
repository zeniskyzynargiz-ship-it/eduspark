"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { dicts, isLang, LANG_COOKIE, type Dict, type Lang } from "./index";

type Ctx = { lang: Lang; d: Dict; setLang: (l: Lang) => void };
const LangContext = createContext<Ctx | null>(null);

export function LangProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial);
  const router = useRouter();

  // If the cookie was lost but the browser remembers a choice, restore it.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_COOKIE);
      if (isLang(saved) && saved !== initial) {
        document.cookie = `${LANG_COOKIE}=${saved}; path=/; max-age=31536000; samesite=lax`;
        setLangState(saved);
        router.refresh();
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLang = useCallback(
    (l: Lang) => {
      document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
      try {
        localStorage.setItem(LANG_COOKIE, l);
      } catch {}
      document.documentElement.lang = l === "kk" ? "kk" : "en";
      setLangState(l);
      // Server components re-render with the new language; client state (answers, drafts) stays.
      router.refresh();
    },
    [router],
  );

  return <LangContext.Provider value={{ lang, d: dicts[lang], setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const c = useContext(LangContext);
  if (!c) throw new Error("useLang outside LangProvider");
  return c;
}
