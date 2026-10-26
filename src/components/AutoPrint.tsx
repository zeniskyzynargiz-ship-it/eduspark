"use client";
import { useEffect } from "react";

export function AutoPrint({ when }: { when: boolean }) {
  useEffect(() => {
    if (when) setTimeout(() => window.print(), 600);
  }, [when]);
  return null;
}

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-primary no-print">
      {label}
    </button>
  );
}
