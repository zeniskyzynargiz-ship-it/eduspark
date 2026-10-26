import { notFound } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { getDict } from "@/lib/i18n/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PickName } from "./PickName";

/** Public page: shows only first names and surname initials, never results. */
export default async function JoinClassPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { d } = await getDict();
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length !== 6) notFound();
  const db = supabaseAdmin();
  const { data: cls } = await db.from("classes").select("id, name").eq("join_code", clean).maybeSingle();
  if (!cls) notFound();
  const { data: students } = await db.from("students").select("id, first_name, last_name").eq("class_id", cls.id).eq("active", true).order("first_name");
  const list = (students ?? []).map((s) => ({ id: s.id, label: `${s.first_name}${s.last_name ? " " + s.last_name.slice(0, 1) + "." : ""}` }));
  return (
    <AuthCard title={cls.name} sub={d.join.privacyNote}>
      <PickName classCode={clean} students={list} />
    </AuthCard>
  );
}
