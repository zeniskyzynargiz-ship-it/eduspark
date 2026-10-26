import Link from "next/link";

/** Text logo with a small spark mark. */
export function Logo({ size = "md", href = "/" }: { size?: "sm" | "md" | "lg"; href?: string }) {
  const cls = size === "lg" ? "text-4xl" : size === "sm" ? "text-xl" : "text-2xl sm:text-3xl";
  return (
    <Link href={href} className={`font-display font-bold ${cls} inline-flex items-start leading-none`} aria-label="EduSpark">
      <span className="text-leaf-900">Edu</span>
      <span className="text-[#c98a12]">Spark</span>
      <svg viewBox="0 0 24 24" className="w-[0.55em] h-[0.55em] -mt-[0.15em] ml-[0.02em]" aria-hidden="true">
        <path d="M12 0c.6 5.6 2.6 8.9 12 12-9.4 3.1-11.4 6.4-12 12-.6-5.6-2.6-8.9-12-12C9.4 8.9 11.4 5.6 12 0z" fill="#f2b632" />
      </svg>
    </Link>
  );
}
