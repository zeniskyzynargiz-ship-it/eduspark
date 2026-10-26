"use client";
import { useLang } from "@/lib/i18n/client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const { d } = useLang();
  return (
    <main className="min-h-[60vh] grid place-items-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">{d.common.errorGeneric}</h1>
        <button className="btn btn-primary mt-4" onClick={reset}>{d.common.retry}</button>
      </div>
    </main>
  );
}
