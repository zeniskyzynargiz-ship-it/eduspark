import { PrintButton } from "./AutoPrint";
import type { Dict } from "@/lib/i18n";

/** A4 print layout. The toolbar is hidden when printing. */
export function PrintShell({ d, title, children }: { d: Dict; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-100 min-h-screen print:bg-white">
      <div className="no-print sticky top-0 z-10 bg-white border-b border-leaf-100 px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="font-bold">{title}</span>
        <span className="text-sm text-muted hidden sm:inline">{d.print.printHelp}</span>
        <div className="ml-auto"><PrintButton label={d.print.printBtn} /></div>
      </div>
      <div className="mx-auto w-full max-w-[210mm] bg-white my-4 print:my-0 p-[12mm] print:p-0 shadow print:shadow-none text-[11pt] leading-snug text-black">{children}</div>
    </div>
  );
}

export function PrintHeader({ title, sub, d, nameLine = false }: { title: string; sub?: string; d: Dict; nameLine?: boolean }) {
  return (
    <header className="mb-4 border-b-2 border-leaf-700 pb-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-display font-bold text-leaf-800 text-sm">EduSpark</div>
          <h1 className="text-xl font-bold">{title}</h1>
          {sub && <p className="text-sm">{sub}</p>}
        </div>
      </div>
      {nameLine && (
        <div className="grid grid-cols-[1fr_auto] gap-6 mt-3 text-sm">
          <div>{d.print.name}: ______________________________</div>
          <div>{d.print.date}: ____________</div>
        </div>
      )}
    </header>
  );
}
