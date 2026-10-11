import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  QRCodeReader,
  RGBLuminanceSource,
} from "@zxing/library";

export interface DecodeOutcome {
  text: string;
  /** True when the code only decoded after inverting light and dark. */
  inverted: boolean;
}

/** Converts opaque RGBA pixels to 8-bit luminance (ITU-R BT.601 weights). */
export function rgbaToLuminance(rgba: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; i < out.length; i += 1, p += 4) {
    out[i] = (rgba[p] * 306 + rgba[p + 1] * 601 + rgba[p + 2] * 117) >> 10;
  }
  return out;
}

const HINTS = new Map<DecodeHintType, unknown>([
  [DecodeHintType.TRY_HARDER, true],
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]],
]);

/**
 * Decodes a QR code from a luminance buffer with ZXing. Light-on-dark codes
 * are retried with inverted luminance, as modern phone scanners do.
 */
export function decodeLuminance(luminance: Uint8ClampedArray, width: number, height: number): DecodeOutcome | null {
  const reader = new QRCodeReader();
  const source = new RGBLuminanceSource(luminance, width, height);
  const attempts: Array<[typeof source | ReturnType<typeof source.invert>, boolean]> = [
    [source, false],
    [source.invert(), true],
  ];
  for (const [candidate, inverted] of attempts) {
    try {
      const result = reader.decode(new BinaryBitmap(new HybridBinarizer(candidate)), HINTS);
      return { text: result.getText(), inverted };
    } catch {
      reader.reset();
    }
  }
  return null;
}
