import { describe, expect, it } from "vitest";
import { matchLocale } from "@/i18n/config";
import { coerceContent, coerceDesign, coerceExport } from "@/lib/persistence/coerce";
import { stripSensitiveContent, DEFAULT_CONTENT } from "@/lib/qr/content/defaults";
import { DEFAULT_DESIGN, linearFill, solidBackground, solidFill, transparentBackground } from "@/lib/qr/design/defaults";
import { cssFill, changeFillMode } from "@/lib/qr/design/color-utils";
import type { QRDesign } from "@/lib/qr/design/types";
import { buildFileName, sanitizeFileName } from "@/lib/qr/export/filename";
import { DEFAULT_EXPORT } from "@/lib/qr/export/types";
import { computeLayout } from "@/lib/qr/render/matrix";
import { analyzeDesign, isInverted, worstContrast } from "@/lib/qr/validation/analyze";
import { contrastRatio, normalizeHex } from "@/lib/qr/validation/color";

describe("file names", () => {
  it("sanitizes unsafe characters and keeps Unicode", () => {
    expect(sanitizeFileName("My QR: v2/final?")).toBe("My-QR-v2-final");
    expect(sanitizeFileName("رمز المتجر")).toBe("رمز-المتجر");
    expect(sanitizeFileName("../../etc/passwd")).toBe("etc-passwd");
    expect(sanitizeFileName("   ")).toBe("qr-code");
    expect(sanitizeFileName("CON")).toBe("qr-code");
    expect(sanitizeFileName("logo.png")).toBe("logo");
  });

  it("appends the right extension per format", () => {
    expect(buildFileName("menu", "jpeg")).toBe("menu.jpg");
    expect(buildFileName("menu", "svg")).toBe("menu.svg");
    expect(buildFileName("", "pdf")).toBe("qr-code.pdf");
  });
});

