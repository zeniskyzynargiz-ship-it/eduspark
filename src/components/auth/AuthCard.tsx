import Image from "next/image";
import { SiteHeader } from "@/components/SiteHeader";

export function AuthCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col">
      <Image src="/images/hero-garden-london.webp" alt="" fill sizes="100vw" className="object-cover -z-10 opacity-60" />
      <div className="absolute inset-0 -z-10 bg-white/70" />
      <SiteHeader transparent />
      <main className="flex-1 grid place-items-center px-4 py-8">
        <div className="card w-full max-w-md p-6 sm:p-8 !bg-white">
          <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
          {sub && <p className="text-muted mt-1.5 text-sm">{sub}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
