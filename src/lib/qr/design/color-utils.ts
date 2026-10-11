import { hexToRgb } from "../validation/color";
import type { ColorStop, Fill } from "./types";

const toHex = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0");

export function mixColors(a: string, b: string, t: number): string {
  const ca = hexToRgb(a) ?? { r: 0, g: 0, b: 0 };
  const cb = hexToRgb(b) ?? { r: 0, g: 0, b: 0 };
  return `#${toHex(ca.r + (cb.r - ca.r) * t)}${toHex(ca.g + (cb.g - ca.g) * t)}${toHex(ca.b + (cb.b - ca.b) * t)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${toHex(f(0) * 255)}${toHex(f(8) * 255)}${toHex(f(4) * 255)}`;
}

/** A pleasant companion color for building a gradient from a single color. */
export function companionColor(hex: string): string {
  const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 };
  const [h, s, l] = rgbToHsl(rgb.r, rgb.g, rgb.b);
  if (s < 0.08) return l > 0.5 ? mixColors(hex, "#000000", 0.35) : mixColors(hex, "#ffffff", 0.35);
  return hslToHex((h + 38) % 360, Math.min(1, s * 1.05), l);
}

/** Switches a fill's mode, seeding a visible gradient when needed. */
export function changeFillMode(fill: Fill, mode: Fill["mode"]): Fill {
  if (mode === "solid") return { ...fill, mode, color: fill.mode === "solid" ? fill.color : fill.stops[0]?.color ?? fill.color };
  const flat = fill.stops.every((stop) => stop.color === fill.stops[0]?.color);
  const stops: ColorStop[] =
    fill.mode === "solid" || flat
      ? [
          { offset: 0, color: fill.color },
          { offset: 1, color: companionColor(fill.color) },
        ]
      : fill.stops;
  return { ...fill, mode, stops };
}

export function cssGradient(stops: ColorStop[], angle = 90): string {
  const sorted = [...stops].sort((a, b) => a.offset - b.offset);
  return `linear-gradient(${angle}deg, ${sorted.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(", ")})`;
}

export function cssFill(fill: Fill): string {
  if (fill.mode === "solid") return fill.color;
  const sorted = [...fill.stops].sort((a, b) => a.offset - b.offset);
  const list = sorted.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(", ");
  // qr-code-styling's 0 rad = left → right, i.e. CSS 90deg.
  return fill.mode === "radial" ? `radial-gradient(circle, ${list})` : `linear-gradient(${fill.rotation + 90}deg, ${list})`;
}
