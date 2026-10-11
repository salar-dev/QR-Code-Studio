/**
 * Logo intake (browser only). Every logo is normalized to a PNG data URL:
 * - type is verified from the file content, not its name;
 * - SVG is rasterized through an <img>, a context in which scripts and
 *   external resources never run/load, so untrusted SVG cannot execute code;
 * - metadata (EXIF, color profiles) is dropped and very large images are
 *   downscaled, keeping saved designs small.
 */

export const LOGO_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg";
export const LOGO_MAX_BYTES = 5 * 1024 * 1024;
const LOGO_MAX_EDGE = 1024;

export type LogoErrorCode = "type" | "size" | "decode";

export class LogoError extends Error {
  constructor(public readonly code: LogoErrorCode) {
    super(code);
    this.name = "LogoError";
  }
}

type LogoKind = "png" | "jpeg" | "webp" | "svg";

function sniff(head: Uint8Array): LogoKind | null {
  const is = (sig: number[], offset = 0) => sig.every((b, i) => head[offset + i] === b);
  if (is([0x89, 0x50, 0x4e, 0x47])) return "png";
  if (is([0xff, 0xd8, 0xff])) return "jpeg";
  if (is([0x52, 0x49, 0x46, 0x46]) && is([0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  const text = new TextDecoder().decode(head).replace(/^﻿/, "").trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(text)) return "svg";
  return null;
}

/** Gives SVGs without width/height an intrinsic size so <img> can rasterize them. */
function prepareSvg(source: string): { blob: Blob; width: number; height: number } {
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  const root = doc.documentElement;
  if (doc.querySelector("parsererror") || root.localName !== "svg") throw new LogoError("decode");
  const viewBox = (root.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
  const vbWidth = viewBox.length === 4 ? viewBox[2] : NaN;
  const vbHeight = viewBox.length === 4 ? viewBox[3] : NaN;
  const width = Number.parseFloat(root.getAttribute("width") ?? "") || vbWidth || 512;
  const height = Number.parseFloat(root.getAttribute("height") ?? "") || vbHeight || 512;
  const ratio = width / height || 1;
  // Render vectors at high resolution.
  const outW = ratio >= 1 ? LOGO_MAX_EDGE : Math.round(LOGO_MAX_EDGE * ratio);
  const outH = ratio >= 1 ? Math.round(LOGO_MAX_EDGE / ratio) : LOGO_MAX_EDGE;
  if (!root.hasAttribute("viewBox")) root.setAttribute("viewBox", `0 0 ${width} ${height}`);
  root.setAttribute("width", String(outW));
  root.setAttribute("height", String(outH));
  const serialized = new XMLSerializer().serializeToString(root);
  return { blob: new Blob([serialized], { type: "image/svg+xml" }), width: outW, height: outH };
}

async function loadImage(blob: Blob): Promise<{ image: HTMLImageElement; release: () => void }> {
  const url = URL.createObjectURL(blob);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new LogoError("decode"));
      image.src = url;
    });
    await image.decode().catch(() => undefined);
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error instanceof LogoError ? error : new LogoError("decode");
  }
  return { image, release: () => URL.revokeObjectURL(url) };
}

export async function processLogoFile(file: File): Promise<{ src: string; name: string }> {
  if (file.size > LOGO_MAX_BYTES) throw new LogoError("size");
  const head = new Uint8Array(await file.slice(0, 2048).arrayBuffer());
  const kind = sniff(head);
  if (!kind) throw new LogoError("type");

  let blob: Blob = file;
  let target: { width: number; height: number } | null = null;
  if (kind === "svg") {
    const prepared = prepareSvg(await file.text());
    blob = prepared.blob;
    target = { width: prepared.width, height: prepared.height };
  }

  const { image, release } = await loadImage(blob);
  try {
    const naturalW = target?.width ?? image.naturalWidth;
    const naturalH = target?.height ?? image.naturalHeight;
    if (!naturalW || !naturalH) throw new LogoError("decode");
    const scale = Math.min(1, LOGO_MAX_EDGE / Math.max(naturalW, naturalH));
    const width = Math.max(1, Math.round(naturalW * scale));
    const height = Math.max(1, Math.round(naturalH * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new LogoError("decode");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, width, height);
    const src = canvas.toDataURL("image/png");
    canvas.width = canvas.height = 0;
    if (!src.startsWith("data:image/png;base64,")) throw new LogoError("decode");
    return { src, name: file.name.slice(0, 120) };
  } finally {
    release();
  }
}
