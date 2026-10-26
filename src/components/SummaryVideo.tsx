"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, Film, Download, FileDown, Music, Sparkles } from "lucide-react";
import { useLang } from "@/lib/i18n/client";
import { pick } from "@/lib/i18n";

export type Slide = { label: string; text: string; image?: string };
type Bi = { kk: string; en: string };
type Script = { title: Bi; slides: { label: Bi; text: Bi }[] };

const W = 1280;
const H = 720;
const INTRO = 4;
const PER_SLIDE = 8; // 5 slides -> 44 s, inside the 30–60 s target

/** Pick a format the browser can really record. Returns null when recording is impossible. */
function detectFormat(): { mime: string; ext: "mp4" | "webm"; label: "MP4" | "WebM" } | null {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return null;
  const canvas = document.createElement("canvas") as HTMLCanvasElement & { captureStream?: unknown };
  if (typeof canvas.captureStream !== "function") return null;
  const list: [string, "mp4" | "webm", "MP4" | "WebM"][] = [
    ["video/mp4;codecs=avc1", "mp4", "MP4"],
    ["video/mp4", "mp4", "MP4"],
    ["video/webm;codecs=vp9", "webm", "WebM"],
    ["video/webm;codecs=vp8", "webm", "WebM"],
    ["video/webm", "webm", "WebM"],
  ];
  for (const [mime, ext, label] of list) if (MediaRecorder.isTypeSupported(mime)) return { mime, ext, label };
  return null;
}

