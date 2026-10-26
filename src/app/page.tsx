import Image from "next/image";
import Link from "next/link";
import { GraduationCap, UserRound, ArrowRight } from "lucide-react";
import { getDict } from "@/lib/i18n/server";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { InterestCards } from "@/components/home/InterestCards";
import { ProblemCard } from "@/components/home/ProblemCard";
import { AddieCard } from "@/components/home/AddieCard";
import { SampleLesson } from "@/components/home/SampleLesson";
import { isTeacherSignedIn } from "@/lib/session-hint";

export default async function Home() {
  const { d } = await getDict();
  const loggedIn = await isTeacherSignedIn();
  return (
    <>
      <div className="relative overflow-hidden">
        {/* Garden and London view: decorative background only */}
        <Image src="/images/hero-garden-london.webp" alt="" fill priority sizes="100vw" className="object-cover object-[70%_center] -z-10" />
        {/* Light veil on the text side so the picture never fights the text */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/90 via-white/65 to-white/10 lg:via-white/50 lg:to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 -z-10 bg-gradient-to-t from-cream to-transparent" />
        <SiteHeader transparent loggedIn={loggedIn} />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-4 sm:pt-6 pb-6">
          <div className="grid lg:grid-cols-[1.1fr_1fr] items-center gap-4">
            <div className="min-w-0">
              <h1 className="font-extrabold text-[clamp(1.45rem,7.4vw,2.6rem)] leading-[1.08] sm:text-6xl xl:text-[4.3rem] text-ink">
                {d.home.title1}
                <br />
                {d.home.title2}
                <br />
                <span className="text-leaf-700">{d.home.title3}</span>
              </h1>
              <p className="mt-4 text-base sm:text-xl text-ink/85 max-w-xl">{d.home.subtitle}</p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link href={loggedIn ? "/teacher" : "/auth/register"} className="btn btn-primary text-lg !px-7 !py-3.5">
                  <GraduationCap className="w-6 h-6" /> {d.home.forTeacher} <ArrowRight className="w-5 h-5" />
                </Link>
                <Link href="/join" className="btn btn-outline text-lg !px-7 !py-3.5">
                  <UserRound className="w-6 h-6" /> {d.home.forStudent} <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
            <div className="relative aspect-[1100/693] w-full max-w-xl mx-auto lg:max-w-none">
              <Image src="/images/hero-book-composition.webp" alt={d.home.heroAlt} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-contain drop-shadow-xl" />
            </div>
          </div>
          <div className="mt-6">
            <InterestCards />
            <p className="text-xs text-ink/70 mt-2 max-w-3xl">{d.home.interestNote}</p>
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 space-y-5 pb-4">
        <div className="grid lg:grid-cols-2 gap-5">
          <ProblemCard d={d} />
          <AddieCard />
        </div>
        <SampleLesson />
      </main>
      <SiteFooter d={d} />
    </>
  );
}
