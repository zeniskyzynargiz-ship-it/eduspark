import "server-only";
import { env } from "./env";
import { getTeacher } from "./supabase/server";

/** For the public header only: is a teacher signed in? Never throws. */
export async function isTeacherSignedIn() {
  if (!env.isConfigured()) return false;
  try {
    const { user } = await getTeacher();
    return Boolean(user);
  } catch {
    return false;
  }
}
