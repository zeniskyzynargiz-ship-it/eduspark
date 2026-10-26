"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrImage({ value, size = 320 }: { value: string; size?: number }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(value, { width: size * 2, margin: 1, color: { dark: "#000000", light: "#ffffff" } }).then(setSrc);
  }, [value, size]);
  return src ? <img src={src} alt="QR" style={{ width: size, height: size }} /> : <div style={{ width: size, height: size }} />;
}
