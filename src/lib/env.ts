function need(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const env = {
  supabaseUrl: () => need("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: () => need("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  serviceRoleKey: () => need("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
  studentSecret: () => {
    const s = need("STUDENT_SESSION_SECRET", process.env.STUDENT_SESSION_SECRET);
    if (s.length < 32) throw new Error("STUDENT_SESSION_SECRET must be at least 32 characters");
    return s;
  },
  // On Vercel the production address is known automatically, so NEXT_PUBLIC_SITE_URL is optional there.
  siteUrl: () =>
    (
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
      "http://localhost:3000"
    ).replace(/\/$/, ""),
  isConfigured: () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
};
