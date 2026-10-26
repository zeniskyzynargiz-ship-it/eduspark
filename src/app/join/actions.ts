"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createStudentSession, clearStudentSession } from "@/lib/student-session";
import { isLimited, recordAttempt } from "@/lib/rate-limit";

export type JoinState = { error?: "badCode" | "wrongCode" | "tooMany" | "generic" } | null;

async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

export async function goToClassAction(_: JoinState, fd: FormData): Promise<JoinState> {
  const code = String(fd.get("code") ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length !== 6) return { error: "badCode" };
  const ipKey = `lookup:${await clientIp()}`;
  if (await isLimited(ipKey)) return { error: "tooMany" };
  const { data } = await supabaseAdmin().from("classes").select("id").eq("join_code", code).maybeSingle();
  if (!data) {
    await recordAttempt(ipKey, false);
    return { error: "badCode" };
  }
  redirect(`/join/${code}`);
}

/** Checks the personal code on the server. Limited per device and per student. */
export async function studentLoginAction(_: JoinState, fd: FormData): Promise<JoinState> {
  const classCode = String(fd.get("class_code") ?? "").toUpperCase();
  const studentId = String(fd.get("student_id") ?? "");
  const code = String(fd.get("code") ?? "").replace(/\D/g, "");
  if (!/^[0-9a-f-]{36}$/i.test(studentId)) return { error: "generic" };
  const ip = await clientIp();
  const ipKey = `login:${ip}`;
  const stKey = `student:${studentId}`;
  if ((await isLimited(ipKey)) || (await isLimited(stKey))) return { error: "tooMany" };

  const db = supabaseAdmin();
  const { data: st } = await db
    .from("students")
    .select("id, class_id, personal_code, code_version, active, classes!inner(join_code)")
    .eq("id", studentId)
    .eq("classes.join_code", classCode)
    .maybeSingle();
  const ok = Boolean(st && st.active && code.length === 6 && st.personal_code === code);
  await Promise.all([recordAttempt(ipKey, ok), recordAttempt(stKey, ok)]);
  if (!ok || !st) return { error: "wrongCode" };
  await createStudentSession(st.id, st.class_id, st.code_version);
  redirect("/student");
}

export async function studentLogoutAction() {
  await clearStudentSession();
  redirect("/join");
}
