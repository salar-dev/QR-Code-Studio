import { describe, expect, it } from "vitest";
import { encodeContent } from "@/lib/qr/content/encoders";
import { DEFAULT_CONTENT } from "@/lib/qr/content/defaults";
import type { ContentState } from "@/lib/qr/content/types";
import type { ErrorCorrectionLevel } from "@/lib/qr/design/types";
import { computeLayout, createMatrix, QrCapacityError, toQrByteString, type QrMatrix } from "@/lib/qr/render/matrix";
import { decodeLuminance } from "@/lib/qr/validation/decode";

/** Rasterizes a module matrix to an 8-bit luminance buffer. */
function rasterize(matrix: QrMatrix, scale = 4, quiet = 4, invert = false) {
  const size = (matrix.count + quiet * 2) * scale;
  const light = invert ? 0 : 255;
  const dark = invert ? 255 : 0;
  const buffer = new Uint8ClampedArray(size * size).fill(light);
  for (let r = 0; r < matrix.count; r++) {
    for (let c = 0; c < matrix.count; c++) {
      if (!matrix.isDark(r, c)) continue;
      for (let y = 0; y < scale; y++) {
        const row = (r + quiet) * scale + y;
        buffer.fill(dark, row * size + (c + quiet) * scale, row * size + (c + quiet + 1) * scale);
      }
    }
  }
  return { buffer, size };
}

function roundTrip(payload: string, level: ErrorCorrectionLevel = "M", invert = false) {
  const matrix = createMatrix(toQrByteString(payload), level);
  const { buffer, size } = rasterize(matrix, 4, 4, invert);
  return decodeLuminance(buffer, size, size);
}

const content = (patch: Partial<ContentState>): ContentState => ({ ...DEFAULT_CONTENT, ...patch });

describe("UTF-8 byte strings", () => {
  it("leaves ASCII untouched and expands non-ASCII to UTF-8 bytes", () => {
    expect(toQrByteString("hello")).toBe("hello");
    expect(toQrByteString("é")).toBe("Ã©");
    expect([...toQrByteString("😀")].map((c) => c.charCodeAt(0))).toEqual([0xf0, 0x9f, 0x98, 0x80]);
  });
});

describe("QR decode round trips", () => {
  const samples: Array<[string, ContentState]> = [
    ["url", content({ type: "url", url: { url: "example.com/path?x=1&y=two" } })],
    ["text (Arabic + emoji)", content({ type: "text", text: { text: "مرحبا بالعالم 👋 — QR ✓" } })],
    ["text (CJK)", content({ type: "text", text: { text: "二维码测试 / テスト" } })],
    ["email", content({ type: "email", email: { to: "hello@example.com", subject: "Hi", body: "A\nB" } })],
    ["phone", content({ type: "phone", phone: { phone: "+1 555 123 4567" } })],
    ["sms", content({ type: "sms", sms: { phone: "+15551234567", message: "Hi: there", format: "smsto" } })],
    ["whatsapp", content({ type: "whatsapp", whatsapp: { phone: "+971501234567", message: "مرحبا" } })],
    ["wifi", content({ type: "wifi", wifi: { ssid: "Café;Net", password: "s3cret:pass", encryption: "WPA", hidden: true } })],
    [
      "vcard",
      content({
        type: "vcard",
        vcard: { ...DEFAULT_CONTENT.vcard, firstName: "سارة", lastName: "Doe", organization: "Acme, Inc.", phone: "+15550109999", email: "s@acme.com" },
      }),
    ],
    ["location", content({ type: "location", location: { latitude: "25.1972", longitude: "55.27437", name: "Burj", format: "geo" } })],
    [
      "event",
      content({
        type: "event",
        event: { title: "Launch", start: "2026-10-11T10:00", end: "2026-10-11T11:00", allDay: false, location: "HQ", description: "" },
      }),
    ],
    ["social", content({ type: "social", social: { platform: "instagram", handle: "@nasa" } })],
  ];

  for (const [name, state] of samples) {
    it(`decodes ${name} exactly`, () => {
      const result = encodeContent(state);
      expect(result.status).toBe("ok");
      if (result.status !== "ok") return;
      const decoded = roundTrip(result.payload, "Q");
      expect(decoded).not.toBeNull();
      expect(decoded?.text).toBe(result.payload);
      expect(decoded?.inverted).toBe(false);
    });
  }

  it("decodes at every error correction level", () => {
    for (const level of ["L", "M", "Q", "H"] as const) {
      expect(roundTrip("https://example.com/", level)?.text).toBe("https://example.com/");
    }
  });

  it("decodes light-on-dark (inverted) codes via the inverted retry", () => {
    const decoded = roundTrip("INVERTED 123", "M", true);
    expect(decoded).toEqual({ text: "INVERTED 123", inverted: true });
  });

  it("returns null for images without a code", () => {
    const blank = new Uint8ClampedArray(200 * 200).fill(255);
    expect(decodeLuminance(blank, 200, 200)).toBeNull();
  });
});

describe("capacity and layout", () => {
  it("throws a capacity error for content beyond version 40", () => {
    expect(() => createMatrix("x".repeat(3000), "L")).toThrow(QrCapacityError);
    expect(() => createMatrix("x".repeat(2000), "L")).not.toThrow();
  });

  it("computes exact quiet zones and integer module sizes", () => {
    const layout = computeLayout(25, 1024, 4, "square");
    expect(layout.modulePx).toBe(Math.floor((1024 - layout.marginPx * 2) / 25));
    expect(layout.quietZone).toBeGreaterThanOrEqual(4);
    expect(layout.symbolPx).toBe(layout.modulePx * 25);
    expect(computeLayout(25, 1024, 0, "square").marginPx).toBe(0);
    expect(computeLayout(25, 1024, 4, "circle").quietZone).toBe(1);
  });
});
