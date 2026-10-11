import type { QrLayout } from "../render/matrix";
import { rasterizeSvg } from "../render/rasterize";
import { decodeLuminance, rgbaToLuminance } from "./decode";

export type VerifyResult =
  | { state: "match"; inverted: boolean }
  | { state: "mismatch"; inverted: boolean; decoded: string }
  | { state: "unreadable" };

/**
 * Rasterizes the exact SVG that will be exported, composites it on the
 * intended scanning background and decodes it with ZXing. Browser only.
 */
export async function verifyRenderedQr(svg: string, layout: QrLayout, expected: string, scanBackground: string): Promise<VerifyResult> {
  // Aim for ~5 px per module, which is what a phone camera typically resolves.
  const scale = layout.modulePx > 0 ? (5 * layout.size) / layout.modulePx : layout.size;
  const size = Math.round(Math.min(1400, Math.max(320, scale)));
  const canvas = await rasterizeSvg(svg, size, scanBackground);
  try {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { state: "unreadable" };
    const { data } = ctx.getImageData(0, 0, size, size);
    const outcome = decodeLuminance(rgbaToLuminance(data, size, size), size, size);
    if (!outcome) return { state: "unreadable" };
    if (outcome.text === expected) return { state: "match", inverted: outcome.inverted };
    return { state: "mismatch", inverted: outcome.inverted, decoded: outcome.text };
  } finally {
    canvas.width = canvas.height = 0;
  }
}
