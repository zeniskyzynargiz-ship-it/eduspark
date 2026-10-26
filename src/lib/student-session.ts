import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

const COOKIE = "es_student";
const key = () => new TextEncoder().encode(env.studentSecret());

export async function createStudentSession(studentId: string, classId: string, codeVersion: number) {
  const token = await new SignJWT({ cid: classId, cv: codeVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(studentId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key());
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearStudentSession() {
  (await cookies()).delete(COOKIE);
}

export type StudentCtx = {
  id: string;
  classId: string;
  firstName: string;
  lastInitial: string;
  className: string;
};

/**
 * Returns the signed-in student or null. The session is invalid once the
 * teacher changes the personal code (code_version) or removes the student.
 */
export async function getStudent(): Promise<StudentCtx | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    const sid = payload.sub;
    if (!sid) return null;
    const { data } = await supabaseAdmin()
      .from("students")
      .select("id, class_id, first_name, last_name, code_version, active, classes(name)")
      .eq("id", sid)
      .maybeSingle();
    if (!data || !data.active || data.code_version !== payload.cv || data.class_id !== payload.cid) return null;
    const cls = data.classes as unknown as { name: string } | null;
    return {
      id: data.id,
      classId: data.class_id,
      firstName: data.first_name,
      lastInitial: data.last_name ? data.last_name.slice(0, 1) + "." : "",
      className: cls?.name ?? "",
    };
  } catch {
    return null;
  }
}