describe("colors and contrast", () => {
  it("normalizes hex colors", () => {
    expect(normalizeHex("ABC")).toBe("#aabbcc");
    expect(normalizeHex("#123456")).toBe("#123456");
    expect(normalizeHex("red")).toBeNull();
  });

  it("computes WCAG contrast ratios", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("uses the worst gradient stop and the scan backdrop for transparent codes", () => {
    const design: QRDesign = { ...DEFAULT_DESIGN, dots: { style: "square", fill: linearFill("#000000", "#eeeeee") } };
    expect(worstContrast(design, "#ffffff")).toBeLessThan(1.2);
    const white: QRDesign = { ...DEFAULT_DESIGN, dots: { style: "square", fill: solidFill("#ffffff") }, background: transparentBackground() };
    expect(worstContrast(white, "#000000")).toBeCloseTo(21, 5);
    expect(isInverted(white, "#000000")).toBe(true);
    expect(isInverted(DEFAULT_DESIGN, "#ffffff")).toBe(false);
  });

  it("maps fills to CSS previews and seeds visible gradients", () => {
    expect(cssFill(solidFill("#123456"))).toBe("#123456");
    expect(cssFill(linearFill("#000000", "#ffffff", 0))).toBe("linear-gradient(90deg, #000000 0%, #ffffff 100%)");
    const gradient = changeFillMode(solidFill("#2563eb"), "linear");
    expect(gradient.stops[0].color).toBe("#2563eb");
    expect(gradient.stops[1].color).not.toBe("#2563eb");
  });
});

describe("scannability analysis", () => {
  const layout = computeLayout(25, 1024, 4, "square");
  const analyze = (design: QRDesign, extra: Partial<Parameters<typeof analyzeDesign>[0]> = {}) =>
    analyzeDesign({ design, layout, version: 2, scanBackground: "#ffffff", rasterExport: true, ...extra }).map((i) => i.code);

  it("reports nothing for the classic default", () => {
    expect(analyze(DEFAULT_DESIGN)).toEqual([]);
  });

  it("flags low contrast", () => {
    const design: QRDesign = { ...DEFAULT_DESIGN, dots: { style: "square", fill: solidFill("#999999") } };
    expect(analyze(design)).toContain("contrastLow");
    const veryLow: QRDesign = { ...DEFAULT_DESIGN, dots: { style: "square", fill: solidFill("#eeeeee") } };
    expect(analyze(veryLow)).toContain("contrastVeryLow");
  });

  it("does not block a white code on a transparent background", () => {
    const design: QRDesign = { ...DEFAULT_DESIGN, dots: { style: "square", fill: solidFill("#ffffff") }, background: transparentBackground() };
    const codes = analyze(design, { scanBackground: "#111114" });
    expect(codes).toEqual(expect.arrayContaining(["inverted", "transparentBackdrop"]));
    expect(codes).not.toContain("contrastLow");
    expect(codes).not.toContain("contrastVeryLow");
  });

  it("flags small quiet zones, logos with low error correction and decorative finders", () => {
    expect(analyze(DEFAULT_DESIGN, { layout: computeLayout(25, 1024, 1, "square") })).toContain("quietZoneTooSmall");
    const logo: QRDesign = { ...DEFAULT_DESIGN, logo: { ...DEFAULT_DESIGN.logo, src: "data:image/png;base64,AA==", size: 0.55 } };
    expect(analyze(logo)).toEqual(expect.arrayContaining(["logoLarge", "logoLowErrorCorrection"]));
    const fancy: QRDesign = { ...DEFAULT_DESIGN, cornerSquares: { ...DEFAULT_DESIGN.cornerSquares, style: "dots" } };
    expect(analyze(fancy)).toContain("decorativeFinder");
    expect(analyze({ ...DEFAULT_DESIGN, shape: "circle" })).toContain("circleShape");
  });

  it("flags dense codes and tiny raster modules", () => {
    expect(analyze(DEFAULT_DESIGN, { version: 30 })).toContain("highDensity");
    const tiny = computeLayout(177, 256, 4, "square");
    expect(analyze(DEFAULT_DESIGN, { layout: tiny })).toContain("smallModules");
    expect(analyze(DEFAULT_DESIGN, { layout: tiny, rasterExport: false })).not.toContain("smallModules");
  });
});

describe("persisted data coercion", () => {
  it("rebuilds valid designs from corrupted data", () => {
    const design = coerceDesign({
      dots: { style: "hexagon", fill: { mode: "solid", color: "javascript:alert(1)" } },
      margin: 999,
      errorCorrection: "Z",
      background: { mode: "transparent", radius: 5 },
      logo: { src: "https://evil.example/x.png", size: 9 },
    });
    expect(design.dots.style).toBe(DEFAULT_DESIGN.dots.style);
    expect(design.dots.fill.color).toBe(DEFAULT_DESIGN.dots.fill.color);
    expect(design.margin).toBe(10);
    expect(design.errorCorrection).toBe(DEFAULT_DESIGN.errorCorrection);
    expect(design.background.mode).toBe("transparent");
    expect(design.background.radius).toBe(1);
    expect(design.logo.src).toBeNull();
    expect(design.logo.size).toBe(0.6);
  });

  it("round-trips valid data unchanged", () => {
    const design: QRDesign = { ...DEFAULT_DESIGN, background: solidBackground("#fafafa", 0.2), dots: { style: "dots", fill: linearFill("#111111", "#222222", 30) } };
    expect(coerceDesign(JSON.parse(JSON.stringify(design)))).toEqual(design);
    expect(coerceExport(DEFAULT_EXPORT)).toEqual(DEFAULT_EXPORT);
    expect(coerceContent(DEFAULT_CONTENT)).toEqual(DEFAULT_CONTENT);
  });

  it("clamps export settings and rejects unknown enum values", () => {
    const settings = coerceExport({ format: "gif", size: 99999, quality: 7, pdfPage: "tabloid" });
    expect(settings.format).toBe("png");
    expect(settings.size).toBe(4096);
    expect(settings.quality).toBe(1);
    expect(settings.pdfPage).toBe("fit");
    expect(coerceContent({ type: "nope", wifi: { encryption: "WPA9", password: 12 } }).wifi).toEqual(DEFAULT_CONTENT.wifi);
  });

  it("strips Wi-Fi passwords and contact details", () => {
    const content = {
      ...DEFAULT_CONTENT,
      wifi: { ...DEFAULT_CONTENT.wifi, ssid: "Home", password: "secret123" },
      vcard: { ...DEFAULT_CONTENT.vcard, firstName: "Jane", phone: "+1555" },
      url: { url: "example.com" },
    };
    const stripped = stripSensitiveContent(content);
    expect(stripped.wifi).toEqual({ ...content.wifi, password: "" });
    expect(stripped.vcard.firstName).toBe("");
    expect(stripped.vcard.phone).toBe("");
    expect(stripped.url.url).toBe("example.com");
    expect(content.wifi.password).toBe("secret123"); // original untouched
  });
});

describe("locale negotiation", () => {
  it("picks the best supported language", () => {
    expect(matchLocale("ar-SA,ar;q=0.9,en;q=0.8")).toBe("ar");
    expect(matchLocale("fr-FR,fr;q=0.9,en;q=0.5")).toBe("en");
    expect(matchLocale("de-DE")).toBe("en");
    expect(matchLocale("en;q=0.2,ar;q=0.9")).toBe("ar");
    expect(matchLocale(null)).toBe("en");
  });
});
