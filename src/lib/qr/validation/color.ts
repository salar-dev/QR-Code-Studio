export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value: string): boolean {
  return HEX.test(value.trim());
}

/** Normalizes `#abc`, `abc`, `#AABBCC` → `#aabbcc`. Returns null when invalid. */
export function normalizeHex(value: string): string | null {
  const match = HEX.exec(value.trim());
  if (!match) return null;
  let hex = match[1].toLowerCase();
  if (hex.length === 3) hex = hex.replace(/./g, (c) => c + c);
  return `#${hex}`;
}

export function hexToRgb(value: string): Rgb | null {
  const hex = normalizeHex(value);
  if (!hex) return null;
  const n = Number.parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2 relative luminance (0 = black, 1 = white). */
export function relativeLuminance(color: string): number {
  const rgb = hexToRgb(color);
  if (!rgb) return 0;
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** WCAG 2 contrast ratio between two colors (1–21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Readable text color (black/white) for a given background. */
export function readableOn(color: string): "#000000" | "#ffffff" {
  return relativeLuminance(color) > 0.4 ? "#000000" : "#ffffff";
}