/** Soft gold sparkles drifting in the background. */
function drawSparkles(ctx: CanvasRenderingContext2D, t: number) {
  ctx.save();
  for (let i = 0; i < 14; i++) {
    const x = (i * 97 + t * (12 + (i % 4) * 6)) % W;
    const y = 120 + ((i * 53) % (H - 220)) + Math.sin(t * 1.3 + i) * 10;
    const r = 2.5 + (i % 3) * 1.5;
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 2 + i);
    ctx.fillStyle = i % 2 ? "#e0a92a" : "#9cca97";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
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

/**
 * Animated summary built in the browser from a ready template, pictures and captions (no paid video API).
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
}: {
  title: string;
  subtitle: string;
  slides: Slide[];
  demo?: boolean;
  pdfHref?: string;
  scriptUrl?: string;
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
  const slides: Slide[] = script
    ? script.slides.map((s, i) => ({ label: pick(s.label, lang), text: pick(s.text, lang), image: baseSlides[i]?.image ?? baseSlides[0]?.image }))
    : baseSlides;
  const subtitle = script ? pick(script.title, lang) : baseSubtitle;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const images = useRef<Record<string, HTMLImageElement>>({});
  const raf = useRef<number>(0);
  const startAt = useRef<number>(0);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [video, setVideo] = useState<{ url: string; label: string; ext: string } | null>(null);
  const [format, setFormat] = useState<ReturnType<typeof detectFormat> | undefined>(undefined);
  const [audio, setAudio] = useState<File | null>(null);
  const total = INTRO + slides.length * PER_SLIDE;

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
  }, [script, lang, baseSlides, title]);

  function draw(t: number) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#f2f8f1");
    g.addColorStop(1, "#d8ecd5");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // logo
    ctx.font = "700 40px 'Noto Serif', Georgia, serif";
    ctx.fillStyle = "#0d3a1c";
    ctx.fillText("Edu", 60, 80);
    const eduW = ctx.measureText("Edu").width;
    ctx.fillStyle = "#c98a12";
    ctx.fillText("Spark", 60 + eduW, 80);
    if (demo) {
      ctx.font = "600 22px 'Noto Sans', sans-serif";
      ctx.fillStyle = "#7a4b00";
      const label = d.common.demoSample;
      const lw = ctx.measureText(label).width + 32;
      ctx.fillStyle = "#fff4d6";
      ctx.beginPath();
      ctx.roundRect(W - lw - 50, 44, lw, 44, 22);
      ctx.fill();
      ctx.fillStyle = "#7a4b00";
      ctx.fillText(label, W - lw - 34, 74);
    }
    const idx = t < INTRO ? -1 : Math.min(slides.length - 1, Math.floor((t - INTRO) / PER_SLIDE));
    const local = t < INTRO ? t : (t - INTRO) % PER_SLIDE;
    const fade = t === 0 ? 1 : Math.min(1, local / 0.6);
    const slideIn = (1 - fade) * 40; // text glides in from the left
    drawSparkles(ctx, t);
    ctx.globalAlpha = fade;
    if (idx < 0) {
      ctx.fillStyle = "#13261a";
      ctx.font = "800 64px 'Noto Serif', Georgia, serif";
      wrap(ctx, title, W - 200).forEach((l, i) => ctx.fillText(l, 100 - slideIn, 300 + i * 78));
      ctx.font = "500 32px 'Noto Sans', sans-serif";
      ctx.fillStyle = "#17652f";
      ctx.fillText(subtitle, 100, 300 + wrap(ctx, title, W - 200).length * 78 + 30);
    } else {
      const s = slides[idx];
      const img = s.image ? images.current[s.image] : undefined;
      const textW = img?.complete ? 680 : W - 200;
      ctx.fillStyle = "#17652f";
      ctx.font = "700 30px 'Noto Sans', sans-serif";
      ctx.fillText(`${idx + 1}/${slides.length} · ${s.label}`, 100 - slideIn, 220);
      ctx.fillStyle = "#13261a";
      ctx.font = "700 46px 'Noto Serif', Georgia, serif";
      wrap(ctx, s.text, textW).slice(0, 6).forEach((l, i) => ctx.fillText(l, 100 - slideIn, 300 + i * 62));
      if (img?.complete && img.naturalWidth) {
        const box = 380;
        const r = Math.min(box / img.naturalWidth, box / img.naturalHeight);
        const iw = img.naturalWidth * r;
        const ih = img.naturalHeight * r;
        const bob = Math.sin(local * 1.5) * 8;
        ctx.drawImage(img, W - 120 - iw, 200 + (box - ih) / 2 + bob, iw, ih);
      }
    }
    ctx.globalAlpha = 1;
    // progress
    ctx.fillStyle = "#c6e1c3";
    ctx.fillRect(60, H - 50, W - 120, 8);
    ctx.fillStyle = "#17652f";
    ctx.fillRect(60, H - 50, ((W - 120) * Math.min(t, total)) / total, 8);
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
      setPlaying(false);
    } else {
      setPlaying(true);
      run();
    }
  }

  async function makeVideo() {
    if (!format || !canvasRef.current) return;
    setVideo(null);
    const stream = (canvasRef.current as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream }).captureStream(30);
    let audioEl: HTMLAudioElement | null = null;
    let ac: AudioContext | null = null;
    if (audio) {
      // Mix the student's own recorded audio into the file. Browser speech synthesis is not used: it cannot be recorded reliably.
      ac = new AudioContext();
      audioEl = new Audio(URL.createObjectURL(audio));
      const src = ac.createMediaElementSource(audioEl);
      const dest = ac.createMediaStreamDestination();
      src.connect(dest);
      dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
    }
    const rec = new MediaRecorder(stream, { mimeType: format.mime, videoBitsPerSecond: 2_500_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: format.mime.split(";")[0] });
      setVideo({ url: URL.createObjectURL(blob), label: format.label, ext: format.ext });
      setRecording(false);
      ac?.close();
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
        {format && !recording && (
          <label className="btn btn-ghost btn-sm cursor-pointer">
            <Music className="w-4 h-4" /> {audio ? d.summary.audioAdded : d.summary.addAudio}
            <input type="file" accept="audio/*" className="hidden" onChange={(e) => setAudio(e.target.files?.[0] ?? null)} />
          </label>
        )}
        {video && (
          <a className="btn btn-primary btn-sm" href={video.url} download={`eduspark-summary.${video.ext}`}>
            <Download className="w-4 h-4" /> {d.summary.downloadVideo.replace("{format}", video.label)}
          </a>
        )}
        {pdfHref && (
          <a className="btn btn-ghost btn-sm" href={pdfHref} target="_blank">
            <FileDown className="w-4 h-4" /> {d.summary.pdfFallback}
          </a>
        )}
      </div>
      {format === null && <p className="text-sm text-warn">{d.summary.noVideoSupport}</p>}
      {video && (
        <video src={video.url} controls className="w-full rounded-2xl border border-leaf-100" />
      )}
      <p className="text-xs text-muted">{d.summary.voiceNote} {script ? d.summary.aiNote : d.summary.rulesNote}</p>
    </div>
  );
}
