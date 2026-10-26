"use client";
import Image from "next/image";
import { useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { useLang } from "@/lib/i18n/client";

const CARDS = [
  { key: "sport", img: "/images/interest-sport-ball.webp", sample: "Arman ___ (train) on Tuesdays." },
  { key: "music", img: "/images/interest-music-headphones.webp", sample: "Match: instrument — a thing you play music on." },
  { key: "travel", img: "/images/interest-travel-globe.webp", sample: "How did Dias travel to Turkistan? By train / by plane" },
  { key: "technology", img: "/images/interest-tech-robot.webp", sample: "What can the robot do now?" },
] as const;

/** Preview cards. Selecting one only opens a preview; it never writes to any student profile. */
export function InterestCards() {
  const { d } = useLang();
  const [open, setOpen] = useState<(typeof CARDS)[number] | null>(null);
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {CARDS.map((c) => (
          <button
            key={c.key}
            onClick={() => setOpen(c)}
            className="glass rounded-2xl p-2 sm:p-3 flex items-center gap-2 sm:gap-3 text-left shadow-lg shadow-leaf-900/10 hover:-translate-y-0.5 transition min-h-[84px] sm:min-h-[104px]"
          >
            <span className="relative w-16 h-14 sm:w-28 sm:h-20 shrink-0">
              <Image src={c.img} alt="" fill sizes="112px" className="object-contain" />
            </span>
            <span className="font-bold text-base sm:text-lg text-ink flex-1">{d.interests[c.key]}</span>
            <ChevronRight className="w-7 h-7 p-1 rounded-full border-2 border-leaf-600 text-leaf-700 shrink-0 hidden sm:block" />
          </button>
        ))}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-0 sm:p-4" onClick={() => setOpen(null)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 relative" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <button className="absolute right-3 top-3 p-2 rounded-full hover:bg-leaf-50" onClick={() => setOpen(null)} aria-label={d.common.close}>
              <X className="w-5 h-5" />
            </button>
            <div className="relative w-32 h-24 mx-auto">
              <Image src={open.img} alt="" fill sizes="128px" className="object-contain" />
            </div>
            <h3 className="text-2xl font-bold text-center mt-2">{d.interests[open.key]}</h3>
            <p className="text-center text-muted mt-2">{d.home.interestDesc[open.key]}</p>
            <div className="mt-4 rounded-2xl bg-leaf-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-leaf-700">{d.home.sampleTask}</div>
              <p className="mt-1 font-medium" lang="en">{open.sample}</p>
            </div>
            <p className="text-xs text-muted mt-4">{d.home.interestNote}</p>
          </div>
        </div>
      )}
    </>
  );
}
