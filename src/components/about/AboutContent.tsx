import type { Dict } from "@/lib/i18n";

/** "About the site": the overview video and an overall summary under it. Used on the public page and in the teacher cabinet. */
export function AboutContent({ d }: { d: Dict }) {
  const a = d.about;
  return (
    <>
      <h1 className="text-3xl sm:text-4xl font-bold">{a.title}</h1>
      <p className="mt-3 text-lg text-ink/85 max-w-3xl">{a.lead}</p>

      <section className="card p-4 sm:p-5 mt-6">
        <h2 className="text-xl font-bold mb-3">{a.videoTitle}</h2>
        <video
          className="w-full rounded-2xl border border-leaf-100 bg-leaf-50"
          src="/video/eduspark-overview.mp4"
          poster="/video/eduspark-overview.jpg"
          controls
          preload="metadata"
          playsInline
        />
        <p className="text-xs text-muted mt-2">{a.videoNote}</p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-bold">{a.summaryTitle}</h2>
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {a.sections.map((s) => (
            <div key={s.title} className="card p-5">
              <div className="text-3xl" aria-hidden>{s.icon}</div>
              <h3 className="font-bold text-lg mt-2">{s.title}</h3>
              <p className="text-sm mt-1 text-ink/85">{s.text}</p>
            </div>
          ))}
        </div>
        <div className="card p-6 mt-4 bg-leaf-50 border-leaf-200">
          <p className="text-lg font-medium text-leaf-900">{a.conclusion}</p>
          <p className="text-sm text-muted mt-3"><b>{a.stackTitle}:</b> {a.stack}</p>
        </div>
      </section>
    </>
  );
}
