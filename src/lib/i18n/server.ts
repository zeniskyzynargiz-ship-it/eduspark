import "server-only";
import { cookies } from "next/headers";
import { dicts, isLang, LANG_COOKIE, type Lang } from "./index";

export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(v) ? v : "kk";
}

export async function getDict() {
  const lang = await getLang();
  return { lang, d: dicts[lang] };
}
