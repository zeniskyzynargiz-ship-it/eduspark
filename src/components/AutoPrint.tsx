"use client";
import { useState } from "react";
import { FileDown, Printer, Loader2 } from "lucide-react";
import { useLang } from "@/lib/i18n/client";

/** Waits for fonts and images so the page is not printed or captured blank. */
async function pageReady(root: ParentNode = document) {
  const imgs = Array.from(root.querySelectorAll("img"));
  for (const img of imgs) img.loading = "eager";
  await Promise.all([
    document.fonts?.ready,
    ...imgs.map((img) => (img.complete && img.naturalWidth ? Promise.resolve() : img.decode().catch(() => undefined))),
  ]);
}

/** Opens the print dialog once the page is fully drawn. Never prints automatically: phone browsers block it. */
export async function printWhenReady() {
  await pageReady();
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 150)));
  window.print();
}

/** Finds a row near `end` that is almost all white, so a page break does not cut through a line of text. */
function findCut(ctx: CanvasRenderingContext2D, width: number, start: number, end: number): number {
  const minY = start + Math.floor((end - start) * 0.75);
  for (let y = end; y > minY; y -= 2) {
    const row = ctx.getImageData(0, y, width, 1).data;
    let dark = 0;
    for (let i = 0; i < row.length; i += 16) if (row[i] + row[i + 1] + row[i + 2] < 720) dark++;
    if (dark === 0) return y;
  }
  return end;
}

/** Builds a real A4 PDF file in the browser and downloads it. Works where the print dialog does not (phones, in-app browsers). */
export async function downloadPdf(rootId: string, fileName: string) {
  const root = document.getElementById(rootId) ?? document.querySelector("main") ?? document.body;
  await pageReady(root);
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const margin = 10;
  const pageW = 210 - margin * 2;
  const pageH = 297 - margin * 2;
  const blocks = Array.from(root.querySelectorAll<HTMLElement>(".print-page"));
  const parts = blocks.length ? blocks : [root];
  let first = true;
  for (const part of parts) {
    const canvas = await html2canvas(part, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      windowWidth: 900,
      ignoreElements: (el) => el.classList?.contains("no-print") || el.hasAttribute?.("data-no-pdf"),
    });
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const pxPerMm = canvas.width / pageW;
    const slice = Math.floor(pageH * pxPerMm);
    let y = 0;
    while (y < canvas.height - 4) {
      const end = Math.min(y + slice, canvas.height);
      const cut = end < canvas.height ? findCut(ctx, canvas.width, y, end) : end;
      const h = cut - y;
      const page = document.createElement("canvas");
      page.width = canvas.width;
      page.height = h;
      const pctx = page.getContext("2d")!;
      pctx.fillStyle = "#ffffff";
      pctx.fillRect(0, 0, page.width, h);
      pctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
      if (!first) pdf.addPage();
      first = false;
      pdf.addImage(page.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, pageW, h / pxPerMm);
      y = cut;
    }
  }
  pdf.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
}

/** Two buttons: download a ready PDF file (main) and print (secondary). */
export function PrintButton({ label, rootId = "pdf-root", fileName = "eduspark" }: { label?: string; rootId?: string; fileName?: string }) {
  const { d } = useLang();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  return (
    <div className="no-print flex flex-wrap items-center gap-2" data-no-pdf>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr(false);
          try {
            await downloadPdf(rootId, fileName);
          } catch (e) {
            console.error(e);
            setErr(true);
          } finally {
            setBusy(false);
          }
        }}
        className="btn btn-primary btn-sm"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} {busy ? d.print.pdfBusy : d.print.pdfDownload}
      </button>
      <button type="button" onClick={() => void printWhenReady()} className="btn btn-outline btn-sm" title={label}>
        <Printer className="w-4 h-4" /> {d.print.printOnly}
      </button>
      {err && <span className="text-sm text-red-700">{d.print.pdfError}</span>}
    </div>
  );
}
