import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

const WINDOW_MIN = 15;
const MAX_FAILS = 5;

/** True when the key has too many failed attempts in the window. Stored in the database so it works across serverless instances. */
export async function isLimited(key: string) {
  const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
  const { count } = await supabaseAdmin()
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("key", key)
    .eq("success", false)
    .gte("created_at", since);
  return (count ?? 0) >= MAX_FAILS;
}

export async function recordAttempt(key: string, success: boolean) {
  await supabaseAdmin().from("login_attempts").insert({ key, success });
}
