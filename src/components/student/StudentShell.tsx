import Link from "next/link";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { LangSwitch } from "@/components/LangSwitch";
import { studentLogoutAction } from "@/app/join/actions";
import type { Dict } from "@/lib/i18n";
import type { StudentCtx } from "@/lib/student-session";

export function StudentShell({ st, d, children }: { st: StudentCtx; d: Dict; children: React.ReactNode }) {
  return (
    <div className="min-h-screen task-surface">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-leaf-100 no-print">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center gap-2">
          <Logo size="sm" href="/student" />
          <Link href="/student" className="ml-2 text-sm font-semibold truncate text-ink/80">{st.firstName} {st.lastInitial}</Link>
          <div className="ml-auto flex items-center gap-1">
            <LangSwitch compact />
            <form action={studentLogoutAction}>
              <button className="p-2 rounded-full hover:bg-leaf-50" aria-label={d.student.logout} title={d.student.logout}><LogOut className="w-5 h-5" /></button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>
    </div>
  );
}
