"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, Film, Download, FileDown, Music, Sparkles, ImagePlus, Share2, X } from "lucide-react";
import { useLang } from "@/lib/i18n/client";
import { pick } from "@/lib/i18n";

export type ChartRow = { label: string; value: number | null };
export type TableRow = { label: string; mark: "ok" | "part" | "bad" | "wait" | "none"; score: string };
export type Slide = { label: string; text: string; image?: string; icon?: string; chart?: ChartRow[]; table?: TableRow[] };
type Bi = { kk: string; en: string };
type Script = { title: Bi; slides: { label: Bi; text: Bi }[] };

const W = 1280;
const H = 720;
const INTRO = 4;
const PER_SLIDE = 8; // 5 slides + intro + outro -> about 48 s
const OUTRO = 4;

/** Pick a format the browser can really record. Returns null when recording is impossible. */
function detectFormat(): { mime: string; ext: "mp4" | "webm"; label: "MP4" | "WebM" } | null {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return null;
  const canvas = document.createElement("canvas") as HTMLCanvasElement & { captureStream?: unknown };
  if (typeof canvas.captureStream !== "function") return null;
  const list: [string, "mp4" | "webm", "MP4" | "WebM"][] = [
    ["video/mp4;codecs=avc1,mp4a.40.2", "mp4", "MP4"],
    ["video/mp4;codecs=avc1", "mp4", "MP4"],
    ["video/mp4", "mp4", "MP4"],
    ["video/webm;codecs=vp9,opus", "webm", "WebM"],
    ["video/webm;codecs=vp8,opus", "webm", "WebM"],
    ["video/webm", "webm", "WebM"],
  ];
  for (const [mime, ext, label] of list) if (MediaRecorder.isTypeSupported(mime)) return { mime, ext, label };
  return null;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

// ---------- Cartoon pieces (all drawn in code, no paid service) ----------

function drawBackground(ctx: CanvasRenderingContext2D, t: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#eef7ff");
  g.addColorStop(0.6, "#f2f8f1");
  g.addColorStop(1, "#dcefd8");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // sun
  ctx.save();
  ctx.translate(1150, 110);
  ctx.rotate(t * 0.2);
  ctx.fillStyle = "rgba(245, 190, 60, 0.35)";
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    ctx.fillRect(48, -4, 22, 8);
  }
  ctx.restore();
  ctx.fillStyle = "rgba(245, 190, 60, 0.55)";
  ctx.beginPath();
  ctx.arc(1150, 110, 40, 0, Math.PI * 2);
  ctx.fill();
  // clouds drifting
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  for (let i = 0; i < 3; i++) {
    const x = ((i * 470 + t * (14 + i * 5)) % (W + 300)) - 150;
    const y = 70 + i * 45;
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.arc(x + 30, y - 12, 32, 0, Math.PI * 2);
    ctx.arc(x + 64, y, 24, 0, Math.PI * 2);
    ctx.fill();
  }
  // hills
  const hill = (base: number, amp: number, speed: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, base + Math.sin(x / 160 + t * speed) * amp);
    ctx.lineTo(W, H);
    ctx.fill();
  };
  hill(H - 95, 14, 0.15, "#c6e1c3");
  hill(H - 70, 10, -0.1, "#9cca97");
  // sparkles
  for (let i = 0; i < 14; i++) {
    const x = (i * 97 + t * (12 + (i % 4) * 6)) % W;
    const y = 150 + ((i * 53) % (H - 300)) + Math.sin(t * 1.3 + i) * 10;
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 2 + i);
    ctx.fillStyle = i % 2 ? "#e0a92a" : "#7fbf79";
    ctx.beginPath();
    ctx.arc(x, y, 2.5 + (i % 3) * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** "Sparky": a small star mascot that bounces, blinks and waves. */
function drawMascot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, wave: boolean) {
  const bounce = Math.abs(Math.sin(t * 3)) * r * 0.18;
  ctx.save();
  ctx.translate(x, y - bounce);
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.beginPath();
  ctx.ellipse(0, r * 1.05 + bounce, r * 0.8, r * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  // body (rounded star)
  ctx.rotate(Math.sin(t * 2) * 0.06);
  ctx.fillStyle = "#f5b82e";
  ctx.strokeStyle = "#c98a12";
  ctx.lineWidth = r * 0.07;
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.55;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // eyes (blink every ~3 s)
  const blink = t % 3 < 0.12 ? 0.15 : 1;
  ctx.fillStyle = "#13261a";
  for (const ex of [-r * 0.2, r * 0.2]) {
    ctx.beginPath();
    ctx.ellipse(ex, -r * 0.08, r * 0.07, r * 0.1 * blink, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // cheeks + smile
  ctx.fillStyle = "rgba(230, 110, 90, 0.45)";
  for (const cx of [-r * 0.33, r * 0.33]) {
    ctx.beginPath();
    ctx.arc(cx, r * 0.1, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#13261a";
  ctx.lineWidth = r * 0.05;
  ctx.beginPath();
  ctx.arc(0, r * 0.05, r * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // waving hand
  if (wave) {
    ctx.save();
    ctx.translate(r * 0.8, -r * 0.1);
    ctx.rotate(-0.6 + Math.sin(t * 8) * 0.5);
    ctx.fillStyle = "#f5b82e";
    ctx.strokeStyle = "#c98a12";
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.3, r * 0.13, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawChart(ctx: CanvasRenderingContext2D, rows: ChartRow[], x: number, y: number, w: number, local: number, noData: string) {
  const shown = rows.slice(0, 5);
  const rowH = Math.min(72, 340 / Math.max(1, shown.length));
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.roundRect(x - 24, y - 30, w + 48, shown.length * rowH + 40, 24);
  ctx.fill();
  shown.forEach((r, i) => {
    const yy = y + i * rowH;
    const grow = ease((local - 0.4 - i * 0.25) / 1.4);
    ctx.font = "600 22px 'Noto Sans', sans-serif";
    ctx.fillStyle = "#13261a";
    const name = wrap(ctx, r.label, w - 90)[0] ?? "";
    ctx.fillText(name, x, yy + 6);
    ctx.fillStyle = "#e3f0e1";
    ctx.beginPath();
    ctx.roundRect(x, yy + 16, w - 90, 20, 10);
    ctx.fill();
    if (r.value !== null) {
      ctx.fillStyle = r.value >= 70 ? "#2f8a4a" : r.value >= 40 ? "#e0a92a" : "#d9734e";
      ctx.beginPath();
      ctx.roundRect(x, yy + 16, Math.max(20, ((w - 90) * r.value * grow) / 100), 20, 10);
      ctx.fill();
    }
    ctx.font = "700 22px 'Noto Sans', sans-serif";
    ctx.fillStyle = r.value === null ? "#6b7c70" : "#13261a";
    ctx.fillText(r.value === null ? noData : `${Math.round(r.value * grow)}%`, x + w - 75, yy + 34);
  });
}

const MARK: Record<TableRow["mark"], string> = { ok: "✅", part: "🟡", bad: "❌", wait: "⏳", none: "➖" };

/** Task-by-task table: rows slide in one after another with a smiley mark. */
function drawTable(ctx: CanvasRenderingContext2D, rows: TableRow[], x: number, y: number, w: number, local: number) {
  const shown = rows.slice(0, 8);
  const rowH = Math.min(56, 400 / Math.max(1, shown.length));
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.roundRect(x - 24, y - 40, w + 48, shown.length * rowH + 50, 24);
  ctx.fill();
  shown.forEach((r, i) => {
    const appear = ease((local - 0.4 - i * 0.35) / 0.5);
    if (appear <= 0) return;
    const yy = y + i * rowH;
    ctx.globalAlpha = appear;
    const dx = (1 - appear) * 40;
    if (i % 2 === 0) {
      ctx.fillStyle = "#f2f8f1";
      ctx.fillRect(x - 10 + dx, yy - rowH * 0.62, w + 20, rowH);
    }
    ctx.font = "30px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";
    ctx.fillText(MARK[r.mark], x + dx, yy);
    ctx.font = "600 24px 'Noto Sans', sans-serif";
    ctx.fillStyle = "#13261a";
    ctx.fillText(wrap(ctx, r.label, w - 150)[0] ?? "", x + 50 + dx, yy - 2);
    ctx.font = "700 24px 'Noto Sans', sans-serif";
    ctx.fillStyle = r.mark === "bad" ? "#c0492b" : r.mark === "part" ? "#9a6a00" : "#17652f";
    ctx.textAlign = "right";
    ctx.fillText(r.score, x + w + dx, yy - 2);
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  });
}

function drawConfetti(ctx: CanvasRenderingContext2D, local: number) {
  const colors = ["#2f8a4a", "#f5b82e", "#d9734e", "#5b9bd5", "#9cca97"];
  for (let i = 0; i < 70; i++) {
    const x = ((i * 137) % W) + Math.sin(local * 2 + i) * 20;
    const y = ((local * (120 + (i % 5) * 40) + i * 31) % (H + 40)) - 20;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(local * 3 + i);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(-6, -3, 12, 6);
    ctx.restore();
  }
}

function drawPhoto(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, cy: number, r: number, t: number) {
  ctx.save();
  const pulse = 1 + Math.sin(t * 2) * 0.02;
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = "#f5b82e";
  ctx.beginPath();
  ctx.arc(0, 0, r + 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  const s = Math.max((2 * r) / img.naturalWidth, (2 * r) / img.naturalHeight);
  ctx.drawImage(img, (-img.naturalWidth * s) / 2, (-img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
  ctx.restore();
}

// ---------- Background music: generated live with Web Audio, so it is free and copyright-free ----------

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const CHORDS = [
  [60, 64, 67], // C
  [67, 71, 74], // G
  [69, 72, 76], // Am
  [65, 69, 72], // F
];

function startMusic(ac: AudioContext, out: AudioNode, seconds: number) {
  const master = ac.createGain();
  master.gain.value = 0.0;
  master.gain.linearRampToValueAtTime(0.35, ac.currentTime + 1);
  master.gain.setValueAtTime(0.35, ac.currentTime + Math.max(1, seconds - 2));
  master.gain.linearRampToValueAtTime(0, ac.currentTime + seconds);
  master.connect(out);
  const t0 = ac.currentTime + 0.05;
  const nodes: OscillatorNode[] = [];
  const tone = (freq: number, start: number, dur: number, type: OscillatorType, vol: number) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    o.connect(g).connect(master);
    o.start(start);
    o.stop(start + dur + 0.05);
    nodes.push(o);
  };
  const bar = 2; // seconds per chord
  for (let b = 0; b * bar < seconds; b++) {
    const chord = CHORDS[b % CHORDS.length];
    const s = t0 + b * bar;
    chord.forEach((n) => tone(NOTE(n - 12), s, bar * 0.95, "triangle", 0.05)); // pad
    tone(NOTE(chord[0] - 24), s, 0.5, "sine", 0.12); // bass
    tone(NOTE(chord[0] - 24), s + 1, 0.5, "sine", 0.1);
    for (let k = 0; k < 8; k++) tone(NOTE(chord[[0, 1, 2, 1][k % 4]] + 12), s + k * 0.25, 0.22, "sine", 0.045); // arpeggio
    for (let k = 0; k < 4; k++) {
      // soft kick
      const o = ac.createOscillator();
      const g = ac.createGain();
      const st = s + k * 0.5;
      o.frequency.setValueAtTime(120, st);
      o.frequency.exponentialRampToValueAtTime(45, st + 0.15);
      g.gain.setValueAtTime(0.12, st);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.18);
      o.connect(g).connect(master);
      o.start(st);
      o.stop(st + 0.2);
      nodes.push(o);
    }
  }
  return () => {
    nodes.forEach((n) => {
      try {
        n.stop();
      } catch {}
    });
    master.disconnect();
  };
}

/**
 * Animated cartoon-style summary built in the browser from a ready template, pictures, a mascot,
 * animated charts and generated music (no paid video API).
 * `scriptUrl` returns AI-written captions based only on real results; until it answers, or if it fails,
 * the rule-based captions in `slides` are shown.
 */
export function SummaryVideo({
  title,
  subtitle: baseSubtitle,
  slides: baseSlides,
  demo = false,
  pdfHref,
  scriptUrl,
  allowPhoto = false,
  fileName = "eduspark-summary",
}: {
  title: string;
  subtitle: string;
  slides: Slide[];
  demo?: boolean;
  pdfHref?: string;
  scriptUrl?: string;
  allowPhoto?: boolean;
  fileName?: string;
}) {
  const { d, lang } = useLang();
  const [script, setScript] = useState<Script | null>(null);
  const [scriptState, setScriptState] = useState<"idle" | "loading" | "done">(scriptUrl ? "loading" : "idle");
  useEffect(() => {
    if (!scriptUrl) return;
    let alive = true;
    fetch(scriptUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => alive && j?.script && setScript(j.script as Script))
      .catch(() => {})
      .finally(() => alive && setScriptState("done"));
    return () => {
      alive = false;
    };
  }, [scriptUrl]);
  const slides: Slide[] = script && script.slides.length === baseSlides.length
    ? script.slides.map((s, i) => ({ ...(baseSlides[i] ?? {}), label: pick(s.label, lang), text: pick(s.text, lang) }))
    : baseSlides;
  const subtitle = script && script.slides.length === baseSlides.length ? pick(script.title, lang) : baseSubtitle;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const images = useRef<Record<string, HTMLImageElement>>({});
  const photoImg = useRef<HTMLImageElement | null>(null);
  const raf = useRef<number>(0);
  const startAt = useRef<number>(0);
  const stopMusic = useRef<(() => void) | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [video, setVideo] = useState<{ url: string; label: string; ext: string; blob: Blob } | null>(null);
  const [format, setFormat] = useState<ReturnType<typeof detectFormat> | undefined>(undefined);
  const [audio, setAudio] = useState<File | null>(null);
  const [music, setMusic] = useState(true);
  const [photo, setPhoto] = useState<string | null>(null);
  const total = INTRO + slides.length * PER_SLIDE + OUTRO;

  useEffect(() => setFormat(detectFormat()), []);

  useEffect(() => {
    for (const s of slides) {
      if (s.image && !images.current[s.image]) {
        const img = new Image();
        img.src = s.image;
        img.onload = () => draw(0);
        images.current[s.image] = img;
      }
    }
    draw(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script, lang, baseSlides, title, photo]);

  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    stopMusic.current?.();
  }, []);

  function onPhoto(f: File | undefined) {
    if (!f) return;
    // The photo stays on this device: it is drawn into the video and never uploaded.
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      photoImg.current = img;
      setPhoto(url);
    };
    img.src = url;
  }

  function draw(t: number) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawBackground(ctx, t);
    // logo
    ctx.font = "700 40px 'Noto Serif', Georgia, serif";
    ctx.fillStyle = "#0d3a1c";
    ctx.fillText("Edu", 60, 80);
    const eduW = ctx.measureText("Edu").width;
    ctx.fillStyle = "#c98a12";
    ctx.fillText("Spark", 60 + eduW, 80);
    if (demo) {
      ctx.font = "600 22px 'Noto Sans', sans-serif";
      const label = d.common.demoSample;
      const lw = ctx.measureText(label).width + 32;
      ctx.fillStyle = "#fff4d6";
      ctx.beginPath();
      ctx.roundRect(W - lw - 50, 160, lw, 44, 22);
      ctx.fill();
      ctx.fillStyle = "#7a4b00";
      ctx.fillText(label, W - lw - 34, 190);
    }
    const photoReady = !!(photo && photoImg.current?.complete);
    const slidesEnd = INTRO + slides.length * PER_SLIDE;
    if (t < INTRO) {
      const fade = t === 0 ? 1 : ease(t / 0.8);
      const slideIn = (1 - fade) * 60;
      ctx.globalAlpha = fade;
      ctx.fillStyle = "#13261a";
      ctx.font = "800 60px 'Noto Serif', Georgia, serif";
      const maxW = photoReady ? 720 : W - 360;
      const lines = wrap(ctx, title, maxW).slice(0, 3);
      lines.forEach((l, i) => ctx.fillText(l, 100 - slideIn, 270 + i * 74));
      ctx.font = "500 30px 'Noto Sans', sans-serif";
      ctx.fillStyle = "#17652f";
      wrap(ctx, subtitle, maxW).slice(0, 2).forEach((l, i) => ctx.fillText(l, 100 - slideIn, 270 + lines.length * 74 + 20 + i * 40));
      ctx.globalAlpha = 1;
      if (photoReady) drawPhoto(ctx, photoImg.current!, 1000, 360, 130 * ease(t / 0.8), t);
      drawMascot(ctx, photoReady ? 820 : 1040, photoReady ? 560 : 420, photoReady ? 55 : 110, t, true);
    } else if (t < slidesEnd) {
      const idx = Math.min(slides.length - 1, Math.floor((t - INTRO) / PER_SLIDE));
      const local = (t - INTRO) % PER_SLIDE;
      const fade = ease(local / 0.6);
      const slideIn = (1 - fade) * 50;
      const s = slides[idx];
      const img = s.image ? images.current[s.image] : undefined;
      const hasSide = !!s.table?.length || !!s.chart?.length || !!(img?.complete && img.naturalWidth);
      const textW = hasSide ? 620 : W - 340;
      ctx.globalAlpha = fade;
      // label pill with icon
      ctx.font = "700 28px 'Noto Sans', sans-serif";
      const head = `${s.icon ? s.icon + "  " : ""}${idx + 1}/${slides.length} · ${s.label}`;
      const hw = ctx.measureText(head).width + 40;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.roundRect(80 - slideIn, 182, hw, 52, 26);
      ctx.fill();
      ctx.fillStyle = "#17652f";
      ctx.fillText(head, 100 - slideIn, 218);
      ctx.fillStyle = "#13261a";
      // Long captions get a smaller font so they never run into the mascot.
      ctx.font = "700 44px 'Noto Serif', Georgia, serif";
      const fullLines = wrap(ctx, s.text, textW).length;
      const size = fullLines > 4 ? (fullLines > 5 ? 32 : 38) : 44;
      const lh = Math.round(size * 1.36);
      ctx.font = `700 ${size}px 'Noto Serif', Georgia, serif`;
      // typewriter: the caption appears word by word
      const words = s.text.split(/\s+/);
      const shown = words.slice(0, Math.max(1, Math.ceil(words.length * ease((local - 0.3) / 2.2)))).join(" ");
      wrap(ctx, shown, textW).slice(0, 6).forEach((l, i) => ctx.fillText(l, 100 - slideIn, 300 + i * lh));
      ctx.globalAlpha = 1;
      if (s.table?.length) drawTable(ctx, s.table, 790, 270, 410, local);
      else if (s.chart?.length) drawChart(ctx, s.chart, 800, 290, 400, local, "—");
      else if (img?.complete && img.naturalWidth) {
        const box = 360;
        const pop = ease(local / 0.7);
        const r = (Math.min(box / img.naturalWidth, box / img.naturalHeight) * (0.6 + 0.4 * pop));
        const iw = img.naturalWidth * r;
        const ih = img.naturalHeight * r;
        const bob = Math.sin(local * 1.5) * 8;
        ctx.drawImage(img, W - 140 - box / 2 - iw / 2, 200 + (box - ih) / 2 + bob, iw, ih);
      }
      if (photoReady && idx === slides.length - 1) drawPhoto(ctx, photoImg.current!, 160, 560, 52, t);
      drawMascot(ctx, photoReady && idx === slides.length - 1 ? 300 : 140, 575, 46, t, local < 1.5);
    } else {
      const local = t - slidesEnd;
      drawConfetti(ctx, local);
      const pop = ease(local / 0.6);
      ctx.save();
      ctx.translate(W / 2, 300);
      ctx.scale(pop, pop);
      ctx.textAlign = "center";
      ctx.fillStyle = "#0d3a1c";
      ctx.font = "800 76px 'Noto Serif', Georgia, serif";
      ctx.fillText(d.summary.outro, 0, 0);
      ctx.font = "500 30px 'Noto Sans', sans-serif";
      ctx.fillStyle = "#17652f";
      ctx.fillText(d.summary.outroSub, 0, 60);
      ctx.restore();
      if (photoReady) drawPhoto(ctx, photoImg.current!, W / 2 - 200, 520, 60, t);
      drawMascot(ctx, photoReady ? W / 2 + 40 : W / 2, 520, 70, t, true);
    }
    // progress
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(60, H - 34, W - 120, 8);
    ctx.fillStyle = "#17652f";
    ctx.fillRect(60, H - 34, ((W - 120) * Math.min(t, total)) / total, 8);
  }

  function ensureAudio() {
    if (!audioCtx.current || audioCtx.current.state === "closed") audioCtx.current = new AudioContext();
    audioCtx.current.resume().catch(() => {});
    return audioCtx.current;
  }

  function run(onEnd?: () => void) {
    cancelAnimationFrame(raf.current);
    startAt.current = performance.now();
    const tick = () => {
      const t = (performance.now() - startAt.current) / 1000;
      draw(t);
      setElapsed(Math.min(total, Math.floor(t)));
      if (t >= total) {
        setPlaying(false);
        stopMusic.current?.();
        stopMusic.current = null;
        onEnd?.();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }

  function togglePlay() {
    if (playing) {
      cancelAnimationFrame(raf.current);
      stopMusic.current?.();
      stopMusic.current = null;
      setPlaying(false);
    } else {
      setPlaying(true);
      if (music) stopMusic.current = startMusic(ensureAudio(), ensureAudio().destination, total);
      run();
    }
  }

  async function makeVideo() {
    if (!format || !canvasRef.current) return;
    setVideo(null);
    const stream = (canvasRef.current as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream }).captureStream(30);
    let audioEl: HTMLAudioElement | null = null;
    if (music || audio) {
      const ac = ensureAudio();
      const dest = ac.createMediaStreamDestination();
      const mix = ac.createGain();
      mix.connect(dest);
      mix.connect(ac.destination); // also hear it while recording
      if (music) stopMusic.current = startMusic(ac, mix, total);
      if (audio) {
        // The student's own recorded audio (optional). Browser speech synthesis cannot be recorded reliably.
        audioEl = new Audio(URL.createObjectURL(audio));
        ac.createMediaElementSource(audioEl).connect(mix);
      }
      dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
    }
    const rec = new MediaRecorder(stream, { mimeType: format.mime, videoBitsPerSecond: 3_000_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: format.mime.split(";")[0] });
      setVideo({ url: URL.createObjectURL(blob), label: format.label, ext: format.ext, blob });
      setRecording(false);
    };
    setRecording(true);
    setPlaying(true);
    rec.start(1000);
    audioEl?.play().catch(() => {});
    run(() => {
      audioEl?.pause();
      rec.stop();
    });
  }

  async function share() {
    if (!video) return;
    const file = new File([video.blob], `${fileName}.${video.ext}`, { type: video.blob.type });
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) await nav.share({ files: [file], title }).catch(() => {});
  }
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl overflow-hidden border border-leaf-100 bg-leaf-50">
        <canvas ref={canvasRef} width={W} height={H} className="w-full h-auto block" aria-label={title} />
      </div>
      {scriptState === "loading" && <p className="text-xs text-muted flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> {d.summary.aiLoading}</p>}
      {script && <p className="text-xs text-leaf-700 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> {d.summary.aiScript}</p>}
      {/* Captions as text so the summary is readable without playing anything */}
      <details className="text-sm rounded-xl bg-white border border-leaf-100 p-3">
        <summary className="font-semibold cursor-pointer">{d.summary.captions}</summary>
        <ol className="mt-2 space-y-1 list-decimal pl-5">
          {slides.map((s, i) => (
            <li key={i}><b>{s.label}:</b> {s.text}</li>
          ))}
        </ol>
      </details>
      <div className="flex flex-wrap gap-2 items-center">
        <button className="btn btn-outline btn-sm" onClick={togglePlay} disabled={recording}>
          {playing && !recording ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />} {playing && !recording ? d.summary.pause : d.summary.play}
        </button>
        {format && (
          <button className="btn btn-primary btn-sm" onClick={makeVideo} disabled={recording || playing}>
            <Film className="w-4 h-4" /> {recording ? d.summary.making.replace("{s}", String(elapsed)) : d.summary.makeVideo}
          </button>
        )}
        <label className="btn btn-ghost btn-sm cursor-pointer">
          <input type="checkbox" className="accent-leaf-600" checked={music} disabled={playing} onChange={(e) => setMusic(e.target.checked)} />
          <Music className="w-4 h-4" /> {d.summary.music}
        </label>
        {allowPhoto && !playing && (
          photo ? (
            <button className="btn btn-ghost btn-sm" onClick={() => { setPhoto(null); photoImg.current = null; }}>
              <X className="w-4 h-4" /> {d.summary.removePhoto}
            </button>
          ) : (
            <label className="btn btn-ghost btn-sm cursor-pointer">
              <ImagePlus className="w-4 h-4" /> {d.summary.addPhoto}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
            </label>
          )
        )}
        {format && !playing && (
          <label className="btn btn-ghost btn-sm cursor-pointer">
            <Music className="w-4 h-4" /> {audio ? d.summary.audioAdded : d.summary.addAudio}
            <input type="file" accept="audio/*" className="hidden" onChange={(e) => setAudio(e.target.files?.[0] ?? null)} />
          </label>
        )}
        {pdfHref && (
          <a className="btn btn-ghost btn-sm" href={pdfHref} target="_blank">
            <FileDown className="w-4 h-4" /> {d.summary.pdfFallback}
          </a>
        )}
      </div>
      {allowPhoto && <p className="text-xs text-muted">{d.summary.photoNote}</p>}
      {format === null && <p className="text-sm text-warn">{d.summary.noVideoSupport}</p>}
      {video && (
        <div className="space-y-2">
          <video src={video.url} controls className="w-full rounded-2xl border border-leaf-100" />
          <div className="flex flex-wrap gap-2">
            <a className="btn btn-primary btn-sm" href={video.url} download={`${fileName}.${video.ext}`}>
              <Download className="w-4 h-4" /> {d.summary.downloadVideo.replace("{format}", video.label)}
            </a>
            {canShare && (
              <button className="btn btn-outline btn-sm" onClick={share}>
                <Share2 className="w-4 h-4" /> {d.summary.share}
              </button>
            )}
          </div>
        </div>
      )}
      <p className="text-xs text-muted">{d.summary.voiceNote} {script ? d.summary.aiNote : d.summary.rulesNote}</p>
    </div>
  );
}
