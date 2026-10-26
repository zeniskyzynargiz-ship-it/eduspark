import Link from "next/link";
import { Logo } from "./Logo";
import { LangSwitch } from "./LangSwitch";
import type { Dict } from "@/lib/i18n";

export function SiteFooter({ d }: { d: Dict }) {
  return (
    <footer className="mx-auto max-w-7xl px-4 sm:px-6 py-6 flex flex-col md:flex-row items-center gap-4 text-sm">
      <div className="flex items-center gap-3">
        <Logo size="sm" />
        <span className="hidden sm:inline text-leaf-200">|</span>
        <span className="text-muted">{d.common.tagline}</span>
      </div>
      <nav className="md:ml-auto flex flex-wrap justify-center gap-x-5 gap-y-2 text-ink/80">
        <Link href="/" className="hover:text-leaf-700">{d.nav.home}</Link>
        <Link href="/science" className="hover:text-leaf-700">{d.nav.science}</Link>
        <Link href="/addie" className="hover:text-leaf-700">{d.nav.addie}</Link>
        <Link href="/sample-lesson" className="hover:text-leaf-700">{d.nav.sample}</Link>
      </nav>
      <LangSwitch compact />
    </footer>
  );
}
