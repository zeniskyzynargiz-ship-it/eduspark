"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, UserRound } from "lucide-react";
import { Logo } from "./Logo";
import { LangSwitch } from "./LangSwitch";
import { Drawer } from "./Drawer";
import { useLang } from "@/lib/i18n/client";

export function SiteHeader({ transparent = false, loggedIn = false }: { transparent?: boolean; loggedIn?: boolean }) {
  const { d } = useLang();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const links = [
    { href: "/", label: d.nav.home },
    { href: "/science", label: d.nav.science },
    { href: "/addie", label: d.nav.addie },
    { href: "/sample-lesson", label: d.nav.sample },
    { href: "/about", label: d.nav.about },
  ];
  const loginHref = loggedIn ? "/teacher" : "/auth/login";
  const loginLabel = loggedIn ? d.nav.cabinet : d.nav.login;

  return (
    <header className={`relative z-30 ${transparent ? "" : "bg-white/90 border-b border-leaf-100 backdrop-blur"}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 sm:h-20 flex items-center gap-3">
        <button className="lg:hidden p-2 -ml-2 rounded-full hover:bg-white/70" onClick={() => setOpen(true)} aria-label={d.nav.menu}>
          <Menu className="w-6 h-6 text-leaf-900" />
        </button>
        <Logo />
        <nav className="hidden lg:flex items-center gap-8 mx-auto">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`py-2 font-semibold border-b-2 ${path === l.href ? "text-ink border-leaf-700" : "text-ink/80 border-transparent hover:text-leaf-700"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto lg:ml-0 flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <LangSwitch />
          </div>
          <Link href={loginHref} className="btn btn-outline btn-sm !px-3 sm:!px-4" aria-label={loginLabel}>
            <UserRound className="w-4 h-4" />
            <span className="hidden sm:inline">{loginLabel}</span>
          </Link>
        </div>
      </div>
      <Drawer open={open} onClose={() => setOpen(false)} title={d.nav.menu}>
        <nav className="flex flex-col gap-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={`px-3 py-3 rounded-xl font-semibold ${path === l.href ? "bg-leaf-50 text-leaf-800" : "hover:bg-leaf-50"}`}>
              {l.label}
            </Link>
          ))}
          <Link href={loginHref} onClick={() => setOpen(false)} className="px-3 py-3 rounded-xl font-semibold hover:bg-leaf-50">
            {loginLabel}
          </Link>
          <Link href="/join" onClick={() => setOpen(false)} className="px-3 py-3 rounded-xl font-semibold hover:bg-leaf-50">
            {d.home.forStudent}
          </Link>
          <div className="px-3 pt-4">
            <LangSwitch />
          </div>
        </nav>
      </Drawer>
    </header>
  );
}
