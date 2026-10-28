import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { getDict } from "@/lib/i18n/server";
import { isTeacherSignedIn } from "@/lib/session-hint";

export async function PublicShell({ children }: { children: React.ReactNode }) {
  const { d } = await getDict();
  const loggedIn = await isTeacherSignedIn();
  return (
    <>
      <div className="no-print"><SiteHeader loggedIn={loggedIn} /></div>
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">{children}</main>
      <div className="no-print"><SiteFooter d={d} /></div>
    </>
  );
}
