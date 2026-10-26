"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Menu, School, Users, ClipboardList, Sparkles, BookOpenCheck, CheckSquare, BarChart3, Workflow, FileDown, Settings, LogOut,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { LangSwitch } from "@/components/LangSwitch";
import { Drawer } from "@/components/Drawer";
import { useLang } from "@/lib/i18n/client";
import { logoutAction } from "@/app/auth/actions";

type Cls = { id: string; name: string };

export function TeacherShell({ name, classes, children }: { name: string; classes: Cls[]; children: React.ReactNode }) {
  const { d } = useLang();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const m = path.match(/^\/teacher\/c\/([0-9a-f-]{36})/i);
  const current = m?.[1] ?? classes[0]?.id;
  const s = d.teacher.sections;
  const cls = (sub: string) => (current ? `/teacher/c/${current}/${sub}` : "/teacher");
  const items = [
    { href: "/teacher", label: s.classes, Icon: School, exact: true },
    { href: cls("students"), label: s.students, Icon: Users },
    { href: cls("analysis"), label: s.analysis, Icon: ClipboardList },
    { href: cls("create"), label: s.create, Icon: Sparkles },
    { href: cls("lessons"), label: s.lessons, Icon: BookOpenCheck },
    { href: cls("grading"), label: s.grading, Icon: CheckSquare },
    { href: cls("results"), label: s.results, Icon: BarChart3 },
    { href: cls("addie"), label: s.addie, Icon: Workflow },
    { href: cls("exports"), label: s.exports, Icon: FileDown },
    { href: "/teacher/settings", label: s.settings, Icon: Settings, exact: true },
  ];
  const active = (href: string, exact?: boolean) => (exact ? path === href : path.startsWith(href) && href !== "/teacher");
  const currentName = classes.find((c) => c.id === current)?.name;

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {classes.length > 1 && (
        <select
          className="input !min-h-10 !py-2 mb-2 text-sm"
          value={current}
          onChange={(e) => {
            const section = path.replace(/^\/teacher\/c\/[0-9a-f-]{36}\/?/i, "").split("/")[0] || "students";
            window.location.href = `/teacher/c/${e.target.value}/${path.startsWith("/teacher/c/") ? section : "students"}`;
          }}
          aria-label={d.teacher.chooseClass}
        >
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      {classes.length === 1 && currentName && <div className="px-3 pb-2 text-xs font-bold uppercase tracking-wide text-muted">{currentName}</div>}
      {items.map(({ href, label, Icon, exact }) => (
        <Link
          key={label}
          href={href}
          onClick={() => setOpen(false)}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium ${active(href, exact) ? "bg-leaf-700 text-white" : "text-ink hover:bg-leaf-50"}`}
        >
          <Icon className="w-5 h-5 shrink-0" strokeWidth={1.8} />
          {label}
        </Link>
      ))}
      <form action={logoutAction} className="mt-3 pt-3 border-t border-leaf-100">
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-muted hover:bg-leaf-50">
          <LogOut className="w-5 h-5" /> {d.nav.logout}
        </button>
      </form>
    </nav>
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-leaf-100 no-print">
        <div className="px-4 sm:px-6 h-16 flex items-center gap-3">
          <button className="lg:hidden p-2 -ml-2 rounded-full hover:bg-leaf-50" onClick={() => setOpen(true)} aria-label={d.nav.menu}>
            <Menu className="w-6 h-6" />
          </button>
          <Logo size="sm" href="/teacher" />
          <span className="hidden md:block text-sm text-muted ml-4 truncate">{d.teacher.hello.replace("{name}", name)}</span>
          <div className="ml-auto"><LangSwitch compact /></div>
        </div>
      </header>
      <div className="flex">
        <aside className="hidden lg:block w-72 shrink-0 border-r border-leaf-100 bg-white/70 min-h-[calc(100vh-4rem)] p-3 sticky top-16 self-start no-print">{nav}</aside>
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 max-w-6xl">{children}</main>
      </div>
      <Drawer open={open} onClose={() => setOpen(false)} title={d.nav.menu}>{nav}</Drawer>
    </div>
  );
}
