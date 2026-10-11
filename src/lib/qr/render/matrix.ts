import qrcode from "qrcode-generator";
import type { ErrorCorrectionLevel, QrShape } from "../design/types";

/**
 * qr-code-styling bundles a qrcode-generator build whose byte mode keeps only
 * the low 8 bits of each UTF-16 code unit (Latin-1). Passing Arabic, CJK or
 * emoji text directly would corrupt the payload. We therefore convert the
 * payload into a "byte string" where every character is one UTF-8 byte, which
 * the encoder then writes verbatim. Scanners detect the UTF-8 bytes.
 */
export function toQrByteString(text: string): string {
  // Pure 7-bit ASCII is identical in both representations.
  if (/^[\x00-\x7f]*$/.test(text)) return text;
  const bytes = new TextEncoder().encode(text);
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return out;
}

export type QrMode = "Numeric" | "Alphanumeric" | "Byte";

/** Same mode selection qr-code-styling uses, so module counts match. */
export function detectMode(data: string): QrMode {
  if (/^[0-9]*$/.test(data)) return "Numeric";
  if (/^[0-9A-Z $%*+\-./:]*$/.test(data)) return "Alphanumeric";
  return "Byte";
}

export interface QrMatrix {
  /** Modules per side, excluding the quiet zone. */
  count: number;
  /** QR version 1–40. */
  version: number;
  isDark(row: number, col: number): boolean;
}

export class QrCapacityError extends Error {
  constructor() {
    super("The content is too long to fit in a QR code at this error correction level.");
    this.name = "QrCapacityError";
  }
}

/** Encodes a (byte string) payload and returns its module matrix. */
export function createMatrix(byteString: string, level: ErrorCorrectionLevel): QrMatrix {
  const qr = qrcode(0, level);
  try {
    qr.addData(byteString, detectMode(byteString));
    qr.make();
  } catch (error) {
    if (String(error).includes("overflow")) throw new QrCapacityError();
    throw error;
  }
  const count = qr.getModuleCount();
  return { count, version: (count - 17) / 4, isDark: (r, c) => qr.isDark(r, c) };
}

export interface QrLayout {
  size: number;
  /** Module count of the symbol. */
  count: number;
  /** Pixel margin handed to the renderer. */
  marginPx: number;
  /** Pixel size of one module (integer, as the renderer rounds it down). */
  modulePx: number;
  /** Width of the drawn symbol in px. */
  symbolPx: number;
  /** Actual quiet zone around the symbol, in modules. */
  quietZone: number;
}

/**
 * Mirrors qr-code-styling's geometry (with `roundSize: true`) so the UI can
 * report exact quiet zones and pixel densities for any export size.
 */
export function computeLayout(count: number, size: number, quietModules: number, shape: QrShape): QrLayout {
  const quiet = Math.max(0, quietModules);
  // Choose the pixel margin so the requested quiet zone equals `quiet` modules.
  const marginPx = Math.floor((quiet * size) / (count + 2 * quiet));
  const available = size - marginPx * 2;
  const realSize = shape === "circle" ? available / Math.SQRT2 : available;
  const modulePx = Math.max(0, Math.floor(realSize / count));
  const symbolPx = modulePx * count;
  let quietZone = modulePx > 0 ? (size - symbolPx) / 2 / modulePx : 0;
  // The circular shape fills the area around the symbol with decorative
  // modules, leaving only a one-module ring of clear space.
  if (shape === "circle") quietZone = Math.min(1, quietZone);
  return { size, count, marginPx, modulePx, symbolPx, quietZone };
}
