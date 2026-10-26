import { ArrowRight } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { getDict } from "@/lib/i18n/server";

const KEYS = ["analyze", "design", "develop", "implement", "evaluate"] as const;

export default async function AddiePage() {
  const { d } = await getDict();
  return (
    <PublicShell>
      <h1 className="text-3xl sm:text-4xl font-bold">{d.addie.pageTitle}</h1>
      <p className="mt-3 text-ink/85">{d.addie.intro}</p>
      <div className="mt-6 grid gap-3">
        {KEYS.map((k, i) => (
          <section key={k} className="card p-5 flex gap-4">
            <span className="w-12 h-12 shrink-0 rounded-full bg-leaf-700 text-white font-display font-bold text-xl grid place-items-center">{"ADDIE"[i]}</span>
            <div>
              <h2 className="text-xl font-bold">
                {k[0].toUpperCase() + k.slice(1)} — {d.addie.stages[k].name}
              </h2>
              <p className="text-sm text-leaf-700 font-semibold">{d.addie.stages[k].short}</p>
              <p className="mt-1">{d.addie.stages[k].full}</p>
            </div>
          </section>
        ))}
      </div>
      <section className="card p-6 mt-6">
        <h2 className="text-xl font-bold">{d.addie.chainTitle}</h2>
        <p className="mt-2">{d.addie.chainText}</p>
        <div className="mt-4 flex flex-col md:flex-row gap-2 items-stretch">
          {d.addie.chainExample.map((c, i) => (
            <div key={i} className="flex md:flex-1 items-center gap-2">
              <div className="flex-1 rounded-2xl bg-leaf-50 p-4 text-sm font-medium">{c}</div>
              {i < 2 && <ArrowRight className="w-5 h-5 text-leaf-700 shrink-0 rotate-90 md:rotate-0" />}
            </div>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
