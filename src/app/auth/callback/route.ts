import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

/** Handles links from confirmation and password reset emails. */
export async function GET(req: NextRequest) {
  const u = req.nextUrl;
  const code = u.searchParams.get("code");
  const tokenHash = u.searchParams.get("token_hash");
  const type = u.searchParams.get("type") as EmailOtpType | null;
  const nextRaw = u.searchParams.get("next") ?? "/teacher";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/teacher";
  const sb = await supabaseServer();

  let ok = false;
  if (code) ok = !(await sb.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) ok = !(await sb.auth.verifyOtp({ token_hash: tokenHash, type })).error;

  const to = u.clone();
  to.search = "";
  if (ok) {
    to.pathname = next;
  } else if (next === "/auth/reset") {
    to.pathname = "/auth/forgot";
    to.searchParams.set("msg", "linkExpired");
  } else {
    // The address is usually already confirmed even if this browser cannot finish the sign-in
    // (for example the link was opened on another device). Ask the teacher to log in.
    to.pathname = "/auth/login";
    to.searchParams.set("msg", "confirmed");
  }
  return NextResponse.redirect(to);
}
