"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, Printer, Check } from "lucide-react";
import { useLang } from "@/lib/i18n/client";

/** QR holds only the public join link. No passwords or personal codes. */
export function JoinPanel({ joinUrl, code, printHref }: { joinUrl: string; code: string; printHref: string }) {
  const { d } = useLang();
  const [src, setSrc] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    QRCode.toDataURL(joinUrl, { width: 640, margin: 2, color: { dark: "#0d3a1c", light: "#ffffff" } }).then(setSrc);
  }, [joinUrl]);
  return (
    <section className="card p-5">
      <h2 className="text-lg font-bold">{d.teacher.joinTitle}</h2>
      <div className="mt-3 flex flex-col sm:flex-row gap-5 items-center sm:items-start">
        {src ? <img src={src} alt="QR" className="w-44 h-44 rounded-xl border border-leaf-100" /> : <div className="w-44 h-44 rounded-xl bg-leaf-50 animate-pulse" />}
        <div className="flex-1 min-w-0 space-y-3 w-full">
          <div>
            <div className="text-xs font-bold uppercase text-muted">{d.teacher.classCode}</div>
            <div className="font-mono text-3xl font-bold tracking-[0.2em] text-leaf-800">{code}</div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase text-muted">{d.teacher.joinLink}</div>
            <div className="flex gap-2 mt-1">
              <input readOnly value={joinUrl} className="input !min-h-10 !py-1.5 text-sm font-mono" onFocus={(e) => e.target.select()} />
              <button
                className="btn btn-outline btn-sm shrink-0"
                onClick={async () => {
                  await navigator.clipboard.writeText(joinUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? d.common.copied : d.common.copy}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {src && <a href={src} download={`eduspark-${code}-qr.png`} className="btn btn-primary btn-sm"><Download className="w-4 h-4" /> {d.teacher.downloadQr}</a>}
            <a href={printHref} target="_blank" className="btn btn-outline btn-sm"><Printer className="w-4 h-4" /> {d.teacher.printQr}</a>
          </div>
          <p className="text-xs text-muted">{d.teacher.qrNote}</p>
        </div>
      </div>
    </section>
  );
}
