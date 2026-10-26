"use server";
import { resolveMx } from "dns/promises";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getLang } from "@/lib/i18n/server";
import { strongEnough } from "@/lib/password";

export type AuthState = { error?: string; ok?: string; email?: string } | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : env.siteUrl();
}

/** The domain must be able to receive mail. The confirmation email then proves the address is real. */
async function domainAcceptsMail(email: string) {
  const domain = email.split("@")[1];
  try {
    const mx = await resolveMx(domain);
    return mx.length > 0;
  } catch (e) {
    const code = (e as { code?: string }).code;
    // Only reject when DNS clearly says the domain has no mail servers.
    return !(code === "ENOTFOUND" || code === "ENODATA");
  }
}

/** Friendly early check. The database trigger enforces the code again on sign-up. */
async function inviteValid(code: string) {
  const { data } = await supabaseAdmin().from("invite_codes").select("active, max_uses, uses").eq("code", code).maybeSingle();
  return !!data && data.active && (data.max_uses == null || data.uses < data.max_uses);
}

export async function registerAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const fullName = String(fd.get("full_name") ?? "").trim().replace(/\s+/g, " ");
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const password2 = String(fd.get("password2") ?? "");
  const invite = String(fd.get("invite_code") ?? "").trim().toUpperCase();
  if (fullName.length < 3 || !fullName.includes(" ")) return { error: "nameShort" };
  if (!EMAIL_RE.test(email)) return { error: "emailInvalid" };
  if (!strongEnough(password)) return { error: "weak" };
  if (password !== password2) return { error: "mismatch" };
  if (!(await domainAcceptsMail(email))) return { error: "emailInvalid" };
  if (!invite || !(await inviteValid(invite))) return { error: "badInvite" };

  const sb = await supabaseServer();
  const lang = await getLang();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, lang, invite_code: invite }, emailRedirectTo: `${await origin()}/auth/callback?next=/teacher` },
  });
  if (error) {
    if (/already/i.test(error.message)) return { error: "exists" };
    if (/invite|database error/i.test(error.message)) return { error: "badInvite" };
    if (/rate/i.test(error.message)) return { error: "tooMany" };
    if (/not authorized|sending|smtp|email/i.test(error.message)) return { error: "smtpError" };
    return { error: "generic" };
  }
  // With email confirmation on, an existing address returns a user with no identities.
  if (data.user && (data.user.identities?.length ?? 0) === 0) return { error: "exists" };
  // With email confirmation off, Supabase signs the teacher in right away.
  if (data.session) redirect("/teacher");
  redirect(`/auth/check-email?email=${encodeURIComponent(email)}`);
}

export async function loginAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const next = String(fd.get("next") ?? "/teacher");
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    if (/not confirmed/i.test(error.message)) return { error: "notConfirmed", email };
    if (/rate|too many/i.test(error.message)) return { error: "tooMany" };
    return { error: "invalid" };
  }
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/teacher");
}

export async function forgotAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "emailInvalid" };
  const sb = await supabaseServer();
  await sb.auth.resetPasswordForEmail(email, { redirectTo: `${await origin()}/auth/callback?next=/auth/reset` });
  // Same answer whether or not the address exists.
  return { ok: "linkSent" };
}

export async function resendAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "emailInvalid" };
  const sb = await supabaseServer();
  const { error } = await sb.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${await origin()}/auth/callback?next=/teacher` } });
  if (error && /rate/i.test(error.message)) return { error: "tooMany" };
  return { ok: "resent" };
}

export async function resetAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const password = String(fd.get("password") ?? "");
  const password2 = String(fd.get("password2") ?? "");
  if (!strongEnough(password)) return { error: "weak" };
  if (password !== password2) return { error: "mismatch" };
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) return { error: "linkExpired" };
  const { error } = await sb.auth.updateUser({ password });
  if (error) return { error: /same|different/i.test(error.message) ? "weak" : "generic" };
  return { ok: "resetDone" };
}

export async function logoutAction() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect("/");
}
