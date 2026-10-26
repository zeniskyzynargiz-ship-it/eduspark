import Link from "next/link";
import { requireTeacher } from "@/lib/teacher";
import { getDict } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n";
import { aiStatus } from "@/lib/ai/provider";
import { PageTitle, Notice } from "@/components/Shared";
import { LangSwitch } from "@/components/LangSwitch";
import { ProfileForm } from "@/components/teacher/ProfileForm";

export default async function SettingsPage() {
  const { sb, user } = await requireTeacher();
  const { d } = await getDict();
  const { data: t } = await sb.from("teachers").select("full_name").eq("id", user.id).maybeSingle();
  const ai = aiStatus();
  return (
    <>
      <PageTitle title={d.teacher.sections.settings} />
      <div className="grid md:grid-cols-2 gap-4 items-start">
        <section className="card p-5 space-y-3">
          <h2 className="font-bold">{d.teacher.settingsProfile}</h2>
          <p className="text-sm text-muted">{user.email}</p>
          <ProfileForm name={t?.full_name ?? ""} />
          <Link href="/auth/reset" className="btn btn-outline btn-sm">{d.teacher.changePassword}</Link>
        </section>
        <section className="card p-5 space-y-3">
          <h2 className="font-bold">{d.teacher.settingsLang}</h2>
          <LangSwitch />
          <h2 className="font-bold pt-3">{d.teacher.aiProvider}</h2>
          {ai.configured ? <Notice tone="ok">{fmt(d.teacher.aiConfigured, { provider: ai.provider, model: ai.model })}</Notice> : <Notice tone="warn">{d.teacher.aiNotSet}</Notice>}
          <p className="text-sm text-muted">{d.teacher.aiHow}</p>
          <p className="text-sm text-muted">{d.teacher.aiCost}</p>
        </section>
      </div>
    </>
  );
}
