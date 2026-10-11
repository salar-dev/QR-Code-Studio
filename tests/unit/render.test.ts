// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import QRCodeStyling from "qr-code-styling";
import { DEFAULT_DESIGN, linearFill, solidFill, transparentBackground } from "@/lib/qr/design/defaults";
import { DESIGN_PRESETS } from "@/lib/qr/design/presets";
import type { QRDesign } from "@/lib/qr/design/types";
import { createMatrix, toQrByteString } from "@/lib/qr/render/matrix";
import { buildStylingOptions, toStylingBackground } from "@/lib/qr/render/options";
import { renderQrSvg } from "@/lib/qr/render/renderer";

const parse = (svg: string) => new DOMParser().parseFromString(svg, "image/svg+xml");

describe("module count parity with qr-code-styling", () => {
  const payloads = ["1234567890", "HELLO WORLD", "https://example.com/a?b=c", "مرحبا بالعالم", "x".repeat(900), "😀".repeat(60)];
  for (const payload of payloads) {
    for (const level of ["L", "H"] as const) {
      it(`matches for ${payload.slice(0, 16)}… at ${level}`, () => {
        const data = toQrByteString(payload);
        const ours = createMatrix(data, level);
        const qr = new QRCodeStyling({ type: "svg", data, qrOptions: { errorCorrectionLevel: level } });
        expect(qr._qr?.getModuleCount()).toBe(ours.count);
        for (let r = 0; r < ours.count; r += 3) {
          for (let c = 0; c < ours.count; c += 3) expect(qr._qr?.isDark(r, c)).toBe(ours.isDark(r, c));
        }
      });
    }
  }
});

describe("styling options", () => {
  it("omits the background entirely when transparent", () => {
    expect(toStylingBackground(transparentBackground())).toEqual({ color: "", gradient: undefined, round: 0 });
  });

  it("lets corners inherit the dots gradient when matching the main color", () => {
    const layout = { size: 512, count: 25, marginPx: 61, modulePx: 15, symbolPx: 375, quietZone: 4.5 };
    const design: QRDesign = { ...DEFAULT_DESIGN, dots: { style: "rounded", fill: linearFill("#ff0000", "#0000ff", 90) } };
    const options = buildStylingOptions({ data: "x", design, layout });
    expect(options.dotsOptions?.gradient?.rotation).toBeCloseTo(Math.PI / 2);
    expect(options.cornersSquareOptions).toEqual({ type: "square" });
    expect(options.cornersDotOptions).toEqual({ type: "square" });
  });
});

describe("SVG rendering", () => {
  it("renders the exact requested size with a viewBox", async () => {
    const { svg, layout } = await renderQrSvg({ payload: "https://example.com/", design: DEFAULT_DESIGN, size: 1024 });
    const root = parse(svg).documentElement;
    expect(root.getAttribute("width")).toBe("1024");
    expect(root.getAttribute("viewBox")).toBe("0 0 1024 1024");
    expect(layout.quietZone).toBeGreaterThanOrEqual(4);
  });

  it("produces a real transparent background: no background fill at all", async () => {
    const design: QRDesign = {
      ...DEFAULT_DESIGN,
      dots: { style: "square", fill: solidFill("#ffffff") },
      background: transparentBackground(),
    };
    const { svg } = await renderQrSvg({ payload: "white on transparent", design, size: 512 });
    const doc = parse(svg);
    expect(doc.querySelector("[id^='clip-path-background-color']")).toBeNull();
    const fills = [...doc.querySelectorAll("rect[fill]")].map((r) => r.getAttribute("fill"));
    expect(fills.length).toBeGreaterThan(0);
    expect(fills.every((fill) => fill === "#ffffff")).toBe(true);
  });

  it("emits vector gradients and independent corner colors", async () => {
    const design: QRDesign = {
      ...DEFAULT_DESIGN,
      dots: { style: "dots", fill: linearFill("#9333ea", "#4f46e5", 135) },
      cornerSquares: { style: "extra-rounded", useMainColor: false, fill: solidFill("#0c4a6e") },
      cornerDots: { style: "dot", useMainColor: false, fill: solidFill("#ff0000") },
    };
    const { svg } = await renderQrSvg({ payload: "gradient", design, size: 512, title: "My <QR> & co" });
    const doc = parse(svg);
    expect(doc.querySelectorAll("linearGradient stop")).toHaveLength(2);
    const fills = [...doc.querySelectorAll("rect[fill]")].map((r) => r.getAttribute("fill"));
    expect(fills).toContain("#0c4a6e");
    expect(fills).toContain("#ff0000");
    expect(doc.querySelector("title")?.textContent).toBe("My <QR> & co");
    expect(svg).not.toContain("<image");
  });

  it("renders every preset", async () => {
    for (const preset of DESIGN_PRESETS) {
      const { svg } = await renderQrSvg({ payload: "preset", design: { ...DEFAULT_DESIGN, ...preset.design }, size: 256 });
      expect(parse(svg).querySelector("parsererror")).toBeNull();
    }
  });
});
